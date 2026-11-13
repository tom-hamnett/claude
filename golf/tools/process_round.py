#!/usr/bin/env python3
"""Turn Apple Watch voice recordings + a workout GPS track into a golf round report.

Usage:
  python3 process_round.py --audio DIR --gpx FILE_OR_HEALTH_EXPORT_ZIP [--course quinta-da-marinha]
                           [--tee 55] [--hcp 18] [--units y|m] [--tz-offset 0] [--out DIR]
  python3 process_round.py --transcripts memos.json --gpx route.gpx ...   (skip transcription)

memos.json is a list of {"time": ISO-8601 UTC, "text": "..."}.

How it works: each recording's start time is matched to the GPS track, which gives
where you stood when you said the club. Shot distance = gap to the next shot's spot.
Transcription uses faster-whisper locally (no paid API), loaded only when needed.
"""
import argparse, csv, datetime as dt, glob, io, json, math, os, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
COURSES = json.load(open(os.path.join(HERE, '..', 'courses.json')))
AUDIO_EXT = ('.m4a', '.mp3', '.wav', '.aac', '.caf', '.mp4', '.m4v', '.ogg', '.opus')
UTC = dt.timezone.utc

# ---------------------------------------------------------------- time + gps
def parse_time(s):
    s = s.strip().replace('Z', '+00:00')
    t = dt.datetime.fromisoformat(s)
    return t if t.tzinfo else t.replace(tzinfo=UTC)

def load_gpx(path):
    """Accepts a .gpx file, a folder of them, or Apple Health export.zip (workout-routes/*.gpx)."""
    blobs = []
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            blobs = [z.read(n) for n in z.namelist() if n.lower().endswith('.gpx')]
    elif os.path.isdir(path):
        blobs = [open(p, 'rb').read() for p in glob.glob(os.path.join(path, '**', '*.gpx'), recursive=True)]
    else:
        blobs = [open(path, 'rb').read()]
    pts = []
    for b in blobs:
        root = ET.parse(io.BytesIO(b)).getroot()
        for el in root.iter():
            if el.tag.endswith('trkpt'):
                tt = next((c.text for c in el if c.tag.endswith('time')), None)
                if tt:
                    pts.append((parse_time(tt), float(el.get('lat')), float(el.get('lon'))))
    pts.sort()
    if not pts:
        sys.exit('No GPS points found in ' + path)
    return pts

def position_at(pts, t, max_gap_s=120):
    """Linear interpolation along the track; None if t is far outside it."""
    import bisect
    times = [p[0] for p in pts]
    i = bisect.bisect_left(times, t)
    if i == 0:
        return pts[0][1:] if (pts[0][0] - t).total_seconds() < max_gap_s else None
    if i >= len(pts):
        return pts[-1][1:] if (t - pts[-1][0]).total_seconds() < max_gap_s else None
    a, b = pts[i - 1], pts[i]
    span = (b[0] - a[0]).total_seconds() or 1
    f = (t - a[0]).total_seconds() / span
    return (a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f)

def hav(a, b):
    r = 6371000; la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))

# ---------------------------------------------------------------- audio
def recording_time(path, tz_offset_h):
    """Best effort start time: QuickTime creationdate tag, then creation_time, then filename, then mtime."""
    try:
        out = subprocess.run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', path],
                             capture_output=True, text=True, timeout=30).stdout
        tags = {k.lower(): v for k, v in json.loads(out or '{}').get('format', {}).get('tags', {}).items()}
        for k in ('com.apple.quicktime.creationdate', 'creation_time', 'date'):
            if k in tags:
                return parse_time(tags[k]), k
    except Exception:
        pass
    m = re.search(r'(20\d\d)[-_]?(\d\d)[-_]?(\d\d)[ T_-]?(\d\d)[.:_-]?(\d\d)[.:_-]?(\d\d)', os.path.basename(path))
    if m:
        local = dt.datetime(*map(int, m.groups()))
        return (local - dt.timedelta(hours=tz_offset_h)).replace(tzinfo=UTC), 'filename'
    return dt.datetime.fromtimestamp(os.path.getmtime(path), UTC), 'file-mtime (least reliable)'

PROMPT = ('Golf shot notes: driver, 3 wood, 5 wood, hybrid, 4 iron, 5 iron, 6 iron, 7 iron, 8 iron, 9 iron, '
          'pitching wedge, gap wedge, sand wedge, lob wedge, putter. Pured, flushed, thin, fat, topped, shank, '
          'left, right, straight, short, long, fairway, rough, bunker, green, penalty. Hole 3, score 5, 2 putts.')

def transcribe(paths):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit('Install transcription first:  pip install faster-whisper')
    model = WhisperModel(os.environ.get('WHISPER_MODEL', 'small.en'), device='cpu', compute_type='int8')
    out = []
    for p in paths:
        segs, _ = model.transcribe(p, language='en', initial_prompt=PROMPT, vad_filter=True)
        out.append(' '.join(s.text.strip() for s in segs).strip())
    return out

# ---------------------------------------------------------------- parsing (mirrors the web app)
NUMW = {'one': 1, 'won': 1, 'two': 2, 'to': 2, 'too': 2, 'three': 3, 'four': 4, 'for': 4, 'five': 5, 'six': 6,
        'seven': 7, 'eight': 8, 'ate': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
        'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18}

def norm(t):
    t = ' ' + re.sub(r'[^a-z0-9° ]', ' ', t.lower().replace("'", '').replace('’', '')) + ' '
    t = re.sub(r'\s+', ' ', t)
    for k, v in NUMW.items():
        t = re.sub(r' %s(?= )' % k, ' %d' % v, t)
    return re.sub(r' (\d)(i|w|h) ', r' \1 \2 ', t)

def s(rx, t): return re.search(rx, t)

def parse_club(t):
    if s(r' (driver|drive|diver) ', t): return 'Dr'
    if m := s(r' (\d{1,2}) (wood|woods|would|w) ', t): return m[1] + 'W'
    if m := s(r' (\d) (hybrid|rescue|h|highbred) ', t): return m[1] + 'H'
    if s(r' (hybrid|rescue|highbred) ', t): return 'Hy'
    if m := s(r' ([2-9]) (iron|irons|i|eye|irene|ion) ', t): return m[1] + 'i'
    if s(r' (pitching|pitchin|pw|pitch wedge) ', t): return 'PW'
    if s(r' (gap|approach wedge|gw|aw) ', t): return 'GW'
    if s(r' (sand wedge|sandwich|sandwedge|sw) ', t): return 'SW'
    if s(r' (lob|lob wedge|lw) ', t): return 'LW'
    if m := s(r' (4[6-9]|5\d|6[0-4]) (degree|degrees|°|wedge) ', t): return m[1] + '°'
    if s(r' (putter|putt|putting) ', t): return 'Putter'
    return None

RATING = [(5, r' (pured|pure|flushed|flush|perfect|great|smashed|nailed|striped|piped|excellent|brilliant|cracked) '),
          (1, r' (mishit|miss hit|mis hit|shank|shanked|duff|duffed|terrible|awful|horrible|whiff|air shot|rubbish|disaster) '),
          (2, r' (poor|thin|fat|topped|heavy|bad|weak|chunk|chunked|skulled|toed|heeled|scuffed) '),
          (4, r' (good|solid|nice|decent|sweet) '), (3, r' (ok|okay|average|fine|alright|all right) ')]

def parse_fb(t):
    fb = {}
    for v, rx in RATING:
        if s(rx, t): fb['rating'] = v; break
    if s(r' (left|pull|pulled|hook|hooked) ', t): fb['dir'] = 'Left'
    elif s(r' (right|push|pushed|slice|sliced|fade|faded) ', t): fb['dir'] = 'Right'
    elif s(r' (straight|centre|center|middle|online|on line) ', t): fb['dir'] = 'Straight'
    if s(r' (fairway|short grass) ', t): fb['res'] = 'Fairway'
    elif s(r' (green|on the dance floor) ', t): fb['res'] = 'Green'
    elif s(r' (rough|semi) ', t): fb['res'] = 'Rough'
    elif s(r' (bunker|sand|trap|beach) ', t): fb['res'] = 'Sand'
    elif s(r' (water|ob|out of bounds|trees|lost|hazard|trouble|bushes) ', t): fb['res'] = 'Trouble'
    if s(r' short ', t): fb['len'] = 'Short'
    elif s(r' (long|over) ', t): fb['len'] = 'Long'
    if s(r' (penalty|drop|dropped|reload|out of bounds|ob|lost ball) ', t): fb['penalty'] = True
    return fb

def parse_hole_end(t, par):
    """'hole 3 score 5 2 putts' / 'bogey two putts' / 'score 4'. Returns dict or None."""
    if not s(r' (score|scored|hole|holed|bogey|bogie|par|birdie|double|triple|eagle|made a|got a) ', t):
        return None
    out = {}
    if m := s(r' hole (\d{1,2}) ', t): out['hole'] = int(m[1]); t = t.replace(m[0], ' ', 1)
    if m := s(r' (\d{1,2}) (putt|putts|put|puts|putted) ', t): out['putts'] = int(m[1]); t = t.replace(m[0], ' ', 1)
    elif s(r' (one putt|single putt) ', t): out['putts'] = 1
    if m := s(r' (score|scored|made a|got a|had a) (\d{1,2}) ', t): out['score'] = int(m[2])
    else:
        for rx, d in [(r' albatross ', -3), (r' eagle ', -2), (r' (birdie|birdy) ', -1), (r' triple ', 3),
                      (r' double ', 2), (r' (bogey|bogie|bogy) ', 1), (r' par ', 0)]:
            if s(rx, t): out['score'] = par + d; break
    if 'score' not in out and (m := s(r' (\d{1,2}) ', t)) and 'hole' in out:
        out['score'] = int(m[1])
    return out if ('score' in out or 'hole' in out and 'putts' in out) else None

# ---------------------------------------------------------------- round builder
def build(memos, pts, course, tee, hcp):
    C = COURSES.get(course) if course else None
    ti = C['tees'].index(tee) if C and tee in C['tees'] else 0
    holes = [{'n': i + 1, 'par': (C['holes'][i][2] if C else 4), 'si': (C['holes'][i][3] if C else None),
              'name': (C['holes'][i][0] if C else None), 'len_m': (C['holes'][i][1][ti] if C else None),
              'shots': [], 'penalties': 0, 'score': None, 'putts': None, 'notes': []} for i in range(18)]
    cur = 0; unparsed = []
    for m in memos:
        t = norm(m['text']); pos = position_at(pts, m['time'])
        h = holes[min(cur, 17)]
        end = parse_hole_end(t, h['par'])
        club = parse_club(t)
        fb = parse_fb(re.sub(r' (sand wedge|sandwich|sandwedge) ', ' ', t))
        if end and ('score' in end or not club):
            if 'hole' in end and 1 <= end['hole'] <= 18:
                cur = end['hole'] - 1; h = holes[cur]
            h['score'] = end.get('score', h['score']); h['putts'] = end.get('putts', h['putts'])
            h['end_pos'] = pos; h['notes'].append(m['text'])
            cur += 1
            continue
        if club:
            shot = {'club': club, 'time': m['time'].isoformat(), 'pos': pos, 'text': m['text'],
                    'rating': fb.get('rating'), 'dir': fb.get('dir'), 'res': fb.get('res'), 'len': fb.get('len'), 'dist_m': None}
            h['shots'].append(shot)
            if fb.get('penalty'): h['penalties'] += 1
        elif fb:
            last = next((x for x in reversed(h['shots']) if x['club'] != 'Putter'), None)
            if last:
                for k in ('rating', 'dir', 'res', 'len'):
                    if fb.get(k): last[k] = fb[k]
                last['text'] += ' | ' + m['text']
            if fb.get('penalty'): h['penalties'] += 1
            if not last and not fb.get('penalty'): unparsed.append(m)
        else:
            unparsed.append(m)
    # distances
    for h in holes:
        seq = h['shots']
        for i, sh in enumerate(seq):
            if sh['club'] == 'Putter' or not sh['pos']: continue
            nxt = seq[i + 1]['pos'] if i + 1 < len(seq) else h.get('end_pos')
            if nxt: sh['dist_m'] = round(hav(sh['pos'], nxt))
            if i + 1 < len(seq) and seq[i + 1]['club'] == 'Putter' and not sh['res']: sh['res'] = 'Green'
        if h['putts'] is None and any(x['club'] == 'Putter' for x in seq):
            h['putts'] = sum(1 for x in seq if x['club'] == 'Putter')
        if h['score'] is None and seq:
            h['score_estimated'] = len(seq) + h['penalties']
    return {'course': C['name'] if C else 'Round', 'tee': tee, 'hcp': hcp, 'holes': holes, 'unparsed': unparsed}

# ---------------------------------------------------------------- report
def report(r, units):
    k = 1.09361 if units == 'y' else 1.0; u = 'y' if units == 'y' else 'm'
    fmt = lambda m: '–' if m is None else f'{round(m * k)}{u}'
    played = [h for h in r['holes'] if h['score'] is not None or h['shots']]
    def sc(h): return h['score'] if h['score'] is not None else h.get('score_estimated')
    tot = sum(sc(h) or 0 for h in played); par = sum(h['par'] for h in played)
    L = [f"# {r['course']} — round report", '',
         f"**{tot}** ({'+' if tot - par > 0 else ''}{tot - par} over {len(played)} holes)" + (f" · tee {r['tee']}" if r['tee'] else '')]
    if r['hcp'] is not None:
        net = pts = 0
        for h in played:
            st = r['hcp'] // 18 + (1 if h['si'] and h['si'] <= r['hcp'] % 18 else 0)
            net += (sc(h) or 0) - st; pts += max(0, 2 + h['par'] + st - (sc(h) or 0))
        L.append(f"Net {net} · {pts} Stableford points (handicap {r['hcp']})")
    L += ['', '## Scorecard', '', '| Hole | Name | Par | SI | Length | Score | Putts | Pen |', '|---|---|---|---|---|---|---|---|']
    for h in r['holes']:
        s_ = h['score'] if h['score'] is not None else (f"{h['score_estimated']}?" if h.get('score_estimated') else '–')
        L.append(f"| {h['n']} | {h['name'] or ''} | {h['par']} | {h['si'] or ''} | {fmt(h['len_m'])} | {s_} | {h['putts'] if h['putts'] is not None else '–'} | {h['penalties'] or ''} |")
    clubs = {}
    for h in r['holes']:
        for x in h['shots']:
            if x['club'] == 'Putter': continue
            c = clubs.setdefault(x['club'], {'n': 0, 'd': [], 'r': [], 'L': 0, 'S': 0, 'R': 0})
            c['n'] += 1
            if x['dist_m'] and x['dist_m'] > 3: c['d'].append(x['dist_m'])
            if x['rating']: c['r'].append(x['rating'])
            if x['dir']: c[x['dir'][0]] += 1
    L += ['', '## Clubs', '', '| Club | Shots | Avg | Longest | Strike (1–5) | L / S / R |', '|---|---|---|---|---|---|']
    order = ['Dr', '3W', '5W', '7W', 'Hy', '3H', '4H', '5H', '4i', '5i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW', 'LW']
    for name in sorted(clubs, key=lambda c: order.index(c) if c in order else 99):
        c = clubs[name]; avg = sum(c['d']) / len(c['d']) if c['d'] else None
        strike = f"{sum(c['r']) / len(c['r']):.1f}" if c['r'] else '–'
        longest = fmt(max(c['d'])) if c['d'] else '–'
        L.append(f"| {name} | {c['n']} | {fmt(avg)} | {longest} | {strike} | {c['L']} / {c['S']} / {c['R']} |")
    L += ['', '## Every shot', '']
    for h in r['holes']:
        if not h['shots']: continue
        L.append(f"**Hole {h['n']}** {h['name'] or ''} (par {h['par']})")
        for i, x in enumerate(h['shots'], 1):
            extra = ', '.join(v for v in [x['dir'], x['len'], x['res']] if v)
            L.append(f"{i}. {x['club']} — {fmt(x['dist_m']) if x['club'] != 'Putter' else ''} "
                     f"{'★' * (x['rating'] or 0)} {extra}  _“{x['text']}”_")
        L.append('')
    if r['unparsed']:
        L += ['## Recordings I could not place', ''] + [f"- {m['time'].isoformat()} “{m['text']}”" for m in r['unparsed']]
    return '\n'.join(L)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio'); ap.add_argument('--transcripts'); ap.add_argument('--gpx', required=True)
    ap.add_argument('--course', default='quinta-da-marinha'); ap.add_argument('--tee', default='55')
    ap.add_argument('--hcp', type=int); ap.add_argument('--units', default='y', choices=['y', 'm'])
    ap.add_argument('--tz-offset', type=float, default=0, help='hours ahead of UTC, only used for filename times')
    ap.add_argument('--out', default='round_out')
    a = ap.parse_args()
    if a.transcripts:
        memos = [{'time': parse_time(m['time']), 'text': m['text']} for m in json.load(open(a.transcripts))]
    elif a.audio:
        files = sorted(p for p in glob.glob(os.path.join(a.audio, '**', '*'), recursive=True) if p.lower().endswith(AUDIO_EXT))
        timed = [(recording_time(p, a.tz_offset), p) for p in files]
        texts = transcribe([p for _, p in timed])
        memos = [{'time': t, 'text': x, 'file': os.path.basename(p), 'time_source': src} for ((t, src), p), x in zip(timed, texts)]
    else:
        sys.exit('Give --audio DIR or --transcripts FILE')
    memos.sort(key=lambda m: m['time'])
    pts = load_gpx(a.gpx)
    print(f'{len(memos)} recordings, {len(pts)} GPS points ({pts[0][0]:%H:%M}–{pts[-1][0]:%H:%M} UTC)')
    r = build(memos, pts, a.course, a.tee, a.hcp)
    os.makedirs(a.out, exist_ok=True)
    md = report(r, a.units)
    open(os.path.join(a.out, 'report.md'), 'w').write(md)
    json.dump(r, open(os.path.join(a.out, 'round.json'), 'w'), default=str, indent=1)
    with open(os.path.join(a.out, 'shots.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['hole', 'par', 'shot', 'club', 'distance_m', 'strike', 'direction', 'length', 'result', 'lat', 'lon', 'time', 'said'])
        for h in r['holes']:
            for i, x in enumerate(h['shots'], 1):
                w.writerow([h['n'], h['par'], i, x['club'], x['dist_m'], x['rating'], x['dir'], x['len'], x['res'],
                            *(x['pos'] or ('', '')), x['time'], x['text']])
    print(md)

if __name__ == '__main__':
    main()

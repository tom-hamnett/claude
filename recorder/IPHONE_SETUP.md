# iPhone setup (about 10 minutes)

## 1. One-tap recording
- **Watch:** long-press the watch face → Edit → Complications → add **Just Press Record**.
- **iPhone Action Button:** Settings → Action Button → swipe to **Shortcut** (or **Controls**) → pick Just Press Record's record action if it's listed, otherwise **Open App → Just Press Record**.

## 2. The "Send to Recorder" shortcut
Shortcuts app → **+** → name it **Send to Recorder**. Add these actions in order:

1. **Get Contents of Folder**: tap *Folder* → iCloud Drive → **Just Press Record**. Turn **Recursive** on (it has a folder per day).
2. **Filter Files**: *Files* = Contents of Folder → Add Filter → **File Extension** *is* **m4a**.
3. **Repeat with Each** item in *Files*. Inside the repeat:
   1. **Get Details of Files**: *Creation Date* of *Repeat Item*.
   2. **Format Date**: Date Format **Custom** → `yyyy-MM-dd_HH-mm-ss`.
   3. **Set Name**: *Repeat Item* to *Formatted Date* (the file keeps .m4a).
   4. **Save File**: *Renamed Item* → turn **Ask Where to Save** off → Destination **Dropbox / Recorder / Inbox** → **Overwrite If File Exists** on.
   5. **Move File**: *Repeat Item* → iCloud Drive / **Recorder Sent** (create this folder first in the Files app). This stops it being sent twice.
4. (Optional) **Show Notification**: "Sent to Recorder" (put it after the repeat).

Test it once by tapping ▶. The file should appear in Dropbox `/Recorder/Inbox` with a date-time name.

## 3. Automations (so you never run it by hand)
Shortcuts → **Automation** → **+**. For each one choose **Run Immediately**, turn **Notify When Run** off, and pick **Send to Recorder**.

| Trigger | Setting |
|---|---|
| **App** | Just Press Record · **Is Closed** |
| **Time of Day** | 10:00 daily (repeat to make 13:00, 16:00, 19:00) |
| **Charger** | Is Connected |

## 4. Housekeeping
- Empty iCloud Drive / **Recorder Sent** weekly (or tell Claude to switch step 3.5 to Delete once you trust it).
- Edit Dropbox `/Recorder/people_terms.md` whenever a name is misheard.

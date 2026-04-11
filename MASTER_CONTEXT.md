# MASTER CONTEXT — Living Memory

## Identity
- **Project**: Quantum Tools GTM Intelligence Engine
- **Founder**: Tom (technical transformation advisor, IHG background)
- **Parent brand**: Quantum Tools — `quantumtools.ai`
- **Analytics brand**: Analysts Edge
- **Status**: MVP build, pre-launch for most products, ATLAS in soft launch

## Product Portfolio
| Product | Status | Domain |
|---|---|---|
| **PRISM** | MVP | Workforce intelligence from LinkedIn |
| **Analyst's Edge** (Diagnostic Engine) | MVP | Outside-in company diagnostics |
| **APEX** | MVP | AI-native programme management |
| **ATLAS** | Soft launch | Autonomous swing trading research |

## Brand Voice
- **Philosophy**: Teach, demonstrate, make them reach for it
- **Edginess**: 8/10
- **Tone**: Sharp, transparent, anti-guru, confident without arrogance
- **Aspirational voices**: Stratechery, Bridgewater, patio11, Stripe dev docs
- **Founder visibility**: NONE — no recorded footage, no identifiable features
- **Presenter approach**: Fictional locked character (Theo) generated from Nano Banana 2

## Character Manifest — Theo (The Obsidian Seraph)

**Status**: LOCKED (2026-04-11). Do not regenerate from text. Only animate from approved stills.

### Identity
- **Name**: Theo — The Obsidian Seraph
- **Nature**: Male-presenting entity. Ageless/unknown. Not human.
- **Positioning**: A being of pure corporate authority. Subversive, counter-intuitive, cinematic gravitas.

### Visual Signature (inviolable — every prompt must include these exact tokens)
- **Head**: Perfectly smooth, featureless obsidian glass helmet shaped like an inverted teardrop.
  No human facial features. No eyes, nose, mouth. Pure reflective obsidian surface.
- **Halos**: Three floating, disconnected cyan neon halos rotating around the head using
  impossible physics. Never attached to the helmet — always a visible gap.
- **Wardrobe**: Razor-sharp, hyper-tailored vantablack suit. Light-absorbing material.
  Dark, sleek, high-fashion corporate silhouette.
- **Vibe**: "Digital Hyper-Reality Corporate Authority"

### Canonical Description (inject into every Nano Banana prompt)
> "Theo (a male-presenting figure wearing a vantablack suit made of light-absorbing material,
> with a perfectly smooth featureless obsidian glass helmet shaped like an inverted teardrop
> replacing his head, and three disconnected floating cyan neon halos rotating around his head
> using impossible physics)"

### Voice
- **Target profile**: Upper-class British gentleman. Tom Hiddleston in *The Night Manager* /
  Bond levels of gravitas.
- **TTS voice**: `Charon` (deep, authoritative) with prompt directive for "British RP delivery,
  measured pace, quiet authority, Received Pronunciation"
- **Never**: American accent, fast pace, sales energy

## The Three Locked Environments

### SHOT SETUP 01: The Executive Reflection Pool
- **Narrative Purpose**: High-authority Hook or Pivot (0-4s)
- **Environment**: Massive futuristic CEO corner office. Floor is a millimeter-deep pool of
  perfectly still black water reflecting the skyline. Furniture hovers 1 inch above the
  water surface. Floor-to-ceiling windows, hazy cyberpunk metropolis at twilight.
- **Signature detail**: Water must remain perfectly still — no ripples, no movement.

### SHOT SETUP 02: The Zenith Hotel Lobby
- **Narrative Purpose**: Grounded Agitation or Transition (4-8s)
- **Environment**: Sprawling hyper-luxurious corporate atrium. Brutalism fused with synthetic
  biology. Vast seamless white marble walls. Massive symmetrical geometric trees made of
  translucent bioluminescent frosted glass emitting warm amber glow. Synthetic fireflies
  drift in grid patterns. Impossibly high ceilings.
- **Signature detail**: Architectural digest scale. Theo must look small within the space.

### SHOT SETUP 03: The Chronos VIP Lounge
- **Narrative Purpose**: Outcome or Bookend CTA (16-20s)
- **Environment**: Windowless ultra-elite private club. Deep ribbed velvet walls (acoustically
  deadened). Massive kinetic chandelier of slowly dripping liquid gold suspended in mid-air
  in reverse gravity. Deep emerald-green velvet curved sofa. Warm gold light.
- **Signature detail**: The liquid gold drips UPWARD toward the ceiling.

## Cinematography Rules (inviolable)
1. **Wide-angle lens prompting** (16mm–24mm) — never let the environments shrink
2. **Theo must fit within the sprawling scale** — architectural digest proportions
3. **Impossible physics are mandatory** — halos rotate on impossible axes, water doesn't
   ripple, gold drips upward. These are the signature. Remove them and Theo becomes
   generic corporate stock.
4. **8k, photorealistic textures, moody corporate lighting** — never cartoon, never 3D-render look

## Content Edginess Principles (hardcoded)
1. Say the uncomfortable thing
2. Show your work
3. Have a point of view
4. Punch at the category (never name competitors)
5. Respect the reader's intelligence

## Brand Visual Palette
- Background: `#0a0a0f`
- Primary accent: `#6c63ff` (purple)
- Hot accent: `#ff6b6b`
- Gold accent: `#ffd166`
- Text: `#e8e8f0`
- Typography: Playfair Display (headings), DM Sans (body)
- Colour grade: Desaturated earth tones, Kodak Portra 400

## Model Arsenal & Credit Costs (confirmed on user's Paid Tier 1 account)
| Model | Task | Cost per unit |
|---|---|---|
| `claude-sonnet-4-20250514` | All text generation, scripts, strategy | ~£0.03/call |
| `gemini-2.5-flash` | Social copy variations, SEO | ~£0.01/call |
| `gemini-3-pro-image-preview` (Nano Banana 2) | Character stills, UGC, data viz, thumbnails | ~£0.03/image |
| `imagen-4.0-ultra-generate-001` | Hero images (high fidelity) | ~£0.06/image |
| `gemini-2.5-flash-preview-tts` | Voiceover generation | ~£0.01/minute |
| `veo-3.1-fast-generate-preview` | Image-to-video animation (startFrame mode) | ~£0.80/8s clip |
| `veo-3.1-generate-preview` | Hero clips only | ~£3.20/8s clip |

## Critical API Learnings (from painful debugging)
1. **Veo does NOT maintain character consistency from text prompts alone.** It generates a new random person each call. Reference images passed as `image` kwarg DO work but must be proper `startFrame` — literal first frame, not "reference inspiration".
2. **Nano Banana 2 → Veo startFrame is the only way to lock character state.** Generate the character as a still first, then animate from that exact image.
3. **Google TTS returns raw PCM data, not WAV.** Must wrap with `wave` module to produce playable files.
4. **Veo video download requires API key in URL** and follows 302 redirects — use `follow_redirects=True` in httpx.
5. **ffmpeg must be in PATH of the terminal running Python** — subprocess inherits environment at launch time.
6. **Image API requires base64 + mime type** — not raw bytes. Use `types.Image(image_bytes=base64.b64encode(...).decode(), mime_type="image/png")`.

## Core-Five Framework (Reel Architecture)
Every 20-second reel = 5 modular State Blocks of 3-4 seconds each.

| # | Segment | Duration | Aesthetic | Model Pipeline |
|---|---|---|---|---|
| 1 | Hook | 0-4s | Hyper-stylised narrator | Nano Banana still → Veo startFrame |
| 2 | Agitation | 4-8s | Grounded UGC iPhone | Nano Banana UGC still → Veo startFrame |
| 3 | Pivot | 8-12s | Clean data visualisation | Nano Banana data overlay → Veo startFrame |
| 4 | Outcome | 12-16s | Grounded B-roll (fast cuts) | Kling 3.0 scene / Veo B-roll |
| 5 | Bookend | 16-20s | EXACT return to Hook state | Reuse Hook reference — zero deviation |

## Fixed Asset Library Rules
- **The Narrator**: 1 hero image + 9 angles = 10 images total, saved to `references/influencers/narrator/`
- Narrator must be locked before any video generation proceeds
- Every Veo call for the Narrator uses one of these 10 images as startFrame
- Aesthetic boundaries are inviolable: Hook/Bookend never blend with Agitation UGC

## Inviolable Rules
1. **Pacing guardrail**: No single shot exceeds 4 seconds
2. **Aesthetic boundary**: Hyper-stylised (Hook/Bookend) never blends with Grounded UGC (Agitation)
3. **State check**: Before generating Bookend, verify EXACT Hook reference file path and pass it through unchanged
4. **Founder anonymity**: Zero recorded footage, zero identifiable features, no selfies
5. **Presenter consistency**: Always startFrame from the fixed character sheet — never text-to-video for faces

## Current Build State
- **Layer 1**: Discovery Engine (CLI) — DONE
- **Layer 2**: Strategy Engine — DONE (GTM strategy generated for Quantum Tools)
- **Layer 3A**: Master Asset generation — DONE (MA-001: Consultancy Death Spiral)
- **Layer 3B**: Derivative pipeline (11 formats) — DONE
- **Layer 3C**: Multi-AI routing — DONE (Claude + Google)
- **Layer 4**: Audience Development Module — DONE
- **Layer 5**: Deployment connectors — DONE
- **Layer 6**: Live Intelligence Feed — DONE
- **Layer 7**: Stage Gate + Reporting — DONE
- **Layer 8**: Brand Standards Module — DONE
- **Reel production pipeline**: PIVOTING NOW to Core-Five character-based approach

## Decisions Log
- 2026-04-11: HARD RESET to Core-Five framework. Presenter is a fictional Nano Banana character, not text-to-video. Five discrete State Blocks, never one 20-second generation.
- 2026-04-11: Founder confirmed NO recorded footage of themselves. Presenter is AI-generated fictional character.
- 2026-04-11: ffmpeg, TTS WAV wrapping, and Veo image encoding all fixed.
- 2026-04-10: Switched from openai to google-genai SDK after 404 errors on deprecated models.
- 2026-04-10: Pivoted from 11 mixed-format derivatives to master asset → derivative pipeline.

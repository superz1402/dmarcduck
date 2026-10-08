# Brag Plan: DmarcDuck

## What is this app?
DmarcDuck turns the dense DMARC aggregate XML reports every email provider
sends you into one honest, plain-language answer — free analyzer, flat-priced
monitoring, built for small operators.

## The angle
Everyone sending email since 2024 gets XML reports nobody opens. The video
opens on that wall of XML (the real fixture), says the quiet part —
"Nobody reads them." — then lets a calm duck parse it in one click and answer
in sentences a human can read. The joke writes itself from the product's own
landing copy; the product is real, so the tone stays warm, not unhinged.

## Hook (first 2-3 seconds)
Real DMARC XML (`<feedback>`, source rows, `192.0.2.1`) scrolling in Geist
Mono on warm paper — the exact wall of text the product kills — then the
landing line slams: "Your email provider sends you reports."

## Key moments (the middle)
- "Nobody reads them." — the landing page's own muted second line, full-screen.
- The real landing page itself slides in (actual product screenshot).
- Simulated click on **Analyze** → stats pop one by one: **123 emails,
  100% DMARC pass, p=none** (real numbers from the real Google fixture parsed
  by the real parser).
- Two source verdicts slide in like cards: 120 fully authenticated
  ("nothing to do here") and 3 SPF-only with a DKIM warning — every source
  explained in one sentence.
- The amber banner: "You are ready to move to quarantine." — the product's
  actual recommendation for this report.

## Outro / punchline
Pricing honesty: "Free analyzer. $7/mo Starter. $19/mo Studio. No per-domain
tax." → duck logo slams on the beat → "DmarcDuck — DMARC monitoring that
doesn't bite." + dmarcduck.ansaribilal.com

## User flow worth showing
entry → key action → result: drop `google-report.xml` into /analyze → click
Analyze → per-source verdicts + one recommendation. (Result view recreated in
HTML from the real parser output on tests/fixtures/google-report.xml; the
upload step shown from the real app.)

## Tone
- Preset: `default`
- Creative direction: warm-product honest launch — the duck does not shout
- Interpretation: 5 scenes, comfortable rhythm, soft crossfades and clean
  slides; humor comes only from the product's own copy.

## Format: landscape — 1920x1080
## Duration: 21.5s

## Visual identity (from the project)
- Background: #faf9f5 (warm paper; dark accents #1c1b18)
- Accent: #d97706 (duck-bill amber-600), soft #fef3c7
- Text: #1c1b18 ink on paper; #ffffff on ink cards
- Display font: Geist Sans (local woff2 from the project's own deps)
- Body font: Geist Sans; Geist Mono for XML/data moments
- Strongest visual element: the duck logo (calm circle + bill), amber stat
  cards, the pass/fail bar, warm-paper surface — deliberately NOT
  purple-blue SaaS gradients.

## Share copy (draft)
Your email provider sends you DMARC reports. Nobody reads them. DmarcDuck
turned one into a plain-language answer in one click — 123 emails, every
source explained, free: https://dmarcduck.ansaribilal.com

## Audio direction
- Role: warm upbeat bed under a friendly product demo
- Music: happy-beats-business-moves-vol-1-by-ende-dot-app.mp3 (bundled
  preset; 120.19 BPM; full upbeat track, canonical for `default`)
- Music treatment: start at 0s, volume 0.35, ends with the video at 21.5s
- Music cue guidance: preset read from
  `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.md`.
  Strong cues: 16.02/16.52, 17.02, 20.02, 23.02. Beat grid ~0.5s apart from
  3.02. Locks: S4→S5 transition at 17.02 (strong cue), logo slam at 20.02
  (strong cue). Sequential stats/rows snap to the beat grid at 8.02/8.52/9.02
  and 10.02/10.52, then hold (text holds exceed reading floors).
- Audio-reactive treatment: subtle intent (hero glow breathing with RMS);
  extraction helper unavailable in this environment — documented, skipped.
- SFX posture: moderate; motion-matched, restrained
- Audio-coupled moments: XML typing (keypresses), title slam (soft impact),
  duck reveal (drop), Analyze click (mouse click), stat pops (drops),
  source rows (card slides), banner (soft bong), logo (heavy bell)
- Restraint rule: SFX support motion, never cover the music; nothing harsh on
  readable text moments.

## Storyboard

### Scene 1 — The wall nobody reads — 3.0s
Warm paper. Real XML lines (from google-report.xml: feedback header, policy
published, record/source rows) scroll upward in Geist Mono, ink at 45%
opacity. At 1.2s the line "Your email provider sends you reports." slams in
(ink, Geist Sans, 96px) over the fading XML.
Sequential/interaction: yes — XML lines appear one by one while typing ticks play
Audio intent: build-up; busy machine energy settling into one clear voice
Audio-coupled idea: 3-4 randomized keypress ticks 0.4-1.4s; soft impact on the slam
Music: upbeat bed building
Transition mood: clean cut → Scene 2

### Scene 2 — Nobody reads them — 4.0s
"Nobody reads them." (muted ink #6b6a61, 120px) holds center. At ~5.0s the
real landing page (assets/img/landing-top.png) slides up from bottom as a
tilted card with border + shadow, duck badge overlapping its corner; the
headline shrinks to the top third.
Sequential/interaction: none
Audio intent: the exhale — problem stated, relief arriving
Audio-coupled idea: drop_001 when the landing card lands (5.03 beat)
Music: bed grooves
Transition mood: clean slide → Scene 3

### Scene 3 — One click, real answers — 5.5s
Recreated analyzer card (paper, 1px border #e4e1d5, radius 10px): dashed
dropzone with file chip "google-report.xml · 1.5 KB", amber Analyze button.
Cursor clicks Analyze (7.6s, mouseclick SFX). Stat cards pop one by one on
the beat grid: Email volume 123 → DMARC pass rate 100% → policy p=none.
Then two source rows slide in like cards: "192.0.2.1 · 120 emails · SPF+DKIM
aligned — nothing to do here." (green) and "198.51.100.23 · 3 emails · SPF
only, DKIM failed" (amber). All stay on screen.
Sequential/interaction: yes — cursor click, stats pop one by one, rows slide in
Audio intent: product doing its job, satisfying ticks
Audio-coupled idea: mouseclick at 7.6; drop_002 pops at 8.02/8.52/9.02
(beat-grid); card-slide at 10.02/10.52 (beat-grid)
Music: bed grooves
Transition mood: soft crossfade → Scene 4

### Scene 4 — The plain-language answer — 4.5s
Amber health banner (bg #fef3c7, border #d97706/40, radius 10px): warning
triangle icon, "You are ready to move to quarantine." (ink, 56px) + verbatim
sub-line "Your mail is clean but policy is still p=none." (28px). Below, one
quiet line: "Then let it watch — the same answers arrive daily."
Sequential/interaction: none
Audio intent: the payoff — the machine speaks human
Audio-coupled idea: bong_001 soft bell at 12.55 when banner lands
Music: bed grooves toward the strong cues
Transition mood: clean wipe on strong cue 17.02 → Scene 5

### Scene 5 — The honest outro — 4.5s
Pricing reality in three short lines (real): "Free analyzer." / "$7/mo
Starter · $19/mo Studio." / "No per-domain tax." Then duck logo (inline SVG,
amber #d97706) slams to center-left on strong cue 20.02 with "DmarcDuck" word
mark and tagline "DMARC monitoring that doesn't bite." + small URL
dmarcduck.ansaribilal.com.
Sequential/interaction: yes — three pricing lines beat in, logo slams
Audio intent: confident close; one big bell, then music rides out
Audio-coupled idea: impactBell_heavy_000 at 20.02 (beat-locked); music fades
Music: bed resolves
Transition mood: end on logo hold

**Music mood for this video:** upbeat
**Audio summary:** warm upbeat bed at 0.35 with restrained motion-matched SFX
(typing ticks, soft impacts, one heavy bell payoff), every sequential reveal
snapped to the 120 BPM beat grid, strong cues reserved for the S4→S5 wipe and
the final logo slam.

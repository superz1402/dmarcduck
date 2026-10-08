# Hyperframes Composition Brief: DmarcDuck

## Objective
Create a short launch-style brag video for DmarcDuck.

## Output
- Composition directory: `/home/z/my-project/builds/dmarcduck-brag/brag/`
- Rendered video: `/home/z/my-project/builds/dmarcduck-brag/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.5 seconds

## Source Material
- Project root: /home/z/my-project/builds/dmarcduck
- Primary files read: README.md, src/app/page.tsx (landing), src/app/globals.css
  (design tokens), src/app/analyze/page.tsx, src/components/analyzer.tsx,
  src/components/analysis-view.tsx, src/components/duck-logo.tsx,
  src/lib/dmarc/parser.ts + analyze.ts (real parse of
  tests/fixtures/google-report.xml → /tmp/parse_dump.json)
- Product name: DmarcDuck
- Tagline / strongest claim: "DMARC monitoring that doesn't bite."
- Key UI or visual moment to recreate: the analyzer result view — stat cards
  (123 emails / 100% pass / p=none), per-source verdict rows, amber
  recommendation banner
- Copy that must appear verbatim:
  - "Your email provider sends you reports." / "Nobody reads them."
  - "DMARC, minus the pain"
  - "DMARC monitoring that doesn't bite."
  - "Fully authenticated (SPF and DKIM aligned)" (source note, real)
  - "Your mail is clean but policy is still p=none. You are ready to move to
    quarantine." (health banner, real)
  - "Then let it watch" (landing step 3 card)
  - "$7/month", "$19/mo Studio", "No per-domain tax"
- Real screenshot available: assets/img/landing-top.png (1920x1080, light theme)
- Real parsed data (google-report.xml): volume 123, dmarcPass 123 / fail 0,
  policy p=none pct=100, sources 192.0.2.1 (120, spf pass/dkim pass, note
  "Fully authenticated (SPF and DKIM aligned) — nothing to do here.") and
  198.51.100.23 (3, spf pass/dkim fail, note "Authenticated via SPF only —
  DKIM failed here. Mail still passes DMARC..."), provider google.com,
  health "attention", healthReason "Your mail is clean but policy is still
  p=none. You are ready to move to quarantine."

## Creative Direction
- Tone preset: default
- Creative direction: warm-product honest launch — the duck does not shout
- Interpretation: comfortable 5-scene rhythm; humor only from the product's
  own copy; warm paper surfaces, no purple-blue SaaS gradients
- Angle: the XML wall nobody reads → one click → plain-language answers →
  honest pricing → calm duck
- Hook: real XML scrolling in Geist Mono, then "Your email provider sends
  you reports."
- Outro / punchline: pricing honesty → duck logo slam on strong cue →
  tagline + URL
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: #faf9f5
- Text: #1c1b18 (muted #6b6a61)
- Accent: #d97706 (soft #fef3c7; success #15803d on #dcfce7; danger #b91c1c)
- Display font: Geist Sans (assets/fonts/geist-latin.woff2, local)
- Body font: Geist Sans; Geist Mono (assets/fonts/geist-mono-latin.woff2) for XML
- Visual references from the project: duck logo (inline SVG from
  duck-logo.tsx: accent circle r=10 at (16,17), eye at (19,14) r=1.6 in
  accent-foreground, bill path M4 19h7a2.5 2.5 0 0 1 0 5H6a2 2 0 0 1-2-2z,
  rect x=2 y=17.6 w=3 h=5.2 rx=1.5), 1px #e4e1d5 borders, radius 10px,
  dashed dropzone, amber CTA button, stat cards with uppercase 12px labels
  and 24px semibold numbers, pass/fail progress bar

## Storyboard
Use the storyboard in /home/z/my-project/builds/dmarcduck-brag/brag-plan.md
as the creative contract.

Scene summary:
1. The wall nobody reads — 3.0s — XML scrolls, headline slams
2. Nobody reads them — 4.0s — muted line holds, real landing card slides in
3. One click, real answers — 5.5s — click Analyze, stats pop (123/100%/p=none),
   two source verdict rows slide in
4. The plain-language answer — 4.5s — amber banner "You are ready to move to
   quarantine." + verbatim sub-line + "Then let it watch — the same answers
   arrive daily."
5. The honest outro — 4.5s — pricing lines, duck logo slam, tagline + URL

## Audio
- Audio role: warm upbeat bed under a friendly product demo
- Audio arc: build (XML ticks) → groove (product demo ticks) → resolve
  (one heavy bell, logo hold)
- Music: assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3
- Music treatment: data-start 0, data-volume 0.35, runs full 21.5s
- Music cue guidance: bundled preset at
  /tmp/brag-repo/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json
  (tempo 120.19 BPM). Strong cues: 16.02, 17.02, 18.02, 20.02, 23.02.
  Locks: S4→S5 wipe at 17.02 (strong cue), logo slam at 20.02 (strong cue).
  Beat-grid windows: stats 8.02/8.52/9.02, source rows 10.02/10.52.
- Audio-reactive treatment: subtle intent (hero glow breathing with RMS);
  the hyperframes-creative extraction helper was not located in this
  environment — documented and skipped; do not block the render
- Audio-coupled moments:
  - Scene 1 XML typing — randomized keyboard keypress ticks (0.4-1.4s)
  - Scene 1 headline slam at ~1.2s — impactSoft_medium_001
  - Scene 2 landing card lands at 5.03 — interface/drop_001
  - Scene 3 cursor clicks Analyze at 7.6 — ui/mouseclick1
  - Scene 3 stat pops at 8.02/8.52/9.02 — interface/drop_002
  - Scene 3 source rows at 10.02/10.52 — casino/card-slide-1
  - Scene 4 banner lands at 12.55 — interface/bong_001 (soft)
  - Scene 5 logo slam at 20.02 — impact/impactBell_heavy_000
- SFX selection guidance: motion-matched per audio.md moment tables; low
  high-frequency-risk files for repeated pops; restrained on readable-text
  moments
- SFX analysis guidance: /tmp/brag-repo/skills/brag/assets/sfx/sfx-analysis.md
- Exact SFX choice: implemented as listed above (Hyperframes convention)
- Audio files: music already in composition/assets/music/; SFX to be copied
  from the skill assets into composition/assets/sfx/

## Hyperframes Instructions
Requirements:
- Show at least one real UI element from the project (assets/img/landing-top.png
  in Scene 2; recreated analyzer/result UI elsewhere, grounded in real data)
- Keep all text readable in the final render (reading floors in the plan)
- Keep the video within 15-25 seconds (21.5s)
- Include the planned music/SFX layer
- Treat music cue metadata as optional timing hints; readability first
- 1-3 strong cue locks: 17.02 and 20.02 — mark with `// beat-locked`
- Sequential reveals snap to beats — mark with `// beat-grid`
- Use local assets for audio and media (no network fetches at render time)
- Run `hyperframes check` before render — the single gate
- Keep creation and rendering local

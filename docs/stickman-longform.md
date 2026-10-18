# Long-form stickman animation

This is an additional production path; it does not change the existing short-video workflow or episode data.

## Target

- 8–10 minutes (480–600 seconds), 16:9 at 1280×720.
- 50–100 scenes, each 3–15 seconds.
- Procedural stickman articulation and action/expression variants; this is genuine drawn character motion, not still-image zoom.
- Optional local voiceover and music are muxed with FFmpeg. No paid generation API is required for the character animation.

## Storyboard

Create a local `storyboard.json` with `title`, `scenes`, and optional `voiceover` / `music` paths. Each scene requires `duration` and `narration`; optional values include `caption`, `action`, `expression`, and `background`. Supported actions: idle, walk, run, talk, point, sit, think, wave, jump, fall, celebrate. Expressions: neutral, happy, sad, angry, surprised, thinking. Backgrounds: warm, night, forest, city, sad, dream.

The scene durations must total 480–600 seconds. Keep generated episode assets and narration local; do not commit private media.

## Commands

`node scripts/stickman-longform.mjs /path/to/storyboard.json --output /path/to/output` validates and creates a standalone HyperFrames project.

`node scripts/stickman-longform.mjs /path/to/storyboard.json --output /path/to/output --render` renders `visual.mp4` and muxes optional voiceover/music into `final.mp4`.

Relative audio paths resolve from the storyboard file's directory. Without audio inputs, `final.mp4` is visual-only. HyperFrames, FFmpeg, and FFprobe must already be available; the script does not silently install system packages. Review representative frames and audio sync on the target Termux device before relying on long renders.

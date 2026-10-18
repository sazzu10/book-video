#!/usr/bin/env node

/**
 * Storybook Video Preview Renderer V3 - Difficult Moments Preview
 * Renders the 3 critical dramatic moments:
 * 1. Scene 3: Axe falling into river (sudden tension)
 * 2. Scene 5: River Goddess emergence (mystical wonder)
 * 3. Scene 7: Honest refusal (humble honesty dialogue)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { generateAssSubtitleFile } from "./lib/ass-subtitle-generator.mjs";

const ROOT = path.resolve(process.cwd());
const episodeDir = path.join(ROOT, "episodes", "the-honest-woodcutter");
const storyboardPath = path.join(episodeDir, "storyboard.json");
const timingsPath = path.join(episodeDir, "audio", "body-timings.json");
const imagesDir = path.join(episodeDir, "images");
const sfxDir = path.join(ROOT, "assets", "sfx");
const fontsDir = path.join(ROOT, "assets", "fonts");
const bgmPath = path.join(ROOT, "assets", "bgm", "如愿.mp3");

const manifest = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));

const targetScenes = ["scene_003", "scene_005", "scene_007"];
const scenesToRender = manifest.scenes.filter(s => targetScenes.includes(s.sceneId));

const tmpDir = path.join(ROOT, "tmp", `preview-v3-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

function getMotionFilter(motionType, duration, width, height) {
  const d = Math.max(1.0, Number(duration.toFixed(2)));
  switch (motionType) {
    case "pan_bottom_to_top":
      return `scale=1200:2133,crop=${width}:${height}:'(1200-${width})/2':'(2133-${height})*(1-t/${d})'`;
    case "pan_left_to_right":
      return `scale=1240:2204,crop=${width}:${height}:'(1240-${width})*(t/${d})':'(2204-${height})/2'`;
    case "dramatic_zoom_in":
      return `scale='${width}*(1+0.14*t/${d})':'${height}*(1+0.14*t/${d})':eval=frame,crop=${width}:${height}`;
    case "slow_zoom_in":
    default:
      return `scale='${width}*(1+0.08*t/${d})':'${height}*(1+0.08*t/${d})':eval=frame,crop=${width}:${height}`;
  }
}

console.log("=== RENDERING 3-MOMENT PREVIEW V3 ===");
const sceneClips = [];
const previewCaptions = [];
let accumulatedTime = 0;

for (let i = 0; i < scenesToRender.length; i++) {
  const sc = scenesToRender[i];
  const imgName = sc.imageFileName;
  const imgPath = path.join(imagesDir, imgName);
  const dur = Number((sc.actualDuration || 5.0).toFixed(2));

  console.log(`Rendering [${sc.sceneId}] (${dur}s, ${sc.cameraMotion?.type || "slow_zoom_in"})...`);
  const clipOut = path.join(tmpDir, `clip_${sc.sceneId}.mp4`);
  const mFilter = getMotionFilter(sc.cameraMotion?.type, dur, 1080, 1920);

  const rRes = spawnSync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-t", String(dur),
    "-i", imgPath,
    "-vf", mFilter,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    clipOut
  ], { encoding: "utf8" });

  if (rRes.status !== 0) throw new Error(`Clip render failed: ${rRes.stderr}`);
  sceneClips.push(clipOut);

  // Add caption for preview
  previewCaptions.push({
    order: i + 1,
    text: sc.narrationText,
    start: accumulatedTime,
    end: accumulatedTime + dur - 0.1
  });
  accumulatedTime += dur;
}

// Concat clips
const concatFile = path.join(tmpDir, "concat.txt");
fs.writeFileSync(concatFile, sceneClips.map(c => `file '${path.resolve(c)}'`).join("\n"), "utf8");

const concatVideo = path.join(tmpDir, "preview_raw.mp4");
spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", concatVideo]);

// Generate ASS subtitles
const previewAss = path.join(tmpDir, "preview.ass");
generateAssSubtitleFile({
  captions: previewCaptions,
  outputPath: previewAss,
  fontName: "Noto Sans Devanagari",
  fontSize: 44,
  marginV: 280,
  marginL: 70,
  marginR: 70
});

// Burn ASS subtitles
const previewSub = path.join(tmpDir, "preview_sub.mp4");
spawnSync("ffmpeg", [
  "-y",
  "-i", concatVideo,
  "-vf", `ass=${previewAss}:fontsdir=${fontsDir}`,
  "-c:v", "libx264",
  "-preset", "ultrafast",
  "-pix_fmt", "yuv420p",
  previewSub
]);

// Cut corresponding speech audio from full narration
// Scene 3: ~9.24 to ~14.00, Scene 5: ~19.29 to ~24.52, Scene 7: ~29.06 to ~34.68
const fullAudio = path.join(episodeDir, "audio", "full-narration.mp3");
const scene3Aud = path.join(tmpDir, "aud3.wav");
const scene5Aud = path.join(tmpDir, "aud5.wav");
const scene7Aud = path.join(tmpDir, "aud7.wav");

spawnSync("ffmpeg", ["-y", "-ss", "00:00:09.24", "-t", String(scenesToRender[0].actualDuration), "-i", fullAudio, scene3Aud]);
spawnSync("ffmpeg", ["-y", "-ss", "00:00:19.29", "-t", String(scenesToRender[1].actualDuration), "-i", fullAudio, scene5Aud]);
spawnSync("ffmpeg", ["-y", "-ss", "00:00:29.06", "-t", String(scenesToRender[2].actualDuration), "-i", fullAudio, scene7Aud]);

// Concat audio
const audConcat = path.join(tmpDir, "aud_concat.txt");
fs.writeFileSync(audConcat, `file '${scene3Aud}'\nfile '${scene5Aud}'\nfile '${scene7Aud}'`, "utf8");
const combinedVoice = path.join(tmpDir, "combined_voice.wav");
spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", audConcat, combinedVoice]);

// Final mux with ducked BGM
const previewFinal = path.join(episodeDir, "renders", "the-honest-woodcutter-v3-preview.mp4");
const muxRes = spawnSync("ffmpeg", [
  "-y",
  "-i", previewSub,
  "-i", combinedVoice,
  "-stream_loop", "-1",
  "-i", bgmPath,
  "-filter_complex",
  `[1:a]asetpts=PTS-STARTPTS,aresample=48000,volume=1.0[speech];` +
  `[2:a]atrim=0:${accumulatedTime},asetpts=PTS-STARTPTS,aresample=48000,volume=0.18,afade=t=in:st=0:d=0.8,afade=t=out:st=${accumulatedTime - 1.5}:d=1.5[bgm];` +
  `[speech][bgm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1[aout]`,
  "-map", "0:v",
  "-map", "[aout]",
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "192k",
  "-t", String(accumulatedTime),
  previewFinal
], { encoding: "utf8" });

if (muxRes.status === 0 && fs.existsSync(previewFinal)) {
  console.log(`PREVIEW V3 GENERATED: ${previewFinal} (${fs.statSync(previewFinal).size} bytes, ${accumulatedTime.toFixed(2)}s)`);
} else {
  console.error("Preview mux failed:", muxRes.stderr);
}

fs.rmSync(tmpDir, { recursive: true, force: true });

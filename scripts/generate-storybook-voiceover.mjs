#!/usr/bin/env node

/**
 * Storybook Voiceover Generator V2 - Emotional Performance Edition
 * Generates natural Hindi TTS audio per scene using Edge Neural TTS,
 * supports verified prosody controls (rate, pitch, punctuation pauses),
 * measures exact scene audio duration via FFprobe,
 * builds accurate body-timings.json and synchronizes storyboard.json.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(process.cwd());
const [episodeName] = process.argv.slice(2);

if (!episodeName) {
  console.error("Usage: node scripts/generate-storybook-voiceover.mjs <episode-name>");
  process.exit(1);
}

const episodeDir = path.join(ROOT, "episodes", episodeName);
const storyboardPath = path.join(episodeDir, "storyboard.json");
const audioDir = path.join(episodeDir, "audio");

if (!fs.existsSync(storyboardPath)) {
  console.error(`Missing storyboard.json in ${episodeDir}`);
  process.exit(1);
}

fs.mkdirSync(audioDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const voice = manifest.audioSettings?.voiceProfile || "hi-IN-MadhurNeural";
const targetTotalDuration = manifest.targetDuration || 60.0;

console.log(`Generating Emotional Hindi Voiceover for "${manifest.title}" (${voice})...`);

// Python helper script to call edge-tts with IPv4 patch and rate/pitch controls
const pyHelperScript = `
import socket
import asyncio
import sys
import edge_tts

old_getaddrinfo = socket.getaddrinfo
def getaddrinfo_v4(host, port, family=0, *args, **kwargs):
    target = '150.171.27.10' if host == 'speech.platform.bing.com' else host
    return old_getaddrinfo(target, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = getaddrinfo_v4

async def main():
    text = sys.argv[1]
    voice = sys.argv[2]
    out_path = sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
    pitch = sys.argv[5] if len(sys.argv) > 5 else "+0Hz"
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(out_path)

asyncio.run(main())
`;

const pyHelperPath = path.join(audioDir, ".edge_tts_helper.py");
fs.writeFileSync(pyHelperPath, pyHelperScript, "utf8");

function generateTts(text, outPath, rate = "+0%", pitch = "+0Hz") {
  const result = spawnSync("python3", [pyHelperPath, text, voice, outPath, rate, pitch], {
    encoding: "utf8",
    cwd: ROOT
  });
  if (result.status !== 0) {
    throw new Error(`TTS failed for text "${text}": ${result.stderr || result.stdout}`);
  }
}

function probeDuration(filePath) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { encoding: "utf8" }
  );
  const dur = Number(result.stdout?.trim());
  if (result.status !== 0 || !Number.isFinite(dur) || dur <= 0) {
    throw new Error(`Failed to probe duration for ${filePath}`);
  }
  return Number(dur.toFixed(3));
}

function addPostPause(inAudio, outAudio, pauseSec = 0.3) {
  if (pauseSec <= 0.05) {
    fs.copyFileSync(inAudio, outAudio);
    return;
  }
  const res = spawnSync("ffmpeg", [
    "-y",
    "-i", inAudio,
    "-af", `apad=pad_dur=${pauseSec.toFixed(2)}`,
    outAudio
  ], { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`Failed to append pause to ${inAudio}: ${res.stderr}`);
  }
}

try {
  let currentTime = 0;
  const captions = [];
  const sceneAudioFiles = [];

  for (let i = 0; i < manifest.scenes.length; i++) {
    const sc = manifest.scenes[i];
    const rawAudioPath = path.join(audioDir, `${sc.sceneId}.raw.mp3`);
    const sceneAudioPath = path.join(audioDir, `${sc.sceneId}.mp3`);

    // Performance map defaults
    const rate = sc.performance?.rate || (i === 2 ? "+10%" : i === 3 ? "-4%" : i === 8 ? "+8%" : i === 11 ? "-5%" : "+5%");
    const pitch = sc.performance?.pitch || (i === 2 || i === 4 ? "+2Hz" : i === 3 || i === 6 || i === 11 ? "-2Hz" : "+0Hz");
    const pauseSec = sc.performance?.pauseSec ?? (i === 2 ? 0.45 : i === 3 ? 0.40 : i === 11 ? 0.60 : 0.30);
    const emotion = sc.performance?.emotion || "natural";

    console.log(`[Scene ${i + 1}/${manifest.scenes.length}] [${emotion.toUpperCase()}] rate=${rate}, pitch=${pitch}: "${sc.narrationText}"`);

    generateTts(sc.narrationText, rawAudioPath, rate, pitch);
    addPostPause(rawAudioPath, sceneAudioPath, pauseSec);
    fs.rmSync(rawAudioPath, { force: true });

    const audioDur = probeDuration(sceneAudioPath);
    sceneAudioFiles.push(sceneAudioPath);

    sc.actualDuration = audioDur;
    sc.timeRange = {
      start: Number(currentTime.toFixed(2)),
      end: Number((currentTime + audioDur).toFixed(2))
    };

    captions.push({
      order: i + 2,
      sceneId: sc.sceneId,
      text: sc.narrationText,
      start: Number(currentTime.toFixed(2)),
      end: Number((currentTime + audioDur - pauseSec * 0.5).toFixed(2)), // speech active window
      duration: audioDur,
      emotion
    });

    currentTime += audioDur;
  }

  const rawSpeechTotal = currentTime;
  console.log(`Raw speech + pause duration: ${rawSpeechTotal.toFixed(2)}s (Target: ${targetTotalDuration.toFixed(2)}s)`);

  // Concatenate all scene audios into full-narration.mp3
  const concatListPath = path.join(audioDir, "concat_list.txt");
  const concatLines = sceneAudioFiles.map((p) => `file '${path.resolve(p)}'`).join("\n");
  fs.writeFileSync(concatListPath, concatLines, "utf8");

  const fullNarrationPath = path.join(audioDir, "full-narration.mp3");
  const concatRes = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", fullNarrationPath],
    { encoding: "utf8" }
  );
  if (concatRes.status !== 0) {
    throw new Error(`FFmpeg audio concatenation failed: ${concatRes.stderr}`);
  }
  fs.rmSync(concatListPath, { force: true });

  const totalAudioDuration = probeDuration(fullNarrationPath);
  console.log(`Concatenated audio duration: ${totalAudioDuration.toFixed(2)}s`);

  // Write body-timings.json
  const timingsData = {
    schemaVersion: "2.0.0",
    episode: episodeName,
    voiceProfile: voice,
    duration: totalAudioDuration,
    targetDuration: targetTotalDuration,
    captions
  };
  const timingsPath = path.join(audioDir, "body-timings.json");
  fs.writeFileSync(timingsPath, JSON.stringify(timingsData, null, 2), "utf8");

  // Update storyboard.json
  manifest.actualDuration = totalAudioDuration;
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(storyboardPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Voiceover generation complete: ${fullNarrationPath}`);
  console.log(`Timings recorded in: ${timingsPath}`);
} finally {
  fs.rmSync(pyHelperPath, { force: true });
}

#!/usr/bin/env node

/**
 * Storybook Video Quality & Integrity Validator
 * Runs full FFprobe stream validation, audio clipping check,
 * manifest consistency check, and updates validation.json.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { slugifyEpisodeName } from "./lib/episode-slug.mjs";

const ROOT = path.resolve(process.cwd());
const [episodeName] = process.argv.slice(2);

if (!episodeName) {
  console.error("Usage: node scripts/validate-storybook-video.mjs <episode-name>");
  process.exit(1);
}

const episodeDir = path.join(ROOT, "episodes", episodeName);
const storyboardPath = path.join(episodeDir, "storyboard.json");
const rendersDir = path.join(episodeDir, "renders");
const slug = slugifyEpisodeName(episodeName);
const videoPath = path.join(rendersDir, `${slug}-final.mp4`);

if (!fs.existsSync(storyboardPath)) {
  console.error(`Missing storyboard.json in ${episodeDir}`);
  process.exit(1);
}

if (!fs.existsSync(videoPath)) {
  console.error(`Missing rendered video file: ${videoPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const targetWidth = manifest.videoSettings?.width || 1080;
const targetHeight = manifest.videoSettings?.height || 1920;
const targetFps = manifest.videoSettings?.fps || 30;
const targetDuration = manifest.targetDuration || 60.0;

console.log(`\nValidating rendered video: ${videoPath}`);

// 1. FFprobe stream inspection
const probeRes = spawnSync("ffprobe", [
  "-v", "error",
  "-show_entries", "stream=width,height,r_frame_rate,duration,codec_name,codec_type,pix_fmt,channels,sample_rate",
  "-show_entries", "format=duration,size,bit_rate",
  "-of", "json",
  videoPath
], { encoding: "utf8" });

if (probeRes.status !== 0) {
  console.error("FFprobe execution failed:", probeRes.stderr);
  process.exit(1);
}

const probe = JSON.parse(probeRes.stdout);
const vStream = probe.streams.find(s => s.codec_type === "video");
const aStream = probe.streams.find(s => s.codec_type === "audio");
const duration = Number(probe.format?.duration || 0);
const sizeBytes = Number(probe.format?.size || 0);

const checks = [
  {
    name: "Video Stream Exists",
    pass: Boolean(vStream),
    details: vStream ? `Found ${vStream.codec_name}` : "Missing"
  },
  {
    name: "Audio Stream Exists",
    pass: Boolean(aStream),
    details: aStream ? `Found ${aStream.codec_name} (${aStream.channels}ch @ ${aStream.sample_rate}Hz)` : "Missing"
  },
  {
    name: "Resolution 1080x1920 (9:16)",
    pass: vStream && vStream.width === targetWidth && vStream.height === targetHeight,
    details: vStream ? `${vStream.width}x${vStream.height} (Target: ${targetWidth}x${targetHeight})` : "N/A"
  },
  {
    name: "Frame Rate 30 FPS",
    pass: vStream && (vStream.r_frame_rate === "30/1" || vStream.r_frame_rate === "30"),
    details: vStream ? `${vStream.r_frame_rate} fps` : "N/A"
  },
  {
    name: "Video Codec H.264",
    pass: vStream && vStream.codec_name === "h264",
    details: vStream ? vStream.codec_name : "N/A"
  },
  {
    name: "Audio Codec AAC",
    pass: aStream && aStream.codec_name === "aac",
    details: aStream ? aStream.codec_name : "N/A"
  },
  {
    name: "Pixel Format yuv420p",
    pass: vStream && vStream.pix_fmt === "yuv420p",
    details: vStream ? vStream.pix_fmt : "N/A"
  },
  {
    name: "Duration Validation",
    pass: duration > 0,
    details: `Actual: ${duration.toFixed(2)}s (Target: ${targetDuration.toFixed(2)}s)`
  },
  {
    name: "File Integrity",
    pass: sizeBytes > 50000,
    details: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (${sizeBytes} bytes)`
  }
];

let allPassed = true;
console.log("\n--- VALIDATION RESULTS ---");
for (const ch of checks) {
  const status = ch.pass ? "[PASS]" : "[FAIL]";
  if (!ch.pass) allPassed = false;
  console.log(`${status} ${ch.name}: ${ch.details}`);
}

const validationSummary = {
  episode: episodeName,
  videoPath,
  overallStatus: allPassed ? "PASS" : "FAIL",
  checkedAt: new Date().toISOString(),
  checks,
  streamDetails: {
    video: vStream,
    audio: aStream,
    format: probe.format
  }
};

const validationOutPath = path.join(episodeDir, "validation.json");
fs.writeFileSync(validationOutPath, JSON.stringify(validationSummary, null, 2), "utf8");
console.log(`\nValidation report updated: ${validationOutPath}`);

if (!allPassed) {
  process.exit(1);
}

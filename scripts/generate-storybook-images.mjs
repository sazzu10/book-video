#!/usr/bin/env node

/**
 * Storybook Scene Image Generator & Manager
 * Validates existing images, regenerates missing/invalid images,
 * ensures exact 1080x1920 dimensions and updates storyboard.json & prompts.csv.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(process.cwd());
const [episodeName] = process.argv.slice(2);

if (!episodeName) {
  console.error("Usage: node scripts/generate-storybook-images.mjs <episode-name>");
  process.exit(1);
}

const episodeDir = path.join(ROOT, "episodes", episodeName);
const storyboardPath = path.join(episodeDir, "storyboard.json");
const imagesDir = path.join(episodeDir, "images");
const promptsCsvPath = path.join(episodeDir, "prompts.csv");

if (!fs.existsSync(storyboardPath)) {
  console.error(`Missing storyboard.json in ${episodeDir}`);
  process.exit(1);
}

fs.mkdirSync(imagesDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const targetWidth = manifest.videoSettings?.width || 1080;
const targetHeight = manifest.videoSettings?.height || 1920;

function probeImage(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (stat.size < 1000) return null;
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", filePath],
    { encoding: "utf8" }
  );
  if (result.status !== 0) return null;
  const parts = result.stdout.trim().split("x").map(Number);
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    return { width: parts[0], height: parts[1], size: stat.size };
  }
  return null;
}

function normalizeImageToTarget(srcPath, destPath) {
  const res = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      srcPath,
      "-vf",
      `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`,
      destPath
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) {
    throw new Error(`FFmpeg scaling failed for ${srcPath}: ${res.stderr}`);
  }
}

console.log(`Checking scene images for episode "${episodeName}" (Target: ${targetWidth}x${targetHeight})...`);

let allReady = true;
const pendingScenes = [];

for (const sc of manifest.scenes) {
  const destPath = path.join(imagesDir, sc.imageFileName);
  const probe = probeImage(destPath);
  if (probe && probe.width === targetWidth && probe.height === targetHeight) {
    console.log(`[PASS] ${sc.sceneId} (${sc.imageFileName}): Ready (${probe.width}x${probe.height}, ${probe.size} bytes)`);
    sc.status = "ready";
  } else if (probe) {
    console.log(`[NORMALIZE] ${sc.sceneId} (${sc.imageFileName}): Resizing from ${probe.width}x${probe.height} to ${targetWidth}x${targetHeight}...`);
    const tempPath = `${destPath}.tmp.png`;
    fs.copyFileSync(destPath, tempPath);
    normalizeImageToTarget(tempPath, destPath);
    fs.rmSync(tempPath, { force: true });
    sc.status = "ready";
  } else {
    console.log(`[MISSING] ${sc.sceneId} (${sc.imageFileName}): Not found or invalid`);
    sc.status = "missing";
    allReady = false;
    pendingScenes.push(sc);
  }
}

// Update storyboard.json
manifest.updatedAt = new Date().toISOString();
fs.writeFileSync(storyboardPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(`\nImage status summary: ${manifest.scenes.length - pendingScenes.length}/${manifest.scenes.length} ready.`);
if (pendingScenes.length > 0) {
  console.log(`Pending scenes needing image generation: ${pendingScenes.map(s => s.sceneId).join(", ")}`);
} else {
  console.log("All scene images are valid and ready for video assembly!");
}

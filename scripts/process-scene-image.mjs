#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [episodeName, sceneNumber, srcPath] = process.argv.slice(2);

if (!episodeName || !sceneNumber || !srcPath) {
  console.error("Usage: node scripts/process-scene-image.mjs <episode> <sceneNum> <srcPath>");
  process.exit(1);
}

const numStr = String(sceneNumber).padStart(3, "0");
const destDir = path.resolve(process.cwd(), "episodes", episodeName, "images");
fs.mkdirSync(destDir, { recursive: true });
const destPath = path.join(destDir, `scene_${numStr}.png`);

console.log(`Processing Scene ${sceneNumber}: ${srcPath} -> ${destPath}`);

const res = spawnSync("ffmpeg", [
  "-y",
  "-i", srcPath,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
  destPath
], { encoding: "utf8" });

if (res.status !== 0) {
  console.error("FFmpeg image normalization failed:", res.stderr);
  process.exit(1);
}

const probe = spawnSync("ffprobe", [
  "-v", "error",
  "-select_streams", "v:0",
  "-show_entries", "stream=width,height",
  "-of", "csv=s=x:p=0",
  destPath
], { encoding: "utf8" });

console.log(`Result: ${probe.stdout.trim()}, size: ${fs.statSync(destPath).size} bytes`);

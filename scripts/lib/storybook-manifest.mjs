import fs from "node:fs";
import path from "node:path";
import { csvRow, readCsv } from "./csv.mjs";

/**
 * Storyboard Manifest Manager
 * Handles reading, validating, and synchronizing storyboard.json with
 * script.csv, prompts.csv, and brief.json according to book-video standards.
 */

export const STORYBOARD_SCHEMA_VERSION = "1.0.0";

export function createDefaultStoryboard({
  episodeId,
  title,
  displayTitle,
  author = "Traditional Fable",
  targetDuration = 60.0,
  width = 1080,
  height = 1920,
  fps = 30,
  language = "hi-IN",
  voiceProfile = "hi-IN-MadhurNeural",
  bgm = "起风了.mp3",
  scenes = []
}) {
  return {
    schemaVersion: STORYBOARD_SCHEMA_VERSION,
    episodeId,
    title,
    displayTitle: displayTitle || title,
    author,
    targetDuration,
    videoSettings: {
      width,
      height,
      aspectRatio: "9:16",
      fps,
      totalFrames: Math.round(targetDuration * fps),
      videoCodec: "libx264",
      audioCodec: "aac",
      pixFmt: "yuv420p"
    },
    audioSettings: {
      language,
      voiceProfile,
      bgmTrack: bgm,
      bgmBaseVolume: 0.22,
      speechVolume: 1.0,
      duckingGainDb: -14.0
    },
    scenes: scenes.map((sc, idx) => ({
      sceneIndex: idx + 1,
      sceneId: sc.sceneId || `scene_${String(idx + 1).padStart(3, "0")}`,
      imageFileName: sc.imageFileName || `scene_${String(idx + 1).padStart(3, "0")}.png`,
      prompt: sc.prompt || "",
      styleReference: "Warm watercolor and gouache storybook illustration, rich textured paper, soft lighting, vibrant earthy palette, clean vertical 9:16 composition",
      narrationText: sc.narrationText || "",
      plannedDuration: sc.plannedDuration || (targetDuration / Math.max(1, scenes.length)),
      actualDuration: sc.actualDuration || null,
      timeRange: sc.timeRange || { start: 0, end: 0 },
      cameraMotion: sc.cameraMotion || {
        type: idx % 4 === 0 ? "slow_zoom_in" : idx % 4 === 1 ? "pan_left_to_right" : idx % 4 === 2 ? "slow_zoom_out" : "pan_right_to_left",
        zoomStart: 1.0,
        zoomEnd: 1.08,
        transition: idx === 0 ? "fade" : "fade",
        transitionDuration: 0.5
      },
      status: sc.status || "pending"
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function validateStoryboardManifest(manifest) {
  const errors = [];
  if (!manifest) {
    return { valid: false, errors: ["Manifest is null or undefined"] };
  }
  if (!manifest.episodeId) errors.push("Missing episodeId");
  if (!manifest.title) errors.push("Missing title");
  if (!manifest.videoSettings || manifest.videoSettings.width !== 1080 || manifest.videoSettings.height !== 1920) {
    errors.push("videoSettings must specify 1080x1920 canvas");
  }
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    errors.push("Storyboard must contain at least one scene");
  } else {
    manifest.scenes.forEach((sc, idx) => {
      if (!sc.sceneId) errors.push(`Scene ${idx + 1} missing sceneId`);
      if (!sc.imageFileName) errors.push(`Scene ${idx + 1} missing imageFileName`);
      if (!sc.prompt) errors.push(`Scene ${idx + 1} missing prompt`);
      if (!sc.narrationText) errors.push(`Scene ${idx + 1} missing narrationText`);
    });
  }
  return { valid: errors.length === 0, errors };
}

export function syncStoryboardToEpisodeDir(manifest, episodeDir) {
  const validation = validateStoryboardManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Storyboard validation failed: ${validation.errors.join(", ")}`);
  }

  fs.mkdirSync(episodeDir, { recursive: true });
  fs.mkdirSync(path.join(episodeDir, "images"), { recursive: true });
  fs.mkdirSync(path.join(episodeDir, "audio"), { recursive: true });
  fs.mkdirSync(path.join(episodeDir, "renders"), { recursive: true });

  // 1. Write storyboard.json atomically
  const storyboardPath = path.join(episodeDir, "storyboard.json");
  const tempStoryboard = `${storyboardPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempStoryboard, JSON.stringify(manifest, null, 2), "utf8");
  fs.renameSync(tempStoryboard, storyboardPath);

  // 2. Write brief.json
  const briefPath = path.join(episodeDir, "brief.json");
  const brief = {
    bookId: manifest.episodeId,
    title: manifest.title,
    display_title: manifest.displayTitle || manifest.title,
    author: manifest.author || "Traditional Fable",
    voice_profile: manifest.audioSettings.voiceProfile,
    target_duration: manifest.targetDuration,
    canvas: { width: 1080, height: 1920, fps: 30 },
    language: manifest.audioSettings.language,
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), "utf8");

  // 3. Write script.csv
  // Row 1 is title (order=1), subsequent rows are narration chunks (order=2..)
  const scriptPath = path.join(episodeDir, "script.csv");
  const scriptHeaders = ["order", "version", "text", "duration_hint"];
  const scriptRows = [
    [1, "A", manifest.displayTitle || manifest.title, 3.0]
  ];
  manifest.scenes.forEach((sc, idx) => {
    scriptRows.push([
      idx + 2,
      "A",
      sc.narrationText.replace(/[\r\n]+/g, " ").trim(),
      Number((sc.actualDuration || sc.plannedDuration || 4.5).toFixed(2))
    ]);
  });
  const csvContent = [csvRow(scriptHeaders), ...scriptRows.map(r => csvRow(r))].join("\n") + "\n";
  fs.writeFileSync(scriptPath, csvContent, "utf8");

  // 4. Write prompts.csv
  const promptsPath = path.join(episodeDir, "prompts.csv");
  const promptHeaders = ["scene_id", "filename", "status", "prompt"];
  const promptRows = manifest.scenes.map(sc => [
    sc.sceneId,
    sc.imageFileName,
    sc.status,
    sc.prompt.replace(/[\r\n]+/g, " ").trim()
  ]);
  const promptsCsv = [csvRow(promptHeaders), ...promptRows.map(r => csvRow(r))].join("\n") + "\n";
  fs.writeFileSync(promptsPath, promptsCsv, "utf8");

  return { storyboardPath, briefPath, scriptPath, promptsPath };
}

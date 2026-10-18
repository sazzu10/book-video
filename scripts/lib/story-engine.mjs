/**
 * Story Intelligence Engine V4
 * Supports multi-genre original story generation:
 * - Mystery, suspense and surprising twists
 * - Emotional and inspirational narratives
 * - Moral folklore and human-interest stories
 * - Fantasy, adventure and relatable everyday situations
 */

import fs from "node:fs";
import path from "node:path";

export const STORY_GENRES = [
  "mystery_suspense",
  "emotional_inspirational",
  "moral_folklore",
  "fantasy_adventure",
  "everyday_relatable"
];

export class StoryEngine {
  constructor(options = {}) {
    this.rootDir = options.rootDir || path.resolve(process.cwd());
    this.historyPath = path.join(this.rootDir, "episodes", "concept-history.json");
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        this.history = JSON.parse(fs.readFileSync(this.historyPath, "utf8"));
      } else {
        this.history = { generatedEpisodes: [], lastUpdated: new Date().toISOString() };
      }
    } catch {
      this.history = { generatedEpisodes: [], lastUpdated: new Date().toISOString() };
    }
  }

  saveHistory() {
    try {
      fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
      this.history.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), "utf8");
    } catch (err) {
      console.warn("Could not save concept history:", err.message);
    }
  }

  /**
   * Generates a complete structured episode manifest
   */
  generateStory(spec) {
    const {
      title,
      displayTitle,
      genre = "moral_folklore",
      targetDuration = 60,
      scenes
    } = spec;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("Story specification must include scenes array");
    }

    const episodeData = {
      schemaVersion: "4.0.0",
      episodeId: spec.episodeId || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      displayTitle: displayTitle || title,
      genre,
      targetDuration,
      createdAt: new Date().toISOString(),
      videoSettings: {
        width: spec.width || 1080,
        height: spec.height || 1920,
        aspectRatio: spec.aspectRatio || "9:16",
        fps: spec.fps || 30
      },
      audioSettings: {
        language: "hi-IN",
        voiceProfile: spec.voiceProfile || "hi-IN-MadhurNeural",
        bgmTrack: spec.bgmTrack || "如愿.mp3",
        bgmBaseVolume: 0.18,
        speechVolume: 1.0,
        duckingGainDb: -14
      },
      scenes: scenes.map((s, idx) => ({
        sceneIndex: idx + 1,
        sceneId: s.sceneId || `scene_${String(idx + 1).padStart(3, "0")}`,
        imageFileName: s.imageFileName || `scene_${String(idx + 1).padStart(3, "0")}.png`,
        prompt: s.prompt,
        narrationText: s.narrationText,
        plannedDuration: s.plannedDuration || Number((targetDuration / scenes.length).toFixed(2)),
        actualDuration: s.actualDuration || s.plannedDuration || Number((targetDuration / scenes.length).toFixed(2)),
        cameraMotion: s.cameraMotion || { type: "slow_zoom_in" },
        performance: s.performance || {
          emotion: "natural",
          rate: "+35%",
          pitch: "+0Hz",
          pauseSec: 0.15
        },
        sfx: s.sfx || null,
        status: "pending"
      }))
    };

    // Record in history
    this.history.generatedEpisodes.push({
      episodeId: episodeData.episodeId,
      title: episodeData.title,
      genre: episodeData.genre,
      timestamp: episodeData.createdAt
    });
    this.saveHistory();

    return episodeData;
  }
}

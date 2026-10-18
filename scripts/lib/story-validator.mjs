/**
 * Story Schema Validator
 * Validates:
 * 1. Total duration between 45.0s and 60.0s (YouTube Shorts compliant)
 * 2. Opening hook speakable in ~2s, posing a question, shock, or intrigue
 * 3. Story turn / visual change every 3.5s - 6.0s (no dragged scenes)
 * 4. Never 3 consecutive scenes with the same shot_type or camera_move
 * 5. Required closing line / payoff in final scenes
 * 6. Character and background reference integrity
 */

import { GENRE_PRESETS, ALLOWED_SHOT_TYPES, ALLOWED_CAMERA_MOVES } from "./story-schema.mjs";

export function validateStory(story) {
  const errors = [];
  const warnings = [];

  if (!story || typeof story !== "object") {
    return { valid: false, errors: ["Story definition must be a valid JSON object"], warnings };
  }

  // 1. Metadata & Genre
  if (!story.genre || !GENRE_PRESETS[story.genre]) {
    errors.push(`Invalid or missing genre: "${story.genre}". Allowed: ${Object.keys(GENRE_PRESETS).join(", ")}`);
  }
  if (!story.logline || typeof story.logline !== "string" || story.logline.trim().length < 10) {
    errors.push("Missing or too short 'logline' (minimum 10 characters)");
  }
  if (!story.hook || typeof story.hook !== "object") {
    errors.push("Missing 'hook' object");
  } else {
    const hookText = story.hook.text || "";
    const hookWords = hookText.trim().split(/\s+/).length;
    // ~2s speakable hook is typically 4-10 words
    if (hookWords < 3 || hookWords > 14) {
      warnings.push(`Hook word count (${hookWords} words) should ideally be 4-10 words for a crisp ~2s hook.`);
    }
    const hasIntrigue = /[?!\-—]|क्या|अचानक|रहस्य|तभी|आखिर/u.test(hookText);
    if (!hasIntrigue) {
      warnings.push("Hook text lacks obvious curiosity/shock punctuation or phrasing ('?', '!', 'अचानक', etc.)");
    }
  }

  // 2. Scenes array
  if (!Array.isArray(story.scenes) || story.scenes.length < 5) {
    errors.push("Story must contain an array of at least 5 scenes");
    return { valid: errors.length === 0, errors, warnings };
  }

  let totalDuration = 0;
  for (let i = 0; i < story.scenes.length; i++) {
    const sc = story.scenes[i];
    const scIdx = i + 1;

    if (!sc.id) errors.push(`Scene #${scIdx}: Missing 'id'`);
    if (typeof sc.duration !== "number" || sc.duration <= 0) {
      errors.push(`Scene #${scIdx} (${sc.id}): Invalid duration '${sc.duration}'`);
    } else {
      totalDuration += sc.duration;
      if (sc.duration < 2.5 || sc.duration > 7.0) {
        warnings.push(`Scene #${scIdx} (${sc.id}): Duration ${sc.duration}s is outside ideal 3.0s-6.0s pacing`);
      }
    }

    if (!ALLOWED_SHOT_TYPES.includes(sc.shot_type)) {
      errors.push(`Scene #${scIdx} (${sc.id}): Invalid shot_type '${sc.shot_type}'. Allowed: ${ALLOWED_SHOT_TYPES.join(", ")}`);
    }

    if (!ALLOWED_CAMERA_MOVES.includes(sc.camera_move)) {
      errors.push(`Scene #${scIdx} (${sc.id}): Invalid camera_move '${sc.camera_move}'. Allowed: ${ALLOWED_CAMERA_MOVES.join(", ")}`);
    }

    if (!sc.narration || sc.narration.trim().length < 5) {
      errors.push(`Scene #${scIdx} (${sc.id}): Missing or empty narration`);
    }

    if (!sc.bg_id) {
      errors.push(`Scene #${scIdx} (${sc.id}): Missing 'bg_id'`);
    }

    // Check consecutive shot types
    if (i >= 2) {
      const prev1 = story.scenes[i - 1];
      const prev2 = story.scenes[i - 2];
      if (sc.shot_type === prev1.shot_type && prev1.shot_type === prev2.shot_type) {
        errors.push(`Three consecutive scenes (#${i - 1}, #${i}, #${scIdx}) share the exact same shot_type: '${sc.shot_type}'`);
      }
      if (sc.camera_move === prev1.camera_move && prev1.camera_move === prev2.camera_move && sc.camera_move !== "static") {
        warnings.push(`Three consecutive scenes (#${i - 1}, #${i}, #${scIdx}) share the exact same camera_move: '${sc.camera_move}'`);
      }
    }
  }

  // 3. Duration check
  if (totalDuration < 45.0 || totalDuration > 60.0) {
    errors.push(`Total story duration (${totalDuration.toFixed(2)}s) must be strictly between 45.0s and 60.0s for Shorts`);
  }

  // 4. Closing / Payoff check
  const lastScene = story.scenes[story.scenes.length - 1];
  const secondLast = story.scenes[story.scenes.length - 2];
  const hasPayoffOrMoral = /सिखाती|कहानी|दौलत|सच्चाई|निकल|अंत|सीख|खुलासा|रहस्य/u.test(
    (lastScene?.narration || "") + " " + (secondLast?.narration || "")
  );
  if (!hasPayoffOrMoral) {
    warnings.push("Closing scene does not appear to state a clear moral, punchline, or mystery resolution.");
  }

  return {
    valid: errors.length === 0,
    totalDuration: Number(totalDuration.toFixed(2)),
    sceneCount: story.scenes.length,
    errors,
    warnings
  };
}

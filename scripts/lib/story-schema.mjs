/**
 * Story Schema & Genre Presets for AI Story Factory V5
 * Supports: moral, suspense, mystery, motivational, emotional, fantasy
 */

export const GENRE_PRESETS = {
  moral: {
    genre: "moral",
    colorPalette: {
      primary: "#2e7d32",
      accent: "#fbc02d",
      mood: "warm_organic_watercolor"
    },
    pacingWpm: 140,
    voiceDefaults: {
      rate: "+35%",
      pitch: "+0Hz",
      emotion: "warm_moral_closure"
    },
    musicMood: "warm_acoustic_reflective",
    defaultTransition: "fade",
    recommendedSfx: ["water-splash", "magic-chime", "nature_ambience"]
  },
  suspense: {
    genre: "suspense",
    colorPalette: {
      primary: "#1a237e",
      accent: "#b71c1c",
      mood: "dark_cool_atmospheric"
    },
    pacingWpm: 155,
    voiceDefaults: {
      rate: "+38%",
      pitch: "+0Hz",
      emotion: "sudden_crisis"
    },
    musicMood: "tense_drone_heartbeat",
    defaultTransition: "cut",
    recommendedSfx: ["door_creak", "thunder_strike", "clock_ticking", "heavy_breath"]
  },
  mystery: {
    genre: "mystery",
    colorPalette: {
      primary: "#311b92",
      accent: "#00b0ff",
      mood: "shadowy_fog_noir"
    },
    pacingWpm: 145,
    voiceDefaults: {
      rate: "+36%",
      pitch: "+0Hz",
      emotion: "curious_hook"
    },
    musicMood: "eerie_subtle_piano",
    defaultTransition: "dissolve",
    recommendedSfx: ["whisper_wind", "footsteps_gravel", "chime_mystery"]
  },
  motivational: {
    genre: "motivational",
    colorPalette: {
      primary: "#e65100",
      accent: "#ffd600",
      mood: "golden_sunrise_radiant"
    },
    pacingWpm: 150,
    voiceDefaults: {
      rate: "+36%",
      pitch: "+0Hz",
      emotion: "radiant_payoff"
    },
    musicMood: "uplifting_cinematic_strings",
    defaultTransition: "push_left",
    recommendedSfx: ["whoosh_impact", "heartbeat_rise", "triumphant_brass"]
  },
  emotional: {
    genre: "emotional",
    colorPalette: {
      primary: "#4a148c",
      accent: "#f06292",
      mood: "soft_dusk_nostalgic"
    },
    pacingWpm: 130,
    voiceDefaults: {
      rate: "+30%",
      pitch: "+0Hz",
      emotion: "restrained_sorrow"
    },
    musicMood: "gentle_acoustic_cello",
    defaultTransition: "fade",
    recommendedSfx: ["rain_window", "distant_thunder", "sigh"]
  },
  fantasy: {
    genre: "fantasy",
    colorPalette: {
      primary: "#006064",
      accent: "#ff4081",
      mood: "vibrant_magical_glow"
    },
    pacingWpm: 145,
    voiceDefaults: {
      rate: "+36%",
      pitch: "+0Hz",
      emotion: "divine_wonder"
    },
    musicMood: "enchanting_harp_orchestral",
    defaultTransition: "glow_dissolve",
    recommendedSfx: ["magic_sparkle", "celestial_chime", "portal_whoosh"]
  }
};

export const ALLOWED_SHOT_TYPES = [
  "wide",
  "medium",
  "close",
  "insert",
  "low-angle",
  "over-shoulder",
  "POV"
];

export const ALLOWED_CAMERA_MOVES = [
  "static",
  "zoom_in",
  "zoom_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "hook_reveal",
  "crisis_snap",
  "dynamic_tracking"
];

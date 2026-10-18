/**
 * ASS Subtitle Generator for Storybook Videos
 * Produces broadcast-quality ASS subtitles with HarfBuzz Devanagari shaping,
 * responsive multi-line phrase balancing, and mobile vertical-video safe margins.
 */

import fs from "node:fs";

export function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const centis = Math.floor((s - Math.floor(s)) * 100);
  return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export function balanceHindiPhrase(text, maxCharsPerLine = 28) {
  const clean = text.replace(/[\r\n]+/g, " ").trim();
  if (clean.length <= maxCharsPerLine) {
    return clean;
  }

  // Split on natural Hindi pause punctuation first (comma, em-dash, exclamation, danda)
  const punctMatch = clean.match(/^(.*?[,—!|।])\s*(.+)$/u);
  if (punctMatch && punctMatch[1].length <= maxCharsPerLine + 6 && punctMatch[2].length <= maxCharsPerLine + 6) {
    return `${punctMatch[1]}\\N${punctMatch[2]}`;
  }

  // Otherwise split at the middle-most word space
  const words = clean.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");
  return `${line1}\\N${line2}`;
}

export function generateAssSubtitleFile({
  captions = [],
  outputPath,
  fontName = "Noto Sans Devanagari",
  fontSize = 44,
  marginV = 280,
  marginL = 80,
  marginR = 80
}) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: StoryDefault,${fontName},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,3.5,2.0,2,${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = captions.map((cap) => {
    const start = formatAssTime(cap.start);
    const end = formatAssTime(cap.end);
    const balancedText = balanceHindiPhrase(cap.text);
    return `Dialogue: 0,${start},${end},StoryDefault,,0,0,0,,${balancedText}`;
  }).join("\n");

  const fullContent = header + events + "\n";
  fs.writeFileSync(outputPath, fullContent, "utf8");
  return outputPath;
}

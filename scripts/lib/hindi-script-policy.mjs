/**
 * Hindi / Hinglish Script Policy Validator
 * Validates script.csv rows for Hindi story narration while respecting
 * natural word spacing and Devanagari typography.
 */

export const MAX_SCENE_COUNT = 24;
export const MIN_SCENE_COUNT = 2;
export const MAX_LINE_CHARS = 140;

export function validateHindiScript(rows, { episodeTitle = "" } = {}) {
  const errors = [];
  const lines = rows.length;

  if (lines < MIN_SCENE_COUNT) {
    errors.push(`Script must have at least ${MIN_SCENE_COUNT} rows (title + narration), found ${lines}`);
  }

  const rawOrders = rows.map((row) => String(row.order ?? "").trim());
  const orders = rawOrders.map(Number);
  const validOrderSequence =
    rawOrders.every((order) => /^\d+$/u.test(order)) &&
    orders.every(Number.isSafeInteger) &&
    new Set(orders).size === lines &&
    [...orders].sort((a, b) => a - b).every((order, index) => order === index + 1);

  if (!validOrderSequence) {
    errors.push(`Row orders must be unique and strictly sequential 1..${lines}`);
  }

  // Row 1 is title
  if (rows.length > 0) {
    const titleText = String(rows[0].text || "").trim();
    if (!titleText) {
      errors.push("Row 1 (title) cannot be empty");
    }
  }

  // Body rows validation
  const bodyRows = rows.slice(1);
  bodyRows.forEach((row) => {
    const text = String(row.text || "").trim();
    if (!text) {
      errors.push(`Row ${row.order} has empty narration text`);
    }
    if (text.length > MAX_LINE_CHARS) {
      errors.push(`Row ${row.order} exceeds maximum length of ${MAX_LINE_CHARS} characters (${text.length} chars)`);
    }
    // Check for unwanted formatting artifacts or markdown
    if (/[<>{}[\]\\#*`~]/u.test(text)) {
      errors.push(`Row ${row.order} contains invalid markdown or formatting characters: "${text}"`);
    }
  });

  return {
    lines,
    bodyLines: bodyRows.length,
    valid: errors.length === 0,
    errors
  };
}

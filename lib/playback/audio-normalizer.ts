/**
 * lib/playback/audio-normalizer.ts
 *
 * Normalization utilities, ISO language mappings, and preference storage
 * for CHILLER Player Experience 3.0 Multi-Language Audio.
 */

export interface NormalizedAudioTrack {
  id: string | number;
  languageCode: string; // ISO 639-1 / 639-2 (e.g. "en", "hi", "ja")
  languageName: string; // Human-friendly (e.g. "English", "Hindi", "Japanese")
  label: string;        // Full descriptive label (e.g. "English (Original)", "Hindi (Dub)")
  isDefault?: boolean;
  isOriginal?: boolean;
  isDubbed?: boolean;
  channels?: number;    // e.g. 2 for Stereo, 6 for 5.1
}

export type AudioTrackStatus =
  | "INITIALIZING"
  | "TRACKS_AVAILABLE"
  | "SWITCH_REQUESTED"
  | "SWITCH_CONFIRMED"
  | "SWITCH_FAILED"
  | "UNSUPPORTED"
  | "UNKNOWN";

// Standard ISO-639 to English mapping
const ISO_LANGUAGES: Record<string, string> = {
  en: "English",
  eng: "English",
  "en-us": "English",
  "en-gb": "English",
  hi: "Hindi",
  hin: "Hindi",
  "hi-in": "Hindi",
  ja: "Japanese",
  jpn: "Japanese",
  "ja-jp": "Japanese",
  ko: "Korean",
  kor: "Korean",
  "ko-kr": "Korean",
  zh: "Chinese",
  zho: "Chinese",
  chi: "Chinese",
  "zh-cn": "Chinese (Mandarin)",
  "zh-tw": "Chinese (Taiwan)",
  es: "Spanish",
  spa: "Spanish",
  "es-es": "Spanish (Spain)",
  "es-la": "Spanish (Latin America)",
  fr: "French",
  fra: "French",
  fre: "French",
  de: "German",
  deu: "German",
  ger: "German",
  it: "Italian",
  ita: "Italian",
  pt: "Portuguese",
  por: "Portuguese",
  "pt-br": "Portuguese (Brazil)",
  ru: "Russian",
  rus: "Russian",
  bn: "Bengali",
  ben: "Bengali",
  as: "Assamese",
  asm: "Assamese",
  ta: "Tamil",
  tam: "Tamil",
  te: "Telugu",
  tel: "Telugu",
  ml: "Malayalam",
  mal: "Malayalam",
  mr: "Marathi",
  mar: "Marathi",
  gu: "Gujarati",
  guj: "Gujarati",
  kn: "Kannada",
  kan: "Kannada",
  pa: "Punjabi",
  pan: "Punjabi",
  ur: "Urdu",
  urd: "Urdu",
  ar: "Arabic",
  ara: "Arabic",
  tr: "Turkish",
  tur: "Turkish",
  vi: "Vietnamese",
  vie: "Vietnamese",
  th: "Thai",
  tha: "Thai",
  id: "Indonesian",
  ind: "Indonesian",
  ms: "Malay",
  may: "Malay",
  nl: "Dutch",
  nld: "Dutch",
  pl: "Polish",
  pol: "Polish",
  sv: "Swedish",
  swe: "Swedish",
  no: "Norwegian",
  nor: "Norwegian",
  da: "Danish",
  dan: "Danish",
  fi: "Finnish",
  fin: "Finnish",
  el: "Greek",
  ell: "Greek",
  he: "Hebrew",
  heb: "Hebrew",
  uk: "Ukrainian",
  ukr: "Ukrainian",
};

/**
 * Normalizes a raw language code or string into a clean standard language code and friendly name.
 */
export function normalizeLanguage(codeOrName?: string): { code: string; name: string } {
  if (!codeOrName || typeof codeOrName !== "string") {
    return { code: "und", name: "Unknown Language" };
  }

  const clean = codeOrName.trim().toLowerCase();

  // Direct lookup
  if (ISO_LANGUAGES[clean]) {
    const code = clean.split(/[-_]/)[0];
    return { code, name: ISO_LANGUAGES[clean] };
  }

  // Check prefix before dash (e.g. en-US -> en)
  const base = clean.split(/[-_]/)[0];
  if (ISO_LANGUAGES[base]) {
    return { code: base, name: ISO_LANGUAGES[base] };
  }

  // Capitalize raw input if not matched
  const capitalized = codeOrName.charAt(0).toUpperCase() + codeOrName.slice(1);
  return { code: clean, name: capitalized };
}

/**
 * Normalizes a raw audio track array from HLS.js, native video, or provider event.
 * Filters invalid items, deduplicates, and preserves distinct channel descriptions.
 */
export function normalizeAudioTracks(rawTracks: any[]): NormalizedAudioTrack[] {
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    return [];
  }

  const normalized: NormalizedAudioTrack[] = [];
  const seenKeys = new Set<string>();

  rawTracks.forEach((track, index) => {
    if (!track) return;

    const rawLang = track.lang || track.language || track.languageCode || track.code || "";
    const rawName = track.name || track.label || track.title || "";
    const id = track.id !== undefined && track.id !== null ? track.id : index;

    const { code, name } = normalizeLanguage(rawLang || rawName);

    // Build label
    let label = rawName || name;
    if (track.channels && track.channels > 2) {
      label += track.channels === 6 ? " (5.1)" : ` (${track.channels}ch)`;
    }

    const key = `${code}-${label.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      normalized.push({
        id,
        languageCode: code,
        languageName: name,
        label,
        isDefault: Boolean(track.default || track.isDefault),
        isOriginal: Boolean(track.isOriginal || rawName.toLowerCase().includes("original")),
        isDubbed: Boolean(track.isDubbed || rawName.toLowerCase().includes("dub")),
        channels: track.channels,
      });
    }
  });

  return normalized;
}

const PREFERRED_AUDIO_STORAGE_KEY = "chiller_preferred_audio";

/**
 * Retrieves the user's preferred audio language code (e.g. "hi", "en", "ja").
 */
export function getStoredAudioPreference(): string {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem(PREFERRED_AUDIO_STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

/**
 * Saves the user's preferred audio language code.
 */
export function setStoredAudioPreference(langCode: string): void {
  if (typeof window === "undefined" || !langCode) return;
  try {
    localStorage.setItem(PREFERRED_AUDIO_STORAGE_KEY, langCode.toLowerCase());
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Determines the best audio track to select given available tracks and preference.
 * Priority:
 * 1. User's saved preference
 * 2. English if an actual English track exists
 * 3. Original track if flagged
 * 4. Provider default track (or first available track)
 */
export function selectBestAudioTrack(
  availableTracks: NormalizedAudioTrack[],
  preferredCode = getStoredAudioPreference()
): NormalizedAudioTrack | null {
  if (!availableTracks || availableTracks.length === 0) return null;

  const pref = preferredCode.toLowerCase();

  // 1. User's saved preference
  const prefMatch = availableTracks.find(
    (t) => t.languageCode.toLowerCase() === pref || t.languageName.toLowerCase() === pref
  );
  if (prefMatch) return prefMatch;

  // 2. English if actual English track exists
  const engMatch = availableTracks.find((t) => t.languageCode.toLowerCase() === "en");
  if (engMatch) return engMatch;

  // 3. Original track if available
  const origMatch = availableTracks.find((t) => t.isOriginal);
  if (origMatch) return origMatch;

  // 4. Default track
  const defMatch = availableTracks.find((t) => t.isDefault);
  if (defMatch) return defMatch;

  // 5. First available
  return availableTracks[0];
}

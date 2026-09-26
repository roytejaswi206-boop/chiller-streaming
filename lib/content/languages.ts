/**
 * CHILLER Language Catalog
 * Comprehensive list of languages supported by discovery, metadata, and regional streaming.
 */

export interface LanguageDefinition {
  slug: string;
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

export const LANGUAGES: LanguageDefinition[] = [
  { slug: "hindi", code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { slug: "english", code: "en", name: "English", nativeName: "English", flag: "🌐" },
  { slug: "bengali", code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { slug: "tamil", code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { slug: "telugu", code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { slug: "malayalam", code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { slug: "kannada", code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { slug: "marathi", code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { slug: "punjabi", code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { slug: "urdu", code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰" },
  { slug: "korean", code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { slug: "japanese", code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { slug: "chinese", code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { slug: "spanish", code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { slug: "french", code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { slug: "german", code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { slug: "italian", code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { slug: "arabic", code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇦🇪" },
  { slug: "turkish", code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { slug: "indonesian", code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { slug: "thai", code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { slug: "vietnamese", code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { slug: "portuguese", code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { slug: "russian", code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
];

export const LANGUAGE_MAP: Record<string, LanguageDefinition> = LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.slug.toLowerCase()] = lang;
    acc[lang.code.toLowerCase()] = lang;
    return acc;
  },
  {} as Record<string, LanguageDefinition>
);

export function getLanguageBySlug(slug: string): LanguageDefinition | undefined {
  return LANGUAGE_MAP[slug.toLowerCase()];
}

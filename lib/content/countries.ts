/**
 * CHILLER Regional & Country Catalog
 * Regional discovery nodes for international streaming catalogues.
 */

export interface CountryDefinition {
  slug: string;
  code: string;
  name: string;
  tagline: string;
  flag: string;
  primaryLang?: string;
  popularGenres?: string[];
}

export const COUNTRIES: CountryDefinition[] = [
  { slug: "india", code: "IN", name: "India", tagline: "Bollywood, Tollywood, Kollywood & Regional Cinema", flag: "🇮🇳", primaryLang: "hi" },
  { slug: "united-states", code: "US", name: "United States", tagline: "Hollywood Blockbusters & Award-Winning Series", flag: "🇺🇸", primaryLang: "en" },
  { slug: "korea", code: "KR", name: "South Korea", tagline: "K-Drama, Hallyu Wave & Thrillers", flag: "🇰🇷", primaryLang: "ko" },
  { slug: "japan", code: "JP", name: "Japan", tagline: "Anime, J-Horror & Cult Classics", flag: "🇯🇵", primaryLang: "ja" },
  { slug: "united-kingdom", code: "GB", name: "United Kingdom", tagline: "British Drama, Crime & Mysteries", flag: "🇬🇧", primaryLang: "en" },
  { slug: "china", code: "CN", name: "China", tagline: "C-Drama, Historical Epics & Martial Arts", flag: "🇨🇳", primaryLang: "zh" },
  { slug: "france", code: "FR", name: "France", tagline: "French Art Cinema & Romantic Epics", flag: "🇫🇷", primaryLang: "fr" },
  { slug: "spain", code: "ES", name: "Spain", tagline: "Heist Thrillers, Passion & Drama", flag: "🇪🇸", primaryLang: "es" },
  { slug: "canada", code: "CA", name: "Canada", tagline: "North American Indie & Series", flag: "🇨🇦", primaryLang: "en" },
  { slug: "germany", code: "DE", name: "Germany", tagline: "Dark Thrillers, History & Mystery", flag: "🇩🇪", primaryLang: "de" },
  { slug: "australia", code: "AU", name: "Australia", tagline: "Outback Adventures & Gritty Drama", flag: "🇦🇺", primaryLang: "en" },
  { slug: "turkey", code: "TR", name: "Turkey", tagline: "Dizi Romance, Suspense & Epics", flag: "🇹🇷", primaryLang: "tr" },
  { slug: "italy", code: "IT", name: "Italy", tagline: "Neorealism, Romance & Crime Drama", flag: "🇮🇹", primaryLang: "it" },
  { slug: "indonesia", code: "ID", name: "Indonesia", tagline: "Martial Arts Action & Folk Horror", flag: "🇮🇩", primaryLang: "id" },
  { slug: "philippines", code: "PH", name: "Philippines", tagline: "Pinoy Romance, Comedy & Drama", flag: "🇵🇭", primaryLang: "tl" },
  { slug: "bangladesh", code: "BD", name: "Bangladesh", tagline: "Dhallywood Stories & Drama", flag: "🇧🇩", primaryLang: "bn" },
  { slug: "pakistan", code: "PK", name: "Pakistan", tagline: "Urdu Dramas & Cinematic Gems", flag: "🇵🇰", primaryLang: "ur" },
  { slug: "nigeria", code: "NG", name: "Nigeria", tagline: "Nollywood Energy & Storytelling", flag: "🇳🇬", primaryLang: "en" },
  { slug: "egypt", code: "EG", name: "Egypt", tagline: "Arabic Cinema, Comedy & Epics", flag: "🇪🇬", primaryLang: "ar" },
  { slug: "thailand", code: "TH", name: "Thailand", tagline: "Thai Horror, Action & Lakorn", flag: "🇹🇭", primaryLang: "th" },
  { slug: "brazil", code: "BR", name: "Brazil", tagline: "Telenovelas, Gritty Drama & Thrillers", flag: "🇧🇷", primaryLang: "pt" },
  { slug: "mexico", code: "MX", name: "Mexico", tagline: "Latin Drama, Suspense & Folklore", flag: "🇲🇽", primaryLang: "es" },
];

export const COUNTRY_MAP: Record<string, CountryDefinition> = COUNTRIES.reduce(
  (acc, c) => {
    acc[c.slug.toLowerCase()] = c;
    acc[c.code.toLowerCase()] = c;
    return acc;
  },
  {
    // Aliases for user convenience
    usa: COUNTRIES[1],
    us: COUNTRIES[1],
    uk: COUNTRIES[4],
  } as Record<string, CountryDefinition>
);

export function getCountryBySlug(slug: string): CountryDefinition | undefined {
  return COUNTRY_MAP[slug.toLowerCase()];
}

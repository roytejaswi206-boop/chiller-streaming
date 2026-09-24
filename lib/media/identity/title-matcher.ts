/**
 * lib/media/identity/title-matcher.ts
 *
 * CHILLER TITLE MATCHER & NORMALIZATION ENGINE
 *
 * Provides:
 * 1. Title normalization (clean punctuation, case, whitespace, roman numerals)
 * 2. Abbreviation resolution (AoT, MHA, BNHA, JJK, OP, DBZ, FMAB, etc.)
 * 3. Multi-language similarity scoring (Dice coefficient + word overlap)
 */

import { TitleSet } from "./types";

const KNOWN_ABBREVIATIONS: Record<string, string[]> = {
  aot: ["Attack on Titan", "Shingeki no Kyojin"],
  snk: ["Shingeki no Kyojin", "Attack on Titan"],
  mha: ["My Hero Academia", "Boku no Hero Academia"],
  bnha: ["Boku no Hero Academia", "My Hero Academia"],
  jjk: ["Jujutsu Kaisen"],
  op: ["One Piece"],
  ds: ["Kimetsu no Yaiba", "Demon Slayer: Kimetsu no Yaiba", "Demon Slayer"],
  "demon slayer": ["Kimetsu no Yaiba", "Demon Slayer: Kimetsu no Yaiba"],
  "demon slayer kimetsu no yaiba": ["Kimetsu no Yaiba", "Demon Slayer"],
  dbz: ["Dragon Ball Z"],
  dbs: ["Dragon Ball Super"],
  sao: ["Sword Art Online"],
  fmab: ["Fullmetal Alchemist: Brotherhood", "Hagane no Renkinjutsushi"],
  hxh: ["Hunter x Hunter", "Hunter x Hunter (2011)"],
  "hunter x hunter": ["Hunter x Hunter", "Hunter x Hunter (2011)"],
  csm: ["Chainsaw Man"],
  kny: ["Kimetsu no Yaiba", "Demon Slayer"],
  sl: ["Solo Leveling", "Ore dake Level Up na Ken"],
  frieren: ["Sousou no Frieren", "Frieren: Beyond Journey's End"],
  "frieren beyond journeys end": ["Sousou no Frieren", "Frieren"],
  pokemon: ["Pocket Monsters", "Pokemon", "Pokémon"],
  pokémon: ["Pocket Monsters", "Pokemon", "Pokémon"],
  doraemon: ["Doraemon"],
  haikyu: ["Haikyu!!", "Haikyuu!!"],
  haikyuu: ["Haikyu!!", "Haikyuu!!"],
  "attack on titan": ["Attack on Titan", "Shingeki no Kyojin"],
  "my hero academia": ["My Hero Academia", "Boku no Hero Academia"],
  "fullmetal alchemist brotherhood": ["Fullmetal Alchemist: Brotherhood", "Hagane no Renkinjutsushi"],
};

/**
 * Normalizes title for consistent comparison.
 */
export function normalizeTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  return rawTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .replace(/[’']/g, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\b(part|season|cour|vol|volume)\s+(\d+)\b/gi, "s$2")
    .replace(/\b(ii|2)\b/gi, "2")
    .replace(/\b(iii|3)\b/gi, "3")
    .replace(/\b(iv|4)\b/gi, "4")
    .replace(/\b(v|5)\b/gi, "5")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates Sorensen-Dice bigram similarity coefficient (0 to 1).
 */
export function calculateTitleSimilarity(a: string, b: string): number {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  // Exact substring match
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return Math.max(0.85, minLen / maxLen);
  }

  // Bigram creation
  const getBigrams = (str: string): Set<string> => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.slice(i, i + 2));
    }
    return s;
  };

  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  const dice = (2 * intersection) / (bigramsA.size + bigramsB.size);
  return Number(dice.toFixed(3));
}

/**
 * Expands common anime abbreviations into canonical candidate search queries.
 */
export function expandAbbreviations(query: string): string[] {
  const clean = query.trim().toLowerCase();
  const direct = KNOWN_ABBREVIATIONS[clean];
  if (direct) {
    return [query, ...direct];
  }
  return [query];
}

/**
 * Matches a query against a full title set, returning the best match score and matched title.
 */
export function matchAgainstTitleSet(
  query: string,
  titles: TitleSet
): { score: number; matchedTitle: string; isExact: boolean } {
  const normQuery = normalizeTitle(query);
  const allCandidates: string[] = [
    titles.canonicalTitle,
    titles.englishTitle || "",
    titles.romajiTitle || "",
    titles.nativeTitle || "",
    ...titles.synonyms,
    ...(titles.abbreviations || []),
  ].filter(Boolean);

  let bestScore = 0;
  let bestTitle = titles.canonicalTitle;

  for (const candidate of allCandidates) {
    const normCand = normalizeTitle(candidate);
    if (normCand === normQuery) {
      return { score: 1.0, matchedTitle: candidate, isExact: true };
    }

    const sim = calculateTitleSimilarity(query, candidate);
    if (sim > bestScore) {
      bestScore = sim;
      bestTitle = candidate;
    }
  }

  return {
    score: bestScore,
    matchedTitle: bestTitle,
    isExact: bestScore >= 0.98,
  };
}

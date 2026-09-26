export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function getGenreNames(genreIds?: number[]): string[] {
  if (!genreIds) return [];
  return genreIds.map((id) => TMDB_GENRES[id]).filter(Boolean);
}

// Genre Slug to TMDB IDs mapping (movies and TV) - client-safe
export const GENRE_SLUG_MAP: Record<string, { movie: number; tv: number; name: string }> = {
  action: { movie: 28, tv: 10759, name: "Action" },
  adventure: { movie: 12, tv: 10759, name: "Adventure" },
  animation: { movie: 16, tv: 16, name: "Animation" },
  comedy: { movie: 35, tv: 35, name: "Comedy" },
  crime: { movie: 80, tv: 80, name: "Crime" },
  documentary: { movie: 99, tv: 99, name: "Documentary" },
  drama: { movie: 18, tv: 18, name: "Drama" },
  family: { movie: 10751, tv: 10751, name: "Family" },
  fantasy: { movie: 14, tv: 10765, name: "Fantasy" },
  history: { movie: 36, tv: 18, name: "History" },
  horror: { movie: 27, tv: 9648, name: "Horror" },
  music: { movie: 10402, tv: 10402, name: "Music" },
  mystery: { movie: 9648, tv: 9648, name: "Mystery" },
  romance: { movie: 10749, tv: 10749, name: "Romance" },
  scifi: { movie: 878, tv: 10765, name: "Sci-Fi" },
  thriller: { movie: 53, tv: 9648, name: "Thriller" },
  war: { movie: 10752, tv: 10768, name: "War" },
  western: { movie: 37, tv: 37, name: "Western" },
};

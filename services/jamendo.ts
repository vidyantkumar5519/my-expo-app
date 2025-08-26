export type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  image?: string; // album/track image
  audio?: string; // mp3 url
  audiodownload?: string; // downloadable url (if allowed)
  duration?: number; // seconds
};

export type JamendoResponse = {
  headers: any;
  results: JamendoTrack[];
};

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

export async function jamendoSearchTracks(clientId: string, term: string, limit = 25): Promise<JamendoTrack[]> {
  const q = encodeURIComponent(term.trim());
  if (!q) return [];
  const url = `${JAMENDO_BASE}/tracks/?client_id=${clientId}&format=jsonpretty&include=musicinfo+stats&fuzzytags=0&namesearch=${q}&limit=${limit}&audioformat=mp31`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jamendo search failed: ${res.status}`);
  const data = (await res.json()) as { results: JamendoTrack[] };
  return data.results || [];
}

export async function jamendoFeatured(clientId: string, limit = 25): Promise<JamendoTrack[]> {
  const url = `${JAMENDO_BASE}/tracks/?client_id=${clientId}&format=jsonpretty&order=popularity_total&limit=${limit}&audioformat=mp31`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jamendo featured failed: ${res.status}`);
  const data = (await res.json()) as { results: JamendoTrack[] };
  return data.results || [];
}

// Helper to normalize to the same shape MusicPlayer expects (like iTunes)
export function normalizeJamendoToITunesShape(items: JamendoTrack[]) {
  return items.map((t) => ({
    trackId: Number(t.id) || Math.random(),
    trackName: t.name,
    artistName: t.artist_name,
    collectionName: t.album_name,
    artworkUrl100: t.image,
    previewUrl: t.audio || t.audiodownload,
    trackTimeMillis: (t.duration ?? 0) * 1000,
  }));
}

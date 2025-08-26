export type ITunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string; // 30s preview
  trackTimeMillis?: number;
};

export type ITunesSearchResponse = {
  resultCount: number;
  results: ITunesTrack[];
};

export async function searchTracks(term: string, limit = 25): Promise<ITunesTrack[]> {
  const q = encodeURIComponent(term.trim());
  if (!q) return [];
  const url = `https://itunes.apple.com/search?term=${q}&media=music&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = (await res.json()) as ITunesSearchResponse;
  // Filter only items with preview
  return (data.results || []).filter((r) => r.previewUrl);
}

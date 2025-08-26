export type AudiusUser = {
  id: string;
  handle: string;
  name: string;
};

export type AudiusTrack = {
  id: string;
  title: string;
  duration: number; // seconds
  artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string } | null;
  user: AudiusUser;
};

const DISCOVERY = 'https://discoveryprovider.audius.co';
const APP_NAME = 'VibeTunes';

export async function audiusSearch(term: string, limit = 25): Promise<AudiusTrack[]> {
  const q = encodeURIComponent(term.trim());
  if (!q) return [];
  const url = `${DISCOVERY}/v1/tracks/search?query=${q}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audius search failed: ${res.status}`);
  const data = (await res.json()) as { data: AudiusTrack[] };
  return data.data || [];
}

export async function audiusTrending(limit = 25): Promise<AudiusTrack[]> {
  const url = `${DISCOVERY}/v1/tracks/trending?limit=${limit}&time=week`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audius trending failed: ${res.status}`);
  const data = (await res.json()) as { data: AudiusTrack[] };
  return data.data || [];
}

export function audiusStreamUrl(id: string) {
  return `${DISCOVERY}/v1/tracks/${id}/stream?app_name=${encodeURIComponent(APP_NAME)}`;
}

export function normalizeAudiusToITunesShape(items: AudiusTrack[]) {
  return items.map((t) => {
    const artwork = t.artwork?.['1000x1000'] || t.artwork?.['480x480'] || t.artwork?.['150x150'];
    return {
      trackId: Number(t.id) || Math.random(),
      trackName: t.title,
      artistName: t.user?.name || t.user?.handle,
      collectionName: undefined as string | undefined,
      artworkUrl100: artwork,
      previewUrl: audiusStreamUrl(t.id), // full stream
      trackTimeMillis: (t.duration ?? 0) * 1000,
    };
  });
}

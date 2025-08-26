import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ITunesTrack } from '@/services/itunes';

const RECENT_KEY = 'recent_tracks_v1';
const FAVS_KEY = 'favorite_tracks_v1';
const PLAYLISTS_KEY = 'playlists_v1';

const MAX_RECENT = 20;

// Recently Played
export async function getRecentTracks(): Promise<ITunesTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ITunesTrack[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRecentTrack(track: ITunesTrack): Promise<void> {
  try {
    const current = await getRecentTracks();
    const filtered = current.filter((t) => t.trackId !== track.trackId);
    const next = [track, ...filtered].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

// Favorites
export async function getFavorites(): Promise<ITunesTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ITunesTrack[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function isFavorite(trackId: number): Promise<boolean> {
  const favs = await getFavorites();
  return favs.some((t) => t.trackId === trackId);
}

export async function toggleFavorite(track: ITunesTrack): Promise<boolean> {
  try {
    const current = await getFavorites();
    const exists = current.find((t) => t.trackId === track.trackId);
    let next: ITunesTrack[];
    let nowFav = false;
    if (exists) {
      next = current.filter((t) => t.trackId !== track.trackId);
      nowFav = false;
    } else {
      next = [track, ...current];
      nowFav = true;
    }
    await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(next));
    return nowFav;
  } catch {
    return false;
  }
}

// Playlists (scaffold)
export type Playlist = {
  id: string;
  name: string;
  tracks: ITunesTrack[];
};

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Playlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const all = await getPlaylists();
  const p: Playlist = { id: `${Date.now()}`, name, tracks: [] };
  await savePlaylists([p, ...all]);
  return p;
}

export async function addTrackToPlaylist(playlistId: string, track: ITunesTrack): Promise<void> {
  const all = await getPlaylists();
  const updated = all.map((p) =>
    p.id === playlistId
      ? { ...p, tracks: [track, ...p.tracks.filter((t) => t.trackId !== track.trackId)] }
      : p
  );
  await savePlaylists(updated);
}

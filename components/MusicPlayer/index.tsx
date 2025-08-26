import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchTracks, ITunesTrack } from '@/services/itunes';
import { images } from '@/constants/images';
import { icons } from '@/constants/icons';
import { registerControls, setPlayerState, PlayerControls } from '@/services/playerController';
import Constants from 'expo-constants';
import {
  jamendoFeatured,
  jamendoSearchTracks,
  normalizeJamendoToITunesShape,
} from '@/services/jamendo';
import {
  audiusTrending,
  audiusSearch,
  normalizeAudiusToITunesShape,
} from '@/services/audius';
import { saveRecentTrack, toggleFavorite, isFavorite } from '@/services/storage';

function msToMinSec(ms?: number) {
  if (!ms && ms !== 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString();
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export type MusicPlayerProps = {
  autoplayTrack?: ITunesTrack | null;
};

export default function MusicPlayer({ autoplayTrack }: MusicPlayerProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const [current, setCurrent] = useState<ITunesTrack | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Token to ensure only the latest loadAndPlay operation is active
  const loadSeqRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);

  // Favorite toggle needs to be declared before it's referenced in effects
  const onToggleFavorite = React.useCallback(async () => {
    if (!current) return;
    const nowFav = await toggleFavorite(current);
    setIsFav(nowFav);
    setPlayerState({ isFav: nowFav });
  }, [current]);

  // Initialize controls with no-op functions
  const controlsRef = useRef<PlayerControls>({
    togglePlay: async () => {},
    playNext: async () => {},
    playPrev: async () => {},
    toggleFavorite: async () => {},
    seekTo: async () => {},
    playAtIndex: async () => {},
  });

  // (deduplicated) controls effect defined later
  // previously malformed effect removed

  useEffect(() => {
    // Publish current player state to subscribers (NowPlaying)
    setPlayerState({ isPlaying, isFav, position, duration, track: current });
  }, [isPlaying, isFav, position, duration, current]);

  useEffect(() => {
    // Publish queue and index whenever results or index change
    setPlayerState({ queue: results, currentIndex: currentIndex ?? -1 });
  }, [results, currentIndex]);

  // Ensure the currently playing track remains in the queue even if results are refreshed from API
  useEffect(() => {
    if (!current) return;
    const idx = results.findIndex((r) => r.trackId === current.trackId);
    if (idx < 0) {
      setResults((prev) => [current, ...prev]);
      setCurrentIndex(0);
      setPlayerState({ currentIndex: 0 });
    }
  }, [results, current?.trackId]);
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Read Jamendo client id from app.json extra
    const extra = (Constants.expoConfig as any)?.extra || (Constants.manifest as any)?.extra || {};
    const id = extra?.JAMENDO_CLIENT_ID as string | undefined;
    if (id && id.length > 0) {
      setClientId(id);
      // Preload featured
      setLoading(true);
      jamendoFeatured(id, 25)
        .then((items) => setResults(normalizeJamendoToITunesShape(items).filter((t) => !!t.previewUrl)))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // No Jamendo key: use Audius trending for full tracks
      setLoading(true);
      audiusTrending(25)
        .then((items) => setResults(normalizeAudiusToITunesShape(items).filter((t) => !!t.previewUrl)))
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // Main controls effect
  useEffect(() => {
    const newControls = {
      togglePlay: async () => {
        const s = soundRef.current;
        if (!s) return;
        const status = await s.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) await s.pauseAsync();
        else await s.playAsync();
      },
      playNext: async () => {
        if (currentIndex == null || currentIndex < 0) return;
        const list = await ensurePlayableQueue();
        if (list.length === 0) return;
        
        let next = findPlayableFrom(list, currentIndex, 1);
        if (next < 0) next = findPlayableFrom(list, list.length, 1);
        if (next >= 0) playAtIndex(next);
      },
      playPrev: async () => {
        if (currentIndex == null || currentIndex < 0) return;
        const list = results;
        if (list.length === 0) return;
        
        let prev = findPlayableFrom(list, currentIndex, -1);
        if (prev < 0) prev = findPlayableFrom(list, -1, -1);
        if (prev >= 0) playAtIndex(prev);
      },
      toggleFavorite: onToggleFavorite,
      seekTo: async (millis: number) => {
        try {
          const s = soundRef.current;
          if (!s) return;
          const safe = Math.max(0, Math.min(duration || 0, Math.floor(millis)));
          await s.setPositionAsync(safe);
          setPosition(safe);
          setPlayerState({ position: safe });
        } catch {}
      },
      playAtIndex: (idx: number) => {
        if (idx < 0 || idx >= results.length) return;
        setCurrentIndex(idx);
        setPlayerState({ currentIndex: idx });
        loadAndPlay(results[idx]);
      },
    };
    
    controlsRef.current = newControls;
    registerControls(newControls);
    
    if (__DEV__) {
      (window as any).playerControls = newControls;
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [results, currentIndex, duration, onToggleFavorite]);

  // Autoplay external track when provided
  useEffect(() => {
    if (autoplayTrack) {
      loadAndPlay(autoplayTrack);
      // Ensure it appears in the list top if playable
      if (autoplayTrack.previewUrl) {
        setResults((prev) => {
          const exists = prev.find((p) => p.trackId === autoplayTrack.trackId);
          if (exists) return prev;
          return [autoplayTrack, ...prev];
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayTrack?.trackId]);

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      if (clientId) {
        const j = await jamendoSearchTracks(clientId, query, 25);
        setResults(normalizeJamendoToITunesShape(j).filter((t) => !!t.previewUrl));
      } else {
        const a = await audiusSearch(query, 25);
        setResults(normalizeAudiusToITunesShape(a).filter((t) => !!t.previewUrl));
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to search');
    } finally {
      setLoading(false);
    }
  };

  const loadAndPlay = async (track: ITunesTrack) => {
    try {
      // Bump token; capture local token for this load
      const token = ++loadSeqRef.current;
      // Guard: if no playable URL, do not disrupt current playback
      if (!track.previewUrl) {
        return;
      }
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
        try { soundRef.current.setOnPlaybackStatusUpdate(null); } catch {}
        soundRef.current = null;
      }
      setCurrent(track);
      setPlayerState({ track });
      // Update favorite state for this track
      if (track.trackId) {
        isFavorite(track.trackId).then(setIsFav).catch(() => setIsFav(false));
      } else {
        setIsFav(false);
      }
      // ensure track is part of results so next/prev always work
      const idxExisting = results.findIndex((r) => r.trackId === track.trackId);
      if (idxExisting < 0) {
        // Use functional update to avoid stale 'results'
        setResults((prev) => [track, ...prev]);
        setCurrentIndex(0);
        // Do not push queue immediately here to avoid stale data; the effect on [results,currentIndex] will publish
      } else {
        setCurrentIndex(idxExisting);
        setPlayerState({ currentIndex: idxExisting });
      }
      setIsPlaying(false);
      setPosition(0);
      setDuration(track.trackTimeMillis ?? 0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true },
        (status) => {
          // Ignore updates from outdated loads
          if (token !== loadSeqRef.current) return;
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? track.trackTimeMillis ?? 0);
          setIsPlaying(status.isPlaying ?? false);
          setPlayerState({
            position: status.positionMillis ?? 0,
            duration: status.durationMillis ?? track.trackTimeMillis ?? 0,
            isPlaying: status.isPlaying ?? false,
          });
          if ((status as any).didJustFinish) {
            playNext();
          }
        }
      );

      // If another load started while we were creating this sound, discard this one
      if (token !== loadSeqRef.current) {
        try { await sound.unloadAsync(); } catch {}
        return;
      }
      soundRef.current = sound;
      saveRecentTrack(track).catch(() => {});
    } catch (e) {
      setError('Playback error');
    }
  };

  const togglePlay = React.useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    const status = await s.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) await s.pauseAsync();
    else await s.playAsync();
  }, []);

  // Removed explicit stop control; play/pause in the mini-player handles UX.

  const playAtIndex = React.useCallback((idx: number) => {
    if (idx < 0 || idx >= results.length) return;
    // Update index first so any immediate consumers (e.g., subscribers) see it
    setCurrentIndex(idx);
    setPlayerState({ currentIndex: idx });
    loadAndPlay(results[idx]);
  }, [results]);

  const mergeUniquePlayable = (base: ITunesTrack[], add: ITunesTrack[]) => {
    const seen = new Set(base.map(t => t.trackId));
    return [
      ...base,
      ...add.filter(t => t.previewUrl && !seen.has(t.trackId) && seen.add(t.trackId))
    ];
  };

  const loadMoreTracks = async (): Promise<ITunesTrack[]> => {
    try {
      if (clientId) {
        const j = await jamendoFeatured(clientId, 25);
        return normalizeJamendoToITunesShape(j).filter(t => t.previewUrl);
      } else {
        const a = await audiusTrending(25);
        return normalizeAudiusToITunesShape(a).filter(t => t.previewUrl);
      }
    } catch {
      return [];
    }
  };

  const ensurePlayableQueue = async (): Promise<ITunesTrack[]> => {
    // If we have at least 3 playable tracks, we're good
    if (results.filter(t => t.previewUrl).length >= 3) return results;
    
    // Load more tracks and merge with existing ones
    const newTracks = await loadMoreTracks();
    const merged = mergeUniquePlayable(results, newTracks);
    setResults(merged);
    return merged;
  };

  const findPlayableFrom = (list: ITunesTrack[], start: number, dir: 1 | -1) => {
    if (!list.length) return -1;
    
    // Ensure start is within bounds
    const safeStart = Math.max(-1, Math.min(start, list.length));
    
    // Search forward or backward based on direction
    for (let i = 1; i <= list.length; i++) {
      const idx = (safeStart + dir * i + list.length) % list.length;
      const track = list[idx];
      if (track?.previewUrl) return idx;
    }
    return -1;
  };

  const playNext = React.useCallback(async () => {
    console.log('playNext called, currentIndex:', currentIndex);
    if (currentIndex == null || currentIndex < 0) {
      console.log('No current index, cannot play next');
      return;
    }
    
    try {
      // Ensure we have enough playable tracks
      const list = await ensurePlayableQueue();
      console.log('Queue length after ensuring:', list.length);
      
      if (list.length === 0) {
        console.log('No tracks in queue');
        return;
      }
      
      // Find next playable track
      let next = findPlayableFrom(list, currentIndex, 1);
      console.log('Next playable index:', next);
      
      // If no next playable, try from start
      if (next < 0) {
        console.log('No next track, trying from start');
        next = findPlayableFrom(list, list.length, 1);
      }
      
      if (next >= 0) {
        console.log('Playing track at index:', next);
        playAtIndex(next);
      } else {
        console.log('No playable next track found');
      }
    } catch (error) {
      console.error('Error in playNext:', error);
    }
  }, [currentIndex, ensurePlayableQueue, findPlayableFrom, playAtIndex]);

  const playPrev = React.useCallback(async () => {
    console.log('playPrev called, currentIndex:', currentIndex);
    if (currentIndex == null || currentIndex < 0) {
      console.log('No current index, cannot play previous');
      return;
    }
    
    try {
      const list = results;
      console.log('Queue length:', list.length);
      
      if (list.length === 0) {
        console.log('No tracks in queue');
        return;
      }
      
      // Find previous playable track
      let prev = findPlayableFrom(list, currentIndex, -1);
      console.log('Previous playable index:', prev);
      
      // If no previous playable, try from end
      if (prev < 0) {
        console.log('No previous track, trying from end');
        prev = findPlayableFrom(list, list.length, -1);
      }
      
      if (prev >= 0) {
        console.log('Playing track at index:', prev);
        playAtIndex(prev);
      } else {
        console.log('No playable previous track found');
      }
    } catch (error) {
      console.error('Error in playPrev:', error);
    }
  }, [currentIndex, results, findPlayableFrom, playAtIndex]);

  const seekTo = React.useCallback(async (millis: number) => {
    try {
      const s = soundRef.current;
      if (!s) return;
      const safe = Math.max(0, Math.min(duration || 0, Math.floor(millis)));
      await s.setPositionAsync(safe);
      setPosition(safe);
      setPlayerState({ position: safe });
    } catch {}
  }, [duration]);

  // Seek gestures handled on NowPlaying screen; inline mini-player removed in favor of GlobalMiniPlayer

  const goNowPlaying = () => {
    if (!current) return;
    navigation.navigate('NowPlaying', { track: current, position, duration });
  };

  const renderItem = ({ item }: { item: ITunesTrack }) => (
    <TouchableOpacity
      className="flex-row items-center p-3 gap-3 bg-white/90 rounded-xl mb-3 shadow"
      onPress={() => loadAndPlay(item)}
      activeOpacity={0.8}
    >
      {item.artworkUrl100 ? (
        <Image source={{ uri: item.artworkUrl100 }} className="w-14 h-14 rounded-lg" />
      ) : (
        <View className="w-14 h-14 rounded-lg bg-gray-200" />
      )}
      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={1}>
          {item.trackName}
        </Text>
        <Text className="text-gray-600" numberOfLines={1}>
          {item.artistName}
        </Text>
      </View>
      <Text className="text-gray-500">{msToMinSec(item.trackTimeMillis)}</Text>
    </TouchableOpacity>
  );

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <ImageBackground source={images.bg} resizeMode="cover" className="flex-1">
      <View className="flex-1 bg-black/50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
          <View className="flex-row items-center gap-3">
            <Image source={icons.logo} className="w-9 h-9" />
            <Text className="text-2xl font-extrabold text-white tracking-wider">VibeTunes</Text>
          </View>
          <View className="h-8 w-8 rounded-full border border-cyan-400/40" style={{shadowColor:'#22d3ee',shadowOpacity:0.45,shadowRadius:10}} />
        </View>

        {/* Search */}
        <View className="px-6 pb-3">
          <View
            className="flex-row items-center rounded-2xl px-4 py-3 border"
            style={{
              backgroundColor: 'rgba(2,6,23,0.6)',
              borderColor: 'rgba(34,211,238,0.25)',
              shadowColor: '#22d3ee',
              shadowOpacity: 0.25,
              shadowRadius: 12,
            }}
          >
            <Image source={icons.search} className="w-5 h-5 mr-2" style={{ tintColor: '#67e8f9' }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search songs, artists..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-white"
              returnKeyType="search"
              onSubmitEditing={onSearch}
            />
            <TouchableOpacity
              onPress={onSearch}
              className="rounded-xl px-4 py-2"
              style={{ backgroundColor: '#06b6d4', shadowColor: '#22d3ee', shadowOpacity: 0.55, shadowRadius: 14 }}
            >
              <Text className="text-white font-semibold">Search</Text>
            </TouchableOpacity>
          </View>
          {error && <Text className="text-red-400 mt-2">{error}</Text>}
        </View>

        {loading && (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        )}

        {!loading && results.length === 0 && !error && (
          <View className="items-center px-6 py-10">
            <Text className="text-center text-cyan-200">
              {clientId
                ? 'Browse featured or search for tracks to start playing.'
                : 'Browse featured or search to play full tracks (Audius).'}
            </Text>
          </View>
        )}

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={(item, index) => {
            return item?.trackId?.toString() || 
                   item?.previewUrl || 
                   `${item?.trackName}-${item?.artistName}-${index}`;
          }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="flex-row items-center p-3 border-b border-gray-800"
              onPress={() => playAtIndex(results.findIndex(t => t.trackId === item.trackId))}
            >
              {item.artworkUrl100 ? (
                <Image 
                  source={{ uri: item.artworkUrl100 }} 
                  className="w-14 h-14 rounded-xl mr-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-14 h-14 rounded-xl bg-black/30 mr-3" />
              )}
              <View className="flex-1">
                <Text className="font-semibold text-white" numberOfLines={1}>
                  {item.trackName}
                </Text>
                <Text className="text-cyan-200/80 text-sm" numberOfLines={1}>
                  {item.artistName}
                </Text>
              </View>
              <Text className="text-cyan-300/80 text-sm ml-2">
                {msToMinSec(item.trackTimeMillis)}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        />
        
      </View>
    </ImageBackground>
  );
}

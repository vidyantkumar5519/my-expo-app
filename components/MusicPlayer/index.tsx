import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { searchTracks, ITunesTrack } from '@/services/itunes';
import { images } from '@/constants/images';
import { icons } from '@/constants/icons';
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const [current, setCurrent] = useState<ITunesTrack | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
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
        .then((items) => setResults(normalizeJamendoToITunesShape(items)))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // No Jamendo key: use Audius trending for full tracks
      setLoading(true);
      audiusTrending(25)
        .then((items) => setResults(normalizeAudiusToITunesShape(items)))
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

  // Autoplay external track when provided
  useEffect(() => {
    if (autoplayTrack) {
      loadAndPlay(autoplayTrack);
      // Ensure it appears in the list top
      setResults((prev) => {
        const exists = prev.find((p) => p.trackId === autoplayTrack.trackId);
        if (exists) return prev;
        return [autoplayTrack, ...prev];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayTrack?.trackId]);

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      if (clientId) {
        const j = await jamendoSearchTracks(clientId, query, 25);
        setResults(normalizeJamendoToITunesShape(j));
      } else {
        const a = await audiusSearch(query, 25);
        setResults(normalizeAudiusToITunesShape(a));
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to search');
    } finally {
      setLoading(false);
    }
  };

  const loadAndPlay = async (track: ITunesTrack) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current.setOnPlaybackStatusUpdate(null);
        soundRef.current = null;
      }
      setCurrent(track);
      setIsPlaying(false);
      setPosition(0);
      setDuration(track.trackTimeMillis ?? 0);

      if (!track.previewUrl) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? track.trackTimeMillis ?? 0);
          setIsPlaying(status.isPlaying ?? false);
        }
      );

      soundRef.current = sound;
    } catch (e) {
      setError('Playback error');
    }
  };

  const togglePlay = async () => {
    const s = soundRef.current;
    if (!s) return;
    const status = await s.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) await s.pauseAsync();
    else await s.playAsync();
  };

  const stop = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      } catch {}
    }
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
          keyExtractor={(item) => String(item.trackId)}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center p-3 gap-3 rounded-2xl mb-3"
              onPress={() => loadAndPlay(item)}
              activeOpacity={0.85}
              style={{
                backgroundColor: 'rgba(2,6,23,0.65)',
                borderWidth: 1,
                borderColor: 'rgba(34,211,238,0.18)',
                shadowColor: '#22d3ee',
                shadowOpacity: 0.25,
                shadowRadius: 10,
                marginHorizontal: 16,
              }}
            >
              {item.artworkUrl100 ? (
                <Image source={{ uri: item.artworkUrl100 }} className="w-14 h-14 rounded-xl" />
              ) : (
                <View className="w-14 h-14 rounded-xl bg-black/30" />
              )}
              <View className="flex-1">
                <Text className="font-semibold text-white" numberOfLines={1}>
                  {item.trackName}
                </Text>
                <Text className="text-cyan-200/80" numberOfLines={1}>
                  {item.artistName}
                </Text>
              </View>
              <Text className="text-cyan-300/80">{msToMinSec(item.trackTimeMillis)}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 160 }}
        />

        {/* Mini Player */}
        {current && (
          <View className="absolute left-0 right-0 bottom-0">
            <View
              className="mx-4 mb-6 rounded-2xl p-4"
              style={{
                backgroundColor: 'rgba(2,6,23,0.8)',
                borderWidth: 1,
                borderColor: 'rgba(34,211,238,0.25)',
                shadowColor: '#22d3ee',
                shadowOpacity: 0.35,
                shadowRadius: 18,
              }}
            >
              <View className="flex-row items-center gap-3">
                {current.artworkUrl100 ? (
                  <Image source={{ uri: current.artworkUrl100 }} className="w-12 h-12 rounded-xl" />
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-black/30" />
                )}
                <View className="flex-1">
                  <Text className="font-semibold text-white" numberOfLines={1}>{current.trackName}</Text>
                  <Text className="text-cyan-200/80" numberOfLines={1}>{current.artistName}</Text>
                </View>
                <TouchableOpacity
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: '#06b6d4', shadowColor: '#22d3ee', shadowOpacity: 0.6, shadowRadius: 14 }}
                  onPress={togglePlay}
                >
                  <Text className="text-white font-semibold">{isPlaying ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-3 py-2 rounded-full ml-2"
                  style={{ backgroundColor: 'rgba(148,163,184,0.2)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.35)' }}
                  onPress={stop}
                >
                  <Text className="text-slate-200">Stop</Text>
                </TouchableOpacity>
              </View>
              <View className="mt-3">
                <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.25)' }}>
                  <View style={{ width: `${progress * 100}%`, backgroundColor: '#22d3ee' }} className="h-full" />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-cyan-200/80 text-xs">{msToMinSec(position)}</Text>
                  <Text className="text-cyan-200/80 text-xs">{msToMinSec(duration)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

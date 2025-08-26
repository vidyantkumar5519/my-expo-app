import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, Pressable, FlatList, Alert, Modal, TextInput, Animated, Easing, PanResponder, GestureResponderEvent, Share } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { images } from '@/constants/images';
import { icons } from '@/constants/icons';
import { getControls, subscribe } from '@/services/playerController';
import { addTrackToPlaylist, createPlaylist, getPlaylists } from '@/services/storage';

// This route param mirrors what MusicPlayer sends on navigate('NowPlaying', { track, position, duration })
// We keep it untyped to avoid circular imports, but the shape is:
// { track: ITunesTrack, position?: number, duration?: number }
export default function NowPlayingScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, any>, string>>();
  // Initial values from route (fallback), then live values from controller subscription take over
  const [track, setTrack] = useState<any>((route.params as any)?.track);
  const [position, setPosition] = useState<number>((route.params as any)?.position ?? 0);
  const [duration, setDuration] = useState<number>((route.params as any)?.duration ?? 0);

  const msToMinSec = (ms?: number) => {
    if (!ms && ms !== 0) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString();
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Derived availability for navigation controls (wrap-around when list > 1)
  // NOTE: computed after queue/currentIndex are initialized below

  const openPlaylistPicker = async () => {
    try {
      const all = await getPlaylists();
      setPlaylists(all);
      setCreatingName('');
      setShowPlaylistModal(true);
    } catch {
      setPlaylists([]);
      setShowPlaylistModal(true);
    }
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!track) return;
    try {
      await addTrackToPlaylist(playlistId, track);
      setShowPlaylistModal(false);
      Alert.alert('Added', 'Track added to playlist');
    } catch {}
  };

  const createAndAdd = async () => {
    const name = creatingName.trim() || `Playlist ${new Date().toLocaleTimeString()}`;
    try {
      const p = await createPlaylist(name);
      await addTrackToPlaylist(p.id, track);
      setShowPlaylistModal(false);
      Alert.alert('Created', `Added to ${name}`);
    } catch {}
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [creatingName, setCreatingName] = useState('');
  const [artSize, setArtSize] = useState(280);
  const artScale = useRef(new Animated.Value(1)).current;
  const isBreathing = useRef<Animated.CompositeAnimation | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Derived availability for navigation controls (wrap-around when list > 1)
  const hasWrap = Array.isArray(queue) && queue.length >= 1 && (currentIndex ?? -1) >= 0;
  const hasPrev = hasWrap;
  const hasNext = hasWrap;

  const center = { x: artSize / 2, y: artSize / 2 };

  const progressToAngle = (p: number) => {
    // 0 at top (-90deg), clockwise
    const theta = p * Math.PI * 2 - Math.PI / 2;
    return theta;
  };

  const angleToProgress = (theta: number) => {
    // Convert atan2 angle (-PI..PI) to 0..1 with 0 at top
    const shifted = theta + Math.PI / 2; // now -PI/2..3PI/2 with 0 at right
    let p = shifted / (Math.PI * 2);
    p = (p % 1 + 1) % 1; // wrap to [0,1)
    return p;
  };

  const handleCircularSeek = (evt: GestureResponderEvent) => {
    if (!duration) return;
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - center.x;
    const dy = locationY - center.y;
    const theta = Math.atan2(dy, dx); // -PI..PI, 0 at right
    // Rotate reference so 0 at top
    const p = angleToProgress(theta);
    const target = p * duration;
    getControls().seekTo(target);
  };

  const circlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleCircularSeek(e),
      onPanResponderMove: (e) => handleCircularSeek(e),
      onPanResponderRelease: (e) => handleCircularSeek(e),
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => {
    // Breathing animation when playing
    if (isPlaying) {
      if (!isBreathing.current) {
        isBreathing.current = Animated.loop(
          Animated.sequence([
            Animated.timing(artScale, { toValue: 1.02, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(artScale, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        );
      }
      isBreathing.current?.start();
    } else {
      isBreathing.current?.stop();
      isBreathing.current = null;
      artScale.stopAnimation();
      artScale.setValue(1);
    }
  }, [isPlaying]);

  useEffect(() => {
    const unsub = subscribe((s) => {
      setIsPlaying(s.isPlaying);
      setIsFav(s.isFav);
      if (typeof s.position === 'number') setPosition(s.position);
      if (typeof s.duration === 'number') setDuration(s.duration);
      if (s.track) setTrack(s.track);
      if (Array.isArray(s.queue)) setQueue(s.queue);
      if (typeof s.currentIndex === 'number') setCurrentIndex(s.currentIndex);
    });
    return () => { unsub(); };
  }, []);

  const onSeekAtX = (x: number) => {
    if (!duration || barWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    const target = ratio * duration;
    getControls().seekTo(target);
  };

  const ensureDefaultPlaylistAndAdd = async (t: any) => {
    try {
      const all = await getPlaylists();
      const existing = all.find((p) => p.name === 'My Playlist');
      const id = existing ? existing.id : (await createPlaylist('My Playlist')).id;
      await addTrackToPlaylist(id, t);
      Alert.alert('Added', 'Track added to My Playlist');
    } catch {}
  };

  return (
    <ImageBackground source={images.bg} resizeMode="cover" className="flex-1">
      <View className="flex-1 bg-black/50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
          <View className="flex-row items-center gap-3">
            <Image source={icons.logo} className="w-9 h-9" />
            <Text className="text-2xl font-extrabold text-white tracking-wider">Now Playing</Text>
          </View>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            className="h-9 w-9 rounded-full items-center justify-center"
            style={{borderWidth:1, borderColor:'rgba(34,211,238,0.35)'}}
          >
            <Image source={icons.close} style={{ width: 16, height: 16, tintColor: '#67e8f9' }} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View
            className="rounded-3xl mb-6"
            style={{ width: artSize, height: artSize }}
            onLayout={(e) => setArtSize(Math.round(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height)))}
          >
            {/* Circular seek overlay (placeholder visuals) */}
            <View
              {...circlePanResponder.panHandlers}
              style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: artSize / 2, borderWidth: 6, borderColor: 'rgba(34,211,238,0.25)' }}
            >
              {/* Knob positioned by progress */}
              {(() => {
                const theta = progressToAngle(progress);
                const r = artSize / 2 - 6;
                const kx = center.x + r * Math.cos(theta);
                const ky = center.y + r * Math.sin(theta);
                return (
                  <View style={{ position: 'absolute', left: kx - 10, top: ky - 10, width: 20, height: 20, borderRadius: 20, backgroundColor: '#22d3ee', borderWidth: 2, borderColor: 'white' }} />
                );
              })()}
            </View>

            <Animated.View
              className="rounded-3xl overflow-hidden"
              style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.28)', shadowColor:'#22d3ee', shadowOpacity:0.35, shadowRadius:24, transform: [{ scale: artScale }] }}
            >
              {track?.artworkUrl100 ? (
                <Image source={{ uri: track.artworkUrl100 }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View className="flex-1" />
              )}
            </Animated.View>
          </View>

          <Text className="text-white text-xl font-bold" numberOfLines={2} style={{textAlign:'center'}}>
            {track?.trackName ?? '—'}
          </Text>
          <Text className="text-cyan-200/90 mt-1" numberOfLines={1} style={{textAlign:'center'}}>
            {track?.artistName ?? ''}
          </Text>

          

          {/* Progress */}
          <View className="w-full mt-6">
            <View
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(148,163,184,0.25)' }}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => onSeekAtX(e.nativeEvent.locationX)}
              onResponderMove={(e) => onSeekAtX(e.nativeEvent.locationX)}
              onResponderRelease={(e) => onSeekAtX(e.nativeEvent.locationX)}
            >
              <View style={{ width: `${progress * 100}%`, backgroundColor: '#22d3ee' }} className="h-full" />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-cyan-200/80 text-xs">{msToMinSec(position)}</Text>
              <Text className="text-cyan-200/80 text-xs">{msToMinSec(duration)}</Text>
            </View>
          </View>

          {/* Controls - single row: Shuffle • Prev • Play/Pause • Next • Repeat */}
          <View className="w-full mt-7 px-6">
            <View className="flex-row items-center justify-between" style={{ columnGap: 14 }}>
              {/* Shuffle */}
              <Pressable
                onPress={() => setIsShuffle((v) => !v)}
                style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: isShuffle ? 'rgba(6,182,212,0.22)' : 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: isShuffle ? '#22d3ee' : 'rgba(148,163,184,0.28)', opacity: pressed ? 0.7 : 1 })}
              >
                <Image source={icons.shuffle} style={{ width: 18, height: 18, tintColor: isShuffle ? '#22d3ee' : '#e2e8f0' }} />
              </Pressable>

              {/* Prev */}
              <Pressable
                disabled={!hasPrev}
                onPress={() => { if (hasPrev) getControls().playPrev(); }}
                style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.14)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.28)', opacity: !hasPrev ? 0.35 : (pressed ? 0.7 : 1) })}
              >
                <Image source={icons.prev} style={{ width: 18, height: 18, tintColor: !hasPrev ? '#64748b' : '#e2e8f0' }} />
              </Pressable>

              {/* Play/Pause (primary) */}
              <Pressable
                onPress={() => getControls().togglePlay()}
                style={({ pressed }) => ({ width: 68, height: 68, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06b6d4', shadowColor: '#22d3ee', shadowOpacity: 0.6, shadowRadius: 18, opacity: pressed ? 0.85 : 1 })}
              >
                <Image source={isPlaying ? icons.pause : icons.play} style={{ width: 22, height: 22, tintColor: 'white' }} />
              </Pressable>

              {/* Next */}
              <Pressable
                disabled={!hasNext}
                onPress={() => { if (hasNext) getControls().playNext(); }}
                style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.14)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.28)', opacity: !hasNext ? 0.35 : (pressed ? 0.7 : 1) })}
              >
                <Image source={icons.next} style={{ width: 18, height: 18, tintColor: !hasNext ? '#64748b' : '#e2e8f0' }} />
              </Pressable>

              {/* Repeat */}
              <Pressable
                onPress={() => setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))}
                style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: repeatMode !== 'off' ? 'rgba(6,182,212,0.22)' : 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: repeatMode !== 'off' ? '#22d3ee' : 'rgba(148,163,184,0.28)', opacity: pressed ? 0.7 : 1 })}
              >
                <Image source={repeatMode === 'one' ? icons.repeatOne : icons.repeat} style={{ width: 18, height: 18, tintColor: repeatMode !== 'off' ? '#22d3ee' : '#e2e8f0' }} />
              </Pressable>
            </View>
          </View>

          {/* Queue Modal */}
          <Modal visible={showQueueModal} transparent animationType="fade" onRequestClose={() => setShowQueueModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: 'rgba(2,6,23,0.98)', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold text-lg">Up Next</Text>
                  <TouchableOpacity onPress={() => setShowQueueModal(false)}>
                    <Image source={icons.close} style={{ width: 20, height: 20, tintColor: '#e2e8f0' }} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={queue}
                  keyExtractor={(it: any, idx: number) => {
                    const base = it?.trackId ?? it?.collectionId ?? it?.previewUrl ?? it?.artworkUrl100 ?? `${it?.trackName}-${it?.artistName}`;
                    return `np-q-${String(base)}-${idx}`;
                  }}
                  renderItem={({ item, index }) => (
                    <Pressable
                      onPress={() => { getControls().playAtIndex(index); setShowQueueModal(false); }}
                      onLongPress={() => ensureDefaultPlaylistAndAdd(item)}
                      style={({ pressed }) => ({ borderRadius: 12, overflow: 'hidden', marginBottom: 8, opacity: pressed ? 0.7 : 1 })}
                    >
                      <View style={{ padding: 10, borderWidth: 1, borderColor: index === currentIndex ? '#22d3ee' : 'rgba(34,211,238,0.2)', backgroundColor: index === currentIndex ? 'rgba(2,6,23,0.85)' : 'rgba(2,6,23,0.6)', borderRadius: 12 }}>
                        <View className="flex-row items-center gap-3">
                          {item?.artworkUrl100 ? (
                            <Image source={{ uri: item.artworkUrl100 }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                          ) : (
                            <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(2,6,23,0.5)' }} />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text className="text-white" numberOfLines={1}>{item?.trackName ?? '—'}</Text>
                            <Text className="text-cyan-200/80 text-xs" numberOfLines={1}>{item?.artistName ?? ''}</Text>
                          </View>
                          {index === currentIndex && <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: '#22d3ee' }} />}
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Playlist Picker Modal */}
          <Modal visible={showPlaylistModal} transparent animationType="fade" onRequestClose={() => setShowPlaylistModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: 'rgba(2,6,23,0.98)', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold text-lg">Add to playlist</Text>
                  <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                    <Image source={icons.close} style={{ width: 20, height: 20, tintColor: '#e2e8f0' }} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={playlists}
                  keyExtractor={(p) => p.id}
                  ListEmptyComponent={<Text className="text-cyan-200/80">No playlists yet</Text>}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => addToPlaylist(item.id)}
                      style={({ pressed }) => ({ borderRadius: 12, overflow: 'hidden', marginBottom: 8, opacity: pressed ? 0.7 : 1 })}
                    >
                      <View style={{ padding: 12, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)', backgroundColor: 'rgba(2,6,23,0.6)', borderRadius: 12 }}>
                        <Text className="text-white">{item.name}</Text>
                        <Text className="text-cyan-200/80 text-xs">{item.tracks?.length ?? 0} tracks</Text>
                      </View>
                    </Pressable>
                  )}
                />
                <View style={{ height: 1, backgroundColor: 'rgba(34,211,238,0.15)', marginVertical: 10 }} />
                <Text className="text-cyan-200/80 mb-2">Create new</Text>
                <View className="flex-row items-center">
                  <View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                    <TextInput
                      value={creatingName}
                      onChangeText={setCreatingName}
                      placeholder="Playlist name"
                      placeholderTextColor="#94a3b8"
                      style={{ color: 'white' }}
                    />
                  </View>
                  <TouchableOpacity onPress={createAndAdd} style={{ marginLeft: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#06b6d4', borderRadius: 10 }}>
                    <Text className="text-white font-semibold">Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </ImageBackground>
  );
}

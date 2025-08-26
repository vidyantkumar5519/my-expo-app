import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { getControls, subscribe } from '@/services/playerController';
import { icons } from '@/constants/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function msToMinSec(ms?: number) {
  if (!ms && ms !== 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString();
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GlobalMiniPlayer() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const currentRouteName = useNavigationState((state) => state.routes[state.index]?.name);
  const [track, setTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [showQueue, setShowQueue] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const barWidthRef = useRef(0);

  useEffect(() => {
    const unsub = subscribe((s) => {
      setTrack(s.track);
      setIsPlaying(s.isPlaying);
      setPosition(s.position);
      setDuration(s.duration);
      setQueue(Array.isArray(s.queue) ? s.queue : []);
      setCurrentIndex(typeof s.currentIndex === 'number' ? s.currentIndex : -1);
    });
    return unsub;
  }, []);

  // Hide on NowPlaying screen to prevent visual overlap with full-screen player
  if (!track || currentRouteName === 'NowPlaying') return null;

  const effectivePos = dragging && dragPos != null ? dragPos : position;
  const progress = duration > 0 ? Math.min(1, Math.max(0, effectivePos / duration)) : 0;

  const updateDragFromX = (x: number) => {
    const w = barWidthRef.current || 1;
    const ratio = Math.min(1, Math.max(0, x / w));
    const millis = Math.floor(ratio * (duration || 0));
    setDragPos(millis);
  };
  // Keep mini-player above the tab bar (configured at 60 height) and safe area
  const TAB_BAR_HEIGHT = 60;
  const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + 8;
  const hasWrap = queue.length >= 1 && currentIndex >= 0;
  const hasPrev = hasWrap;
  const hasNext = hasWrap;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset, zIndex: 50, elevation: 50 }}>
      <View
        className="mx-4 mb-6 rounded-3xl"
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: 'rgba(2,6,23,0.82)',
          borderWidth: 1,
          borderColor: 'rgba(34,211,238,0.18)',
          shadowColor: '#0ea5e9',
          shadowOpacity: 0.3,
          shadowRadius: 22,
          elevation: 10,
        }}
      >
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Pressable onPress={() => navigation.navigate('NowPlaying', { track, position, duration })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {track.artworkUrl100 ? (
              <Image source={{ uri: track.artworkUrl100 }} className="w-12 h-12 rounded-2xl" />
            ) : (
              <View className="w-12 h-12 rounded-2xl bg-black/30" />
            )}
            <View style={{ flex: 1 }}>
              <Text className="font-semibold text-white" numberOfLines={1}>{track.trackName}</Text>
              <Text className="text-cyan-200/80" numberOfLines={1}>{track.artistName}</Text>
            </View>
          </Pressable>

          {/* Controls cluster */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              disabled={!hasPrev}
              onPress={() => { if (hasPrev) getControls().playPrev(); }}
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.28)', opacity: !hasPrev ? 0.35 : (pressed ? 0.7 : 1) })}
            >
              <Image source={icons.prev} style={{ width: 18, height: 18, tintColor: !hasPrev ? '#64748b' : '#e2e8f0' }} />
            </Pressable>
            <Pressable onPress={() => getControls().togglePlay()} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06b6d4', shadowColor: '#06b6d4', shadowOpacity: 0.55, shadowRadius: 16, opacity: pressed ? 0.85 : 1 })}>
              <Image source={isPlaying ? icons.pause : icons.play} style={{ width: 20, height: 20, tintColor: 'white' }} />
            </Pressable>
            <Pressable
              disabled={!hasNext}
              onPress={() => { if (hasNext) getControls().playNext(); }}
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.28)', opacity: !hasNext ? 0.35 : (pressed ? 0.7 : 1) })}
            >
              <Image source={icons.next} style={{ width: 18, height: 18, tintColor: !hasNext ? '#64748b' : '#e2e8f0' }} />
            </Pressable>

            {/* Queue opener */}
            <Pressable onPress={() => setShowQueue(true)} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.08)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.22)', opacity: pressed ? 0.7 : 1 })}>
              <Image source={icons.more} style={{ width: 16, height: 16, tintColor: '#cbd5e1' }} />
            </Pressable>
          </View>
        </View>

        {/* Thin progress bar with drag-to-seek */}
        <View className="mt-3">
          <View
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(148,163,184,0.2)' }}
            onLayout={(e) => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              setDragging(true);
              updateDragFromX(e.nativeEvent.locationX);
            }}
            onResponderMove={(e) => {
              updateDragFromX(e.nativeEvent.locationX);
            }}
            onResponderRelease={() => {
              setDragging(false);
              if (dragPos != null) {
                getControls().seekTo(dragPos);
              }
              setDragPos(null);
            }}
            onResponderTerminationRequest={() => true}
            onResponderTerminate={() => {
              setDragging(false);
              setDragPos(null);
            }}
          >
            <View style={{ width: `${progress * 100}%`, backgroundColor: '#22d3ee' }} className="h-full" />
          </View>
        </View>
      </View>

      {/* Queue Modal (slide-up style) */}
      <Modal visible={showQueue} transparent animationType="fade" onRequestClose={() => setShowQueue(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'rgba(2,6,23,0.98)', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold text-lg">Queue</Text>
              <Pressable onPress={() => setShowQueue(false)} style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.14)', opacity: pressed ? 0.7 : 1 })}>
                <Text className="text-cyan-200">Close</Text>
              </Pressable>
            </View>

            {queue.length === 0 ? (
              <Text className="text-cyan-200/80 mb-3">No items in queue.</Text>
            ) : null}

            <View style={{ maxHeight: 420 }}>
              <FlatList
                data={queue}
                keyExtractor={(it: any, idx: number) => {
                  const base = it?.trackId ?? it?.collectionId ?? it?.previewUrl ?? it?.artworkUrl100 ?? `${it?.trackName}-${it?.artistName}`;
                  return `q-${String(base)}-${idx}`;
                }}
                renderItem={({ item, index }: { item: any; index: number }) => (
                  <TouchableOpacity
                    onPress={() => {
                      getControls().playAtIndex(index);
                      setShowQueue(false);
                    }}
                    activeOpacity={0.8}
                    className="flex-row items-center p-3 rounded-xl mb-2"
                    style={{ backgroundColor: index === currentIndex ? 'rgba(6,182,212,0.22)' : 'rgba(2,6,23,0.65)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.18)' }}
                  >
                    {item?.artworkUrl100 ? (
                      <Image source={{ uri: item.artworkUrl100 }} className="w-10 h-10 rounded-lg mr-10" />
                    ) : (
                      <View className="w-10 h-10 rounded-lg bg-black/30 mr-10" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text className="text-white" numberOfLines={1}>{item?.trackName}</Text>
                      <Text className="text-cyan-200/80" numberOfLines={1}>{item?.artistName}</Text>
                    </View>
                    <Text className="text-cyan-300/80 ml-3">{msToMinSec(item?.trackTimeMillis)}</Text>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>

            <Text className="text-cyan-300/80 mt-2">Drag-to-reorder coming soon</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

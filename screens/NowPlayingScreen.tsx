import React from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { images } from '@/constants/images';
import { icons } from '@/constants/icons';

// This route param mirrors what MusicPlayer sends on navigate('NowPlaying', { track, position, duration })
// We keep it untyped to avoid circular imports, but the shape is:
// { track: ITunesTrack, position?: number, duration?: number }
export default function NowPlayingScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, any>, string>>();
  const track = (route.params as any)?.track;
  const position: number = (route.params as any)?.position ?? 0;
  const duration: number = (route.params as any)?.duration ?? 0;

  const msToMinSec = (ms?: number) => {
    if (!ms && ms !== 0) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString();
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

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
            <Text style={{color:'#67e8f9', fontWeight:'600'}}>Close</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View
            className="rounded-3xl overflow-hidden mb-6"
            style={{ width: 280, height: 280, backgroundColor: 'rgba(2,6,23,0.7)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.28)', shadowColor:'#22d3ee', shadowOpacity:0.35, shadowRadius:24 }}
          >
            {track?.artworkUrl100 ? (
              <Image source={{ uri: track.artworkUrl100 }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View className="flex-1" />
            )}
          </View>

          <Text className="text-white text-xl font-bold" numberOfLines={2} style={{textAlign:'center'}}>
            {track?.trackName ?? '—'}
          </Text>
          <Text className="text-cyan-200/90 mt-1" numberOfLines={1} style={{textAlign:'center'}}>
            {track?.artistName ?? ''}
          </Text>

          {/* Progress */}
          <View className="w-full mt-6">
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.25)' }}>
              <View style={{ width: `${progress * 100}%`, backgroundColor: '#22d3ee' }} className="h-full" />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-cyan-200/80 text-xs">{msToMinSec(position)}</Text>
              <Text className="text-cyan-200/80 text-xs">{msToMinSec(duration)}</Text>
            </View>
          </View>

          {/* Hint */}
          <Text className="text-cyan-200/70 mt-6 text-center">
            Controls are in the mini player. Full lock screen controls require native modules.
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

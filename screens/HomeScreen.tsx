import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import Constants from 'expo-constants';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import {
  jamendoFeatured,
  normalizeJamendoToITunesShape,
} from '@/services/jamendo';
import { audiusTrending, normalizeAudiusToITunesShape } from '@/services/audius';
import type { ITunesTrack } from '@/services/itunes';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { getRecentTracks } from '@/services/storage';

export default function HomeScreen() {
  const nav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [featured, setFeatured] = useState<ITunesTrack[]>([]);
  const [recent, setRecent] = useState<ITunesTrack[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const extra = (Constants.expoConfig as any)?.extra || (Constants.manifest as any)?.extra || {};
    const id = extra?.JAMENDO_CLIENT_ID as string | undefined;
    if (id && id.length > 0) {
      setClientId(id);
      jamendoFeatured(id, 20).then((items) => setFeatured(normalizeJamendoToITunesShape(items)));
    } else {
      audiusTrending(20).then((items) => setFeatured(normalizeAudiusToITunesShape(items)));
    }
  }, []);

  useEffect(() => {
    const unsub = nav.addListener('focus', () => {
      getRecentTracks().then(setRecent);
    });
    // initial load too
    getRecentTracks().then(setRecent);
    return unsub;
  }, [nav]);

  const onPlay = (track: ITunesTrack) => {
    nav.navigate('Search', { autoplayTrack: track });
  };

  const renderCard = ({ item }: { item: ITunesTrack }) => (
    <TouchableOpacity className="mr-4 w-40" onPress={() => onPlay(item)}>
      {item.artworkUrl100 ? (
        <Image source={{ uri: item.artworkUrl100 }} className="w-40 h-40 rounded-xl" />
      ) : (
        <View className="w-40 h-40 rounded-xl bg-gray-200" />
      )}
      <Text className="mt-2 font-semibold" numberOfLines={1}>{item.trackName}</Text>
      <Text className="text-gray-600" numberOfLines={1}>{item.artistName}</Text>
    </TouchableOpacity>
  );

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

        <FlatList
          data={[]}
          keyExtractor={() => 'header'}
          renderItem={() => null}
          ListHeaderComponent={(
            <View>
              <View className="px-6">
                <Text
                  className="text-lg font-semibold mb-3 text-white"
                  style={{ textShadowColor: '#22d3ee', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}
                >
                  Featured
                </Text>
                <FlatList
                  data={featured}
                  keyExtractor={(it) => String(it.trackId)}
                  renderItem={({ item }) => (
                    <TouchableOpacity className="mr-4 w-40" onPress={() => onPlay(item)} activeOpacity={0.85}>
                      {item.artworkUrl100 ? (
                        <Image source={{ uri: item.artworkUrl100 }} className="w-40 h-40 rounded-xl" />
                      ) : (
                        <View className="w-40 h-40 rounded-xl bg-black/30" />
                      )}
                      <View
                        className="mt-2 rounded-xl p-2"
                        style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
                      >
                        <Text className="font-semibold text-white" numberOfLines={1}>{item.trackName}</Text>
                        <Text className="text-cyan-200/80" numberOfLines={1}>{item.artistName}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>

              <View className="px-6 mt-8">
                <Text
                  className="text-lg font-semibold mb-3 text-white"
                  style={{ textShadowColor: '#22d3ee', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}
                >
                  Recently Played
                </Text>
                {recent.length === 0 ? (
                  <View
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
                  >
                    <Text className="text-cyan-200/80">No recent tracks yet. Start playing!</Text>
                  </View>
                ) : (
                  <FlatList
                    data={recent}
                    keyExtractor={(it) => String(it.trackId)}
                    renderItem={({ item }) => (
                      <TouchableOpacity className="mr-4 w-36" onPress={() => onPlay(item)} activeOpacity={0.85}>
                        {item.artworkUrl100 ? (
                          <Image source={{ uri: item.artworkUrl100 }} className="w-36 h-36 rounded-xl" />
                        ) : (
                          <View className="w-36 h-36 rounded-xl bg-black/30" />
                        )}
                        <View
                          className="mt-2 rounded-xl p-2"
                          style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
                        >
                          <Text className="font-semibold text-white" numberOfLines={1}>{item.trackName}</Text>
                          <Text className="text-cyan-200/80" numberOfLines={1}>{item.artistName}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                )}
              </View>

              <View className="px-6 mt-8">
                <Text
                  className="text-lg font-semibold mb-3 text-white"
                  style={{ textShadowColor: '#22d3ee', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}
                >
                  Your Playlists
                </Text>
                <View
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
                >
                  <Text className="text-cyan-200/80">Coming soon</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ImageBackground>
  );
}

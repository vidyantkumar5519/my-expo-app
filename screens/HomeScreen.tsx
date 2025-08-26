import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
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

export default function HomeScreen() {
  const nav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [featured, setFeatured] = useState<ITunesTrack[]>([]);
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
      <View className="flex-1 bg-white/70">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-12 pb-4">
          <View className="flex-row items-center gap-3">
            <Image source={icons.logo} className="w-8 h-8" />
            <Text className="text-xl font-bold">VibeTunes</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5">
            <Text className="text-lg font-semibold mb-3">Featured</Text>
            <FlatList
              data={featured}
              keyExtractor={(it) => String(it.trackId)}
              renderItem={renderCard}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <View className="px-5 mt-8">
            <Text className="text-lg font-semibold mb-3">Recently Played</Text>
            <Text className="text-gray-600">Coming soon</Text>
          </View>

          <View className="px-5 mt-8">
            <Text className="text-lg font-semibold mb-3">Your Playlists</Text>
            <Text className="text-gray-600">Coming soon</Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

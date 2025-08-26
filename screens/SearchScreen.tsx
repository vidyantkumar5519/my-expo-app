import React from 'react';
import { View, SafeAreaView } from 'react-native';
import MusicPlayer, { MusicPlayerProps } from '@/components/MusicPlayer';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '@/navigation/RootNavigator';

export type SearchScreenProps = BottomTabScreenProps<RootTabParamList, 'Search'>;

export default function SearchScreen({ route }: SearchScreenProps) {
  const autoplayTrack: MusicPlayerProps['autoplayTrack'] = route?.params?.autoplayTrack;
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MusicPlayer autoplayTrack={autoplayTrack} />
    </SafeAreaView>
  );
}

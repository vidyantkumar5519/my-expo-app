import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function LibraryScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-semibold">Your Library</Text>
        <Text className="text-gray-600 mt-2">Playlists and favorites coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

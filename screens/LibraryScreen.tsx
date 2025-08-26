import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, Image, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { images } from '@/constants/images';
import { icons } from '@/constants/icons';
import { getFavorites, type Playlist, getPlaylists, createPlaylist } from '@/services/storage';

export default function LibraryScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylist, setNewPlaylist] = useState('');

  const load = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
    const pls = await getPlaylists();
    setPlaylists(pls);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    const name = newPlaylist.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewPlaylist('');
    load();
  };

  return (
    <ImageBackground source={images.bg} resizeMode="cover" className="flex-1">
      <View className="flex-1 bg-black/50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
          <View className="flex-row items-center gap-3">
            <Image source={icons.logo} className="w-9 h-9" />
            <Text className="text-2xl font-extrabold text-white tracking-wider">Library</Text>
          </View>
          <View className="h-8 w-8 rounded-full border border-cyan-400/40" style={{shadowColor:'#22d3ee',shadowOpacity:0.45,shadowRadius:10}} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-6 mt-2">
            <Text
              className="text-lg font-semibold mb-3 text-white"
              style={{ textShadowColor: '#22d3ee', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}
            >
              Favorites
            </Text>
            <View
              className="rounded-2xl p-3"
              style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
            >
              {favorites.length === 0 ? (
                <Text className="text-cyan-200/80">No favorites yet. Tap the star in the player to add.</Text>
              ) : (
                <FlatList
                  data={favorites}
                  keyExtractor={(item) => String(item.trackId)}
                  renderItem={({ item }) => (
                    <View className="flex-row items-center p-2 gap-3 rounded-xl mb-2" style={{backgroundColor:'rgba(2,6,23,0.5)', borderWidth:1, borderColor:'rgba(34,211,238,0.15)'}}>
                      {item.artworkUrl100 ? (
                        <Image source={{ uri: item.artworkUrl100 }} className="w-12 h-12 rounded-lg" />
                      ) : (
                        <View className="w-12 h-12 rounded-lg bg-black/30" />
                      )}
                      <View className="flex-1">
                        <Text className="text-white font-semibold" numberOfLines={1}>{item.trackName}</Text>
                        <Text className="text-cyan-200/80" numberOfLines={1}>{item.artistName}</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>

          <View className="px-6 mt-8">
            <Text
              className="text-lg font-semibold mb-3 text-white"
              style={{ textShadowColor: '#22d3ee', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}
            >
              Playlists
            </Text>
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(2,6,23,0.75)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}
            >
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  value={newPlaylist}
                  onChangeText={setNewPlaylist}
                  placeholder="New playlist name"
                  placeholderTextColor="#93c5fd"
                  className="flex-1 text-white px-3 py-2 rounded-xl border"
                  style={{ borderColor: 'rgba(34,211,238,0.3)' }}
                />
                <TouchableOpacity
                  onPress={onCreate}
                  className="px-4 py-2 rounded-xl"
                  style={{ backgroundColor: '#06b6d4', shadowColor: '#22d3ee', shadowOpacity: 0.45, shadowRadius: 10 }}
                >
                  <Text className="text-white font-semibold">Create</Text>
                </TouchableOpacity>
              </View>
              {playlists.length === 0 ? (
                <Text className="text-cyan-200/80">No playlists yet. Create one to get started.</Text>
              ) : (
                <View>
                  {playlists.map((p) => (
                    <View key={p.id} className="p-3 rounded-xl mb-2" style={{backgroundColor:'rgba(2,6,23,0.5)', borderWidth:1, borderColor:'rgba(34,211,238,0.15)'}}>
                      <Text className="text-white font-semibold" numberOfLines={1}>{p.name}</Text>
                      <Text className="text-cyan-200/70 text-xs">{p.tracks.length} tracks</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

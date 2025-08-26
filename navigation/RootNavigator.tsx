import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/HomeScreen';
import SearchScreen from '@/screens/SearchScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import { Image, Text } from 'react-native';
import { icons } from '@/constants/icons';
import NowPlayingScreen from '@/screens/NowPlayingScreen';

export type RootTabParamList = {
  Home: undefined;
  Search: { autoplayTrack?: any } | undefined;
  Library: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  NowPlaying: { track: any };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const size = 22;
          const tint = focused ? '#000' : '#9CA3AF';
          let src = icons.home;
          if (route.name === 'Search') src = icons.search;
          if (route.name === 'Library') src = icons.save;
          return <Image source={src} style={{ width: size, height: size, tintColor: tint }} />;
        },
        tabBarStyle: { height: 60, paddingBottom: 10 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="NowPlaying" component={NowPlayingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

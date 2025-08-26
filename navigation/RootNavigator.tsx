import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/HomeScreen';
import SearchScreen from '@/screens/SearchScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import { Image, Text } from 'react-native';
import { icons } from '@/constants/icons';

export type RootTabParamList = {
  Home: undefined;
  Search: { autoplayTrack?: any } | undefined;
  Library: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
}

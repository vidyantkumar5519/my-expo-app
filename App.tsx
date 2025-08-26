import 'react-native-gesture-handler';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Root tab navigator */}
      <RootNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

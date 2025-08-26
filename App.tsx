import 'react-native-gesture-handler';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

import './global.css';

export default function App() {
  return (
    <>
      {/* Root tab navigator */}
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}

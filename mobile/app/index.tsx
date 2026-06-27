import { Redirect } from 'expo-router';

// Root redirect — auth guard in _layout.tsx will handle the actual routing
export default function Index() {
  return <Redirect href="/(drawer)/dashboard" />;
}

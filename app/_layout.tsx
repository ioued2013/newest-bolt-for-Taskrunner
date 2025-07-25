import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import '../src/lib/i18n';

export default function RootLayout() {
  useFrameworkReady();
  
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
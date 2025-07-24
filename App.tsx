import { registerRootComponent } from 'expo';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Slot } from 'expo-router';
import './src/lib/i18n';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

registerRootComponent(App);

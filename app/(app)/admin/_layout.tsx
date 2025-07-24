import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="services" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="financial" />
      <Stack.Screen name="support" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="moderation" />
      <Stack.Screen name="reviews" />
    </Stack>
  );
}
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { PaymentProvider } from '../../src/contexts/PaymentContext';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { Chrome as Home, Search, MessageCircle, User, Package, Truck, DollarSign, Shield } from 'lucide-react-native';

export default function AppLayout() {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <PaymentProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
        }}
      >
        <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ size, color }) => (
            <Truck size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ size, color }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
        />
        <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ size, color }) => (
            <Shield size={size} color={color} />
          ),
          href: profile?.role === 'admin' ? '/(app)/admin' : null,
        }}
        />
        <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
        />
      </Tabs>
    </PaymentProvider>
  );
}
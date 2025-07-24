import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Search, MessageCircle, Package, Truck, Star, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase, Database } from '../../src/lib/supabase';

type Service = Database['public']['Tables']['services']['Row'] & {
  merchant: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  category: {
    name: string;
  } | null;
};

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [featuredServices, setFeaturedServices] = React.useState<Service[]>([]);
  const [stats, setStats] = React.useState({
    totalRequests: 0,
    activeServices: 0,
    unreadMessages: 0,
    completedDeliveries: 0,
  });

  React.useEffect(() => {
    fetchFeaturedServices();
    fetchUserStats();
  }, [profile]);

  const fetchFeaturedServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          merchant:profiles!services_merchant_id_fkey(username, avatar_url, full_name),
          category:categories(name)
        `)
        .eq('is_active', true)
        .limit(5)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeaturedServices(data || []);
    } catch (error) {
      console.error('Error fetching featured services:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!profile) return;

    try {
      // This is a simplified stats fetch - in production you'd want more optimized queries
      const statsPromises = [];

      if (profile.role === 'client') {
        statsPromises.push(
          supabase.from('service_requests').select('id', { count: 'exact' }).eq('client_id', profile.id)
        );
      } else if (profile.role === 'merchant') {
        statsPromises.push(
          supabase.from('services').select('id', { count: 'exact' }).eq('merchant_id', profile.id).eq('is_active', true)
        );
      } else if (profile.role === 'driver') {
        statsPromises.push(
          supabase.from('deliveries').select('id', { count: 'exact' }).eq('driver_id', profile.id).eq('status', 'delivered')
        );
      }

      const results = await Promise.all(statsPromises);
      // Update stats based on results - simplified for demo
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'client':
        return 'Client';
      case 'merchant':
        return 'Service Provider';
      case 'driver':
        return 'Delivery Driver';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'client':
        return 'Browse and book services from providers';
      case 'merchant':
        return 'Manage your services and handle client requests';
      case 'driver':
        return 'Accept and complete delivery requests';
      case 'admin':
        return 'Manage platform users and monitor system';
      default:
        return 'Welcome to Task Runner';
    }
  };

  const getQuickActions = () => {
    switch (profile?.role) {
      case 'client':
        return [
          { title: 'Browse Services', icon: Search, onPress: () => router.push('/(app)/services') },
          { title: 'My Requests', icon: Package, onPress: () => router.push('/(app)/requests') },
          { title: 'Messages', icon: MessageCircle, onPress: () => router.push('/(app)/messages') },
        ];
      case 'merchant':
        return [
          { title: 'My Services', icon: Package, onPress: () => router.push('/(app)/services') },
          { title: 'Service Requests', icon: Package, onPress: () => router.push('/(app)/requests') },
          { title: 'Messages', icon: MessageCircle, onPress: () => router.push('/(app)/messages') },
        ];
      case 'driver':
        return [
          { title: 'Available Deliveries', icon: Truck, onPress: () => router.push('/(app)/deliveries') },
          { title: 'My Deliveries', icon: Package, onPress: () => router.push('/(app)/deliveries') },
        ];
      default:
        return [];
    }
  };

  const renderFeaturedService = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.featuredServiceCard}
      onPress={() => router.push(`/(app)/services/${item.id}`)}
    >
      {item.images && item.images.length > 0 && (
        <Image source={{ uri: item.images[0] }} style={styles.featuredServiceImage} />
      )}
      <View style={styles.featuredServiceContent}>
        <Text style={styles.featuredServiceTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.featuredServicePrice}>
          ${item.price?.toFixed(2) || 'Quote'}
        </Text>
      </View>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Task Runner</Text>
          <Text style={styles.subtitle}>
            {profile?.username ? `Hello, ${profile.username}!` : 'Hello!'}
          </Text>
        </View>

        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>Your Role</Text>
          <Text style={styles.roleName}>
            {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}
          </Text>
          <Text style={styles.roleDescription}>
            {profile?.role ? getRoleDescription(profile.role) : ''}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>
              {profile?.role === 'client' ? stats.totalRequests :
               profile?.role === 'merchant' ? stats.activeServices :
               profile?.role === 'driver' ? stats.completedDeliveries : 0}
            </Text>
            <Text style={styles.statLabel}>
              {profile?.role === 'client' ? 'Requests' :
               profile?.role === 'merchant' ? 'Services' :
               profile?.role === 'driver' ? 'Deliveries' : 'Items'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Star size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <MessageCircle size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {getQuickActions().map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <action.icon size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(profile?.role === 'client' || !profile?.role) && featuredServices.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Featured Services</Text>
            <FlatList
              data={featuredServices}
              renderItem={renderFeaturedService}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredServicesList}
            />
          </View>
        )}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  featuredSection: {
    marginBottom: 32,
  },
  featuredServicesList: {
    paddingLeft: 0,
  },
  featuredServiceCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featuredServiceImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  featuredServiceContent: {
    padding: 12,
  },
  featuredServiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featuredServicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
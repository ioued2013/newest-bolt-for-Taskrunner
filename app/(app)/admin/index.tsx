import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { 
  Users, 
  Package, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  Shield,
  DollarSign,
  Star
} from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';

interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalRequests: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingReviews: number;
  supportTickets: number;
  flaggedContent: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalServices: 0,
    totalRequests: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    pendingReviews: 0,
    supportTickets: 0,
    flaggedContent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    fetchDashboardStats();
  }, [profile]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch various statistics in parallel
      const [
        usersResult,
        servicesResult,
        requestsResult,
        driversResult,
        ticketsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('services').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('service_requests').select('id', { count: 'exact' }),
        supabase.from('driver_locations').select('id', { count: 'exact' }).eq('is_available', true),
        supabase.from('support_tickets').select('id', { count: 'exact' }).eq('status', 'open'),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalServices: servicesResult.count || 0,
        totalRequests: requestsResult.count || 0,
        totalRevenue: 0, // Would calculate from transactions
        activeDrivers: driversResult.count || 0,
        pendingReviews: 0, // Would calculate from reviews
        supportTickets: ticketsResult.count || 0,
        flaggedContent: 0, // Would calculate from flagged content
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      onPress: () => router.push('/(app)/admin/users'),
      color: '#3B82F6',
    },
    {
      title: 'Service Management',
      description: 'Review and moderate services',
      icon: Package,
      onPress: () => router.push('/(app)/admin/services'),
      color: '#10B981',
    },
    {
      title: 'Content Moderation',
      description: 'Review flagged content and reports',
      icon: Shield,
      onPress: () => router.push('/(app)/admin/moderation'),
      color: '#F59E0B',
    },
    {
      title: 'Analytics & Reports',
      description: 'View platform analytics and generate reports',
      icon: TrendingUp,
      onPress: () => router.push('/(app)/admin/analytics'),
      color: '#8B5CF6',
    },
    {
      title: 'Financial Management',
      description: 'Manage payments, payouts, and fees',
      icon: DollarSign,
      onPress: () => router.push('/(app)/admin/financial'),
      color: '#059669',
    },
    {
      title: 'Support Tickets',
      description: 'Handle customer support requests',
      icon: MessageSquare,
      onPress: () => router.push('/(app)/admin/support'),
      color: '#DC2626',
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      onPress: () => router.push('/(app)/admin/settings'),
      color: '#6B7280',
    },
    {
      title: 'Reviews Management',
      description: 'Moderate reviews and ratings',
      icon: Star,
      onPress: () => router.push('/(app)/admin/reviews'),
      color: '#F59E0B',
    },
  ];

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: '#3B82F6' },
    { title: 'Active Services', value: stats.totalServices, icon: Package, color: '#10B981' },
    { title: 'Service Requests', value: stats.totalRequests, icon: MessageSquare, color: '#8B5CF6' },
    { title: 'Active Drivers', value: stats.activeDrivers, icon: Users, color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Task Runner Platform Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <stat.icon size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Management Tools</Text>
          <View style={styles.actionsGrid}>
            {adminActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {stats.supportTickets > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.sectionTitle}>Alerts</Text>
            <TouchableOpacity 
              style={styles.alertCard}
              onPress={() => router.push('/(app)/admin/support')}
            >
              <MessageSquare size={20} color="#DC2626" />
              <Text style={styles.alertText}>
                {stats.supportTickets} open support ticket{stats.supportTickets !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  alertsContainer: {
    marginBottom: 32,
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  alertText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 12,
    fontWeight: '600',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, Users, Package, DollarSign, Calendar } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  userGrowth: { period: string; count: number }[];
  serviceMetrics: { category: string; count: number; revenue: number }[];
  revenueData: { period: string; amount: number }[];
  topServices: { title: string; bookings: number; revenue: number }[];
}

export default function AnalyticsScreen() {
  const { profile } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userGrowth: [],
    serviceMetrics: [],
    revenueData: [],
    topServices: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAnalyticsData();
    }
  }, [profile, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch user growth data
      const { data: userGrowthData } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      // Fetch service metrics
      const { data: serviceData } = await supabase
        .from('services')
        .select(`
          id,
          title,
          category:categories(name),
          service_requests(id, price_quoted, status)
        `)
        .eq('is_active', true);

      // Process data for charts
      const processedUserGrowth = processUserGrowthData(userGrowthData || [], selectedPeriod);
      const processedServiceMetrics = processServiceMetrics(serviceData || []);
      const processedTopServices = processTopServices(serviceData || []);

      setAnalyticsData({
        userGrowth: processedUserGrowth,
        serviceMetrics: processedServiceMetrics,
        revenueData: [], // Would be calculated from transactions
        topServices: processedTopServices,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processUserGrowthData = (users: any[], period: string) => {
    const now = new Date();
    const periods = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'week') {
        date.setDate(date.getDate() - i * 7);
        periods.push({
          period: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          count: users.filter(u => {
            const userDate = new Date(u.created_at);
            return userDate >= date && userDate < new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
          }).length
        });
      } else if (period === 'month') {
        date.setMonth(date.getMonth() - i);
        periods.push({
          period: date.toLocaleDateString([], { month: 'short' }),
          count: users.filter(u => {
            const userDate = new Date(u.created_at);
            return userDate.getMonth() === date.getMonth() && userDate.getFullYear() === date.getFullYear();
          }).length
        });
      }
    }
    
    return periods;
  };

  const processServiceMetrics = (services: any[]) => {
    const categoryMap = new Map();
    
    services.forEach(service => {
      const categoryName = service.category?.name || 'Uncategorized';
      const existing = categoryMap.get(categoryName) || { count: 0, revenue: 0 };
      
      existing.count += 1;
      existing.revenue += service.service_requests?.reduce((sum: number, req: any) => 
        sum + (req.price_quoted || 0), 0) || 0;
      
      categoryMap.set(categoryName, existing);
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
  };

  const processTopServices = (services: any[]) => {
    return services
      .map(service => ({
        title: service.title,
        bookings: service.service_requests?.length || 0,
        revenue: service.service_requests?.reduce((sum: number, req: any) => 
          sum + (req.price_quoted || 0), 0) || 0,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  };

  const periodOptions = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics & Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.periodSelector}>
        {periodOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.periodButton,
              selectedPeriod === option.key && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(option.key as any)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === option.key && styles.periodButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Growth</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartPlaceholder}>
              <TrendingUp size={32} color="#6B7280" />
              <Text style={styles.chartPlaceholderText}>
                User growth chart would be rendered here
              </Text>
              <Text style={styles.chartData}>
                Total new users this {selectedPeriod}: {analyticsData.userGrowth.reduce((sum, item) => sum + item.count, 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Categories Performance</Text>
          {analyticsData.serviceMetrics.map((metric, index) => (
            <View key={index} style={styles.metricRow}>
              <Text style={styles.metricCategory}>{metric.category}</Text>
              <View style={styles.metricValues}>
                <Text style={styles.metricCount}>{metric.count} services</Text>
                <Text style={styles.metricRevenue}>${metric.revenue.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Services</Text>
          {analyticsData.topServices.map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <View style={styles.serviceRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.title}</Text>
                <Text style={styles.serviceStats}>
                  {service.bookings} bookings • ${service.revenue.toFixed(2)} revenue
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export Analytics Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Generate Financial Report</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  chartData: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  metricCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricValues: {
    alignItems: 'flex-end',
  },
  metricCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  metricRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceStats: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Clock, CircleCheck as CheckCircle, Circle as XCircle, Package } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase, Database } from '../../../src/lib/supabase';

type ServiceRequest = Database['public']['Tables']['service_requests']['Row'] & {
  service: {
    title: string;
    price: number | null;
    images: any[];
  };
  client: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  merchant: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
};

export default function RequestsScreen() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      fetchRequests();
      subscribeToRequests();
    }
  }, [user, filter]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          service:services(title, price, images),
          client:profiles!service_requests_client_id_fkey(username, avatar_url, full_name),
          merchant:profiles!service_requests_merchant_id_fkey(username, avatar_url, full_name)
        `);

      // Filter based on user role
      if (profile?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (profile?.role === 'merchant') {
        query = query.eq('merchant_id', user.id);
      }

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    if (!user) return;

    const subscription = supabase
      .channel('service_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      
      fetchRequests();
    } catch (error) {
      console.error('Error updating request status:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'accepted': return <CheckCircle size={16} color="#3B82F6" />;
      case 'in_progress': return <Package size={16} color="#8B5CF6" />;
      case 'completed': return <CheckCircle size={16} color="#10B981" />;
      case 'cancelled': return <XCircle size={16} color="#EF4444" />;
      default: return <Clock size={16} color="#6B7280" />;
    }
  };

  const renderRequestItem = ({ item }: { item: ServiceRequest }) => {
    const isClient = profile?.role === 'client';
    const otherParty = isClient ? item.merchant : item.client;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => router.push(`/(app)/requests/${item.id}`)}
      >
        <View style={styles.requestHeader}>
          <View style={styles.serviceInfo}>
            {item.service.images && item.service.images.length > 0 && (
              <Image source={{ uri: item.service.images[0] }} style={styles.serviceImage} />
            )}
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceTitle}>{item.service.title}</Text>
              <Text style={styles.requestDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.participantInfo}>
            {otherParty.avatar_url ? (
              <Image source={{ uri: otherParty.avatar_url }} style={styles.participantAvatar} />
            ) : (
              <View style={styles.participantAvatarPlaceholder}>
                <Text style={styles.participantAvatarText}>
                  {otherParty.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.participantName}>
                {otherParty.full_name || otherParty.username}
              </Text>
              <Text style={styles.participantRole}>
                {isClient ? 'Service Provider' : 'Client'}
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ${item.price_quoted?.toFixed(2) || item.service.price?.toFixed(2) || 'Quote'}
            </Text>
            <Text style={styles.requestDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {profile?.role === 'merchant' && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => updateRequestStatus(item.id, 'cancelled')}
            >
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => updateRequestStatus(item.id, 'accepted')}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {profile?.role === 'client' ? 'My Requests' : 'Service Requests'}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterButton,
              filter === option.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(option.key as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === option.key && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.requestsList}
        refreshing={loading}
        onRefresh={fetchRequests}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              {profile?.role === 'client' 
                ? 'Browse services to make your first request'
                : 'Requests will appear here when clients book your services'
              }
            </Text>
          </View>
        }
      />
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  requestsList: {
    padding: 24,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  participantRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  requestDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
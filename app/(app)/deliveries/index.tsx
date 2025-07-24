import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MapPin, Truck, Clock, DollarSign } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase, Database } from '../../../src/lib/supabase';
import * as Location from 'expo-location';

type Delivery = Database['public']['Tables']['deliveries']['Row'] & {
  service_request: {
    service: {
      title: string;
    };
    client: {
      username: string;
      full_name: string | null;
    };
  };
};

export default function DeliveriesScreen() {
  const { user, profile } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    if (profile?.role === 'driver') {
      requestLocationPermission();
      fetchDriverStatus();
      fetchDeliveries();
      subscribeToDeliveries();
    }
  }, [profile]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to receive delivery requests'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const fetchDriverStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('is_available')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      setIsAvailable(data?.is_available || false);
    } catch (error) {
      console.error('Error fetching driver status:', error);
    }
  };

  const fetchDeliveries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          service_request:service_requests(
            service:services(title),
            client:profiles!service_requests_client_id_fkey(username, full_name)
          )
        `)
        .or(`driver_id.eq.${user.id},driver_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToDeliveries = () => {
    const subscription = supabase
      .channel('deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const updateDriverAvailability = async (available: boolean) => {
    if (!user || !locationPermission) {
      Alert.alert('Error', 'Location permission is required to go online');
      return;
    }

    try {
      let location = null;
      
      if (available) {
        const currentLocation = await Location.getCurrentPositionAsync({});
        location = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      }

      const { error } = await supabase
        .from('driver_locations')
        .upsert({
          driver_id: user.id,
          latitude: location?.latitude,
          longitude: location?.longitude,
          is_available: available,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setIsAvailable(available);
    } catch (error) {
      console.error('Error updating driver availability:', error);
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          driver_id: user.id,
          status: 'assigned' 
        })
        .eq('id', deliveryId);

      if (error) throw error;
      
      fetchDeliveries();
      Alert.alert('Success', 'Delivery accepted!');
    } catch (error) {
      console.error('Error accepting delivery:', error);
      Alert.alert('Error', 'Failed to accept delivery');
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;
      
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'assigned': return '#3B82F6';
      case 'picked_up': return '#8B5CF6';
      case 'in_transit': return '#06B6D4';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderDeliveryItem = ({ item }: { item: Delivery }) => {
    const isMyDelivery = item.driver_id === user?.id;
    const canAccept = !item.driver_id && item.status === 'pending' && isAvailable;

    return (
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <Text style={styles.serviceTitle}>
            {item.service_request.service.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.clientName}>
          Client: {item.service_request.client.full_name || item.service_request.client.username}
        </Text>

        <View style={styles.locationInfo}>
          <View style={styles.locationItem}>
            <MapPin size={16} color="#10B981" />
            <Text style={styles.locationText}>Pickup: {item.pickup_location.address}</Text>
          </View>
          <View style={styles.locationItem}>
            <MapPin size={16} color="#EF4444" />
            <Text style={styles.locationText}>Delivery: {item.delivery_location.address}</Text>
          </View>
        </View>

        <View style={styles.deliveryFooter}>
          <View style={styles.deliveryDetails}>
            {item.distance_km && (
              <View style={styles.detailItem}>
                <Truck size={14} color="#6B7280" />
                <Text style={styles.detailText}>{item.distance_km.toFixed(1)} km</Text>
              </View>
            )}
            {item.delivery_fee && (
              <View style={styles.detailItem}>
                <DollarSign size={14} color="#6B7280" />
                <Text style={styles.detailText}>${item.delivery_fee.toFixed(2)}</Text>
              </View>
            )}
            {item.estimated_delivery_time && (
              <View style={styles.detailItem}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.detailText}>
                  {new Date(item.estimated_delivery_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>

          {canAccept && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => acceptDelivery(item.id)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          )}

          {isMyDelivery && item.status === 'assigned' && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={() => updateDeliveryStatus(item.id, 'picked_up')}
            >
              <Text style={styles.pickupButtonText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {isMyDelivery && item.status === 'picked_up' && (
            <TouchableOpacity
              style={styles.transitButton}
              onPress={() => updateDeliveryStatus(item.id, 'in_transit')}
            >
              <Text style={styles.transitButtonText}>In Transit</Text>
            </TouchableOpacity>
          )}

          {isMyDelivery && item.status === 'in_transit' && (
            <TouchableOpacity
              style={styles.deliveredButton}
              onPress={() => updateDeliveryStatus(item.id, 'delivered')}
            >
              <Text style={styles.deliveredButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (profile?.role !== 'driver') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Truck size={48} color="#D1D5DB" />
          <Text style={styles.accessDeniedText}>Driver access only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deliveries</Text>
        <View style={styles.availabilityToggle}>
          <Text style={styles.availabilityLabel}>
            {isAvailable ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={updateDriverAvailability}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor={isAvailable ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.deliveriesList}
        refreshing={loading}
        onRefresh={fetchDeliveries}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No deliveries available</Text>
            <Text style={styles.emptyText}>
              {isAvailable 
                ? 'New delivery requests will appear here'
                : 'Turn on availability to receive delivery requests'
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  deliveriesList: {
    padding: 24,
  },
  deliveryCard: {
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
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clientName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  locationInfo: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryDetails: {
    flexDirection: 'row',
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickupButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  transitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deliveredButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deliveredButtonText: {
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
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDeniedText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
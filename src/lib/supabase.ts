import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'task-runner-mobile',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          role: 'client' | 'merchant' | 'driver' | 'admin';
          avatar_url: string | null;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          role?: 'client' | 'merchant' | 'driver' | 'admin';
          avatar_url?: string | null;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          role?: 'client' | 'merchant' | 'driver' | 'admin';
          avatar_url?: string | null;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          merchant_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          price: number | null;
          price_type: 'fixed' | 'hourly' | 'per_item';
          duration_minutes: number;
          is_active: boolean;
          requires_delivery: boolean;
          service_area: string | null;
          images: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          category_id?: string | null;
          title: string;
          description?: string | null;
          price?: number | null;
          price_type?: 'fixed' | 'hourly' | 'per_item';
          duration_minutes?: number;
          is_active?: boolean;
          requires_delivery?: boolean;
          service_area?: string | null;
          images?: any[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          category_id?: string | null;
          title?: string;
          description?: string | null;
          price?: number | null;
          price_type?: 'fixed' | 'hourly' | 'per_item';
          duration_minutes?: number;
          is_active?: boolean;
          requires_delivery?: boolean;
          service_area?: string | null;
          images?: any[];
          created_at?: string;
          updated_at?: string;
        };
      };
      service_requests: {
        Row: {
          id: string;
          client_id: string;
          merchant_id: string;
          service_id: string;
          status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          description: string | null;
          scheduled_date: string | null;
          location: any | null;
          price_quoted: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          merchant_id: string;
          service_id: string;
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          description?: string | null;
          scheduled_date?: string | null;
          location?: any | null;
          price_quoted?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          merchant_id?: string;
          service_id?: string;
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          description?: string | null;
          scheduled_date?: string | null;
          location?: any | null;
          price_quoted?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          service_request_id: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_request_id: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_request_id?: string;
          reviewer_id?: string;
          reviewed_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          client_id: string;
          merchant_id: string;
          service_request_id: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          merchant_id: string;
          service_request_id?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          merchant_id?: string;
          service_request_id?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'image' | 'location';
          metadata: any;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'image' | 'location';
          metadata?: any;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'text' | 'image' | 'location';
          metadata?: any;
          is_read?: boolean;
          created_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          service_request_id: string;
          driver_id: string | null;
          pickup_location: any;
          delivery_location: any;
          status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
          estimated_delivery_time: string | null;
          actual_delivery_time: string | null;
          delivery_fee: number | null;
          distance_km: number | null;
          driver_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_request_id: string;
          driver_id?: string | null;
          pickup_location: any;
          delivery_location: any;
          status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
          estimated_delivery_time?: string | null;
          actual_delivery_time?: string | null;
          delivery_fee?: number | null;
          distance_km?: number | null;
          driver_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_request_id?: string;
          driver_id?: string | null;
          pickup_location?: any;
          delivery_location?: any;
          status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
          estimated_delivery_time?: string | null;
          actual_delivery_time?: string | null;
          delivery_fee?: number | null;
          distance_km?: number | null;
          driver_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          coordinates: any;
          base_fee: number;
          per_km_rate: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          coordinates: any;
          base_fee?: number;
          per_km_rate?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          coordinates?: any;
          base_fee?: number;
          per_km_rate?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      driver_locations: {
        Row: {
          id: string;
          driver_id: string;
          latitude: number | null;
          longitude: number | null;
          is_available: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          latitude?: number | null;
          longitude?: number | null;
          is_available?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_available?: boolean;
          updated_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_method_id: string | null;
          type: 'card' | 'bank_account' | 'digital_wallet';
          last_four: string | null;
          brand: string | null;
          is_default: boolean;
          is_active: boolean;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_method_id?: string | null;
          type: 'card' | 'bank_account' | 'digital_wallet';
          last_four?: string | null;
          brand?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_method_id?: string | null;
          type?: 'card' | 'bank_account' | 'digital_wallet';
          last_four?: string | null;
          brand?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          service_request_id: string | null;
          type: 'payment' | 'refund' | 'payout' | 'fee';
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          amount: number;
          currency: string;
          stripe_payment_intent_id: string | null;
          payment_method_id: string | null;
          description: string | null;
          metadata: any;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_request_id?: string | null;
          type: 'payment' | 'refund' | 'payout' | 'fee';
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          amount: number;
          currency?: string;
          stripe_payment_intent_id?: string | null;
          payment_method_id?: string | null;
          description?: string | null;
          metadata?: any;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_request_id?: string | null;
          type?: 'payment' | 'refund' | 'payout' | 'fee';
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          amount?: number;
          currency?: string;
          stripe_payment_intent_id?: string | null;
          payment_method_id?: string | null;
          description?: string | null;
          metadata?: any;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      admin_actions: {
        Row: {
          id: string;
          admin_id: string;
          action_type: string;
          target_type: string | null;
          target_id: string | null;
          description: string;
          metadata: any;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action_type: string;
          target_type?: string | null;
          target_id?: string | null;
          description: string;
          metadata?: any;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action_type?: string;
          target_type?: string | null;
          target_id?: string | null;
          description?: string;
          metadata?: any;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          description: string;
          category: 'general' | 'technical' | 'billing' | 'account' | 'service';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          assigned_to: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          description: string;
          category?: 'general' | 'technical' | 'billing' | 'account' | 'service';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          description?: string;
          category?: 'general' | 'technical' | 'billing' | 'account' | 'service';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
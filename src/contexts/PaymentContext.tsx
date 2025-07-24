import React, { createContext, useContext, useEffect, useState } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './AuthContext';

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  loading: boolean;
  addPaymentMethod: (paymentMethodId: string, metadata: any) => Promise<{ error: any }>;
  removePaymentMethod: (id: string) => Promise<{ error: any }>;
  setDefaultPaymentMethod: (id: string) => Promise<{ error: any }>;
  processPayment: (serviceRequestId: string, amount: number) => Promise<{ error: any }>;
  fetchTransactions: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
      fetchTransactions();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (paymentMethodId: string, metadata: any) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          stripe_payment_method_id: paymentMethodId,
          type: metadata.type || 'card',
          last_four: metadata.last_four,
          brand: metadata.brand,
          is_default: paymentMethods.length === 0, // First payment method is default
          metadata,
        });

      if (error) throw error;
      
      await fetchPaymentMethods();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const removePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      await fetchPaymentMethods();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      // Remove default from all payment methods
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      await fetchPaymentMethods();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const processPayment = async (serviceRequestId: string, amount: number) => {
    if (!user) return { error: 'No user logged in' };

    try {
      // This would integrate with your payment processing logic
      // For now, we'll create a transaction record
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          service_request_id: serviceRequestId,
          type: 'payment',
          amount,
          status: 'completed', // In production, this would be 'pending' initially
          description: `Payment for service request`,
        });

      if (error) throw error;
      
      await fetchTransactions();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    paymentMethods,
    transactions,
    loading,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    processPayment,
    fetchTransactions,
  };

  if (!publishableKey) {
    return (
      <PaymentContext.Provider value={value}>
        {children}
      </PaymentContext.Provider>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <PaymentContext.Provider value={value}>
        {children}
      </PaymentContext.Provider>
    </StripeProvider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
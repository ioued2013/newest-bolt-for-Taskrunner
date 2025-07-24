import { loadStripe } from '@stripe/stripe-react-native';

// Initialize Stripe
export const initializeStripe = async () => {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('Stripe publishable key is not configured');
  }

  return await loadStripe({
    publishableKey,
    merchantIdentifier: 'merchant.com.taskrunner', // Replace with your merchant ID
  });
};

// Payment processing utilities
export const createPaymentIntent = async (amount: number, currency = 'cad') => {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
      }),
    });

    const { client_secret } = await response.json();
    return client_secret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const confirmPayment = async (stripe: any, clientSecret: string, paymentMethodId: string) => {
  try {
    const { error, paymentIntent } = await stripe.confirmPayment(clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: {
        paymentMethodId,
      },
    });

    if (error) {
      throw error;
    }

    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};
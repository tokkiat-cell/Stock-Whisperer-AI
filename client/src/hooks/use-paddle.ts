import { useEffect, useState, useCallback } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle | null>(paddleInstance);
  const [isLoading, setIsLoading] = useState(!paddleInstance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paddleInstance) {
      setPaddle(paddleInstance);
      setIsLoading(false);
      return;
    }

    const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    
    if (!clientToken) {
      setError('Paddle client token not configured');
      setIsLoading(false);
      return;
    }

    const initPaddle = async () => {
      try {
        const instance = await initializePaddle({
          token: clientToken,
          environment: import.meta.env.VITE_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
        });
        
        if (instance) {
          paddleInstance = instance;
          setPaddle(instance);
        }
      } catch (err) {
        console.error('Failed to initialize Paddle:', err);
        setError('Failed to initialize payment system');
      } finally {
        setIsLoading(false);
      }
    };

    initPaddle();
  }, []);

  const openCheckout = useCallback((priceId: string, userEmail?: string, userId?: string) => {
    if (!paddle) {
      console.error('Paddle not initialized');
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: userEmail ? { email: userEmail } : undefined,
      customData: userId ? { userId } : undefined,
      settings: {
        successUrl: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`,
        displayMode: 'overlay',
        theme: 'dark',
      },
    });
  }, [paddle]);

  return {
    paddle,
    isLoading,
    error,
    openCheckout,
  };
}

import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: { eventHandler: (data: any) => void }) => void;
      Url: {
        Open: (url: string) => void;
      };
    };
    createLemonSqueezy?: () => void;
  }
}

export function useLemonSqueezy() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://app.lemonsqueezy.com/js/lemon.js"]');
    
    if (existingScript) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.defer = true;
    script.onload = () => {
      if (window.createLemonSqueezy) {
        window.createLemonSqueezy();
      }
      setIsReady(true);
    };
    script.onerror = () => {
      setError('Failed to load payment system');
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup - it should persist
    };
  }, []);

  const openCheckout = useCallback(async (tier: 'basic' | 'pro', userEmail?: string, userId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/lemonsqueezy/checkout', {
        tier,
        email: userEmail,
        userId,
      });
      
      const data = await response.json();
      
      if (!data.checkoutUrl) {
        throw new Error('Failed to create checkout');
      }

      // Open checkout in overlay if Lemon.js is ready
      if (window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(data.checkoutUrl);
      } else {
        // Fallback to redirect
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to open checkout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isReady,
    error,
    openCheckout,
  };
}

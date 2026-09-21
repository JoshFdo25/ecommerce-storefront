import { create } from 'zustand';
import { apiClient } from '@/lib/api';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  quantity: number;
  images?: string[];
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  guestSessionId: string | null;
  setIsOpen: (isOpen: boolean) => void;
  setItems: (items: CartItem[]) => void;
  getGuestSessionId: () => string | null;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const updateTimeouts: Record<string, NodeJS.Timeout> = {};



export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  guestSessionId: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setItems: (items) => set({ items }),
  getGuestSessionId: () => {
    if (typeof window !== 'undefined') {
      let sessionId = localStorage.getItem('guest_session_id');
      if (!sessionId) {
        // Generate cryptographically secure 32-byte hex string
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        sessionId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('guest_session_id', sessionId);
      }
      return sessionId;
    }
    return null;
  },
  fetchCart: async () => {
    try {
      const sessionId = get().getGuestSessionId();
      const res = await apiClient.get('/cart', {
        params: { guestSessionId: sessionId }
      });
      set({ items: res.data });
    } catch (error) {
      console.error('Failed to fetch cart', error);
    }
  },
  addToCart: async (productId: string, quantity: number) => {
    try {
      const sessionId = get().getGuestSessionId();
      await apiClient.post('/cart/add', {
        item: { productId, quantity },
        guestSessionId: sessionId
      });
      await get().fetchCart();
    } catch (error) {
      console.error('Failed to add to cart', error);
      throw error;
    }
  },
  updateQuantity: async (productId: string, quantity: number) => {
    // 1. Snapshot the previous state in case we need to roll back
    const previousItems = get().items;

    // 2. Optimistic UI Update (immediate)
    set((state) => ({
      items: state.items.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    }));

    // 3. Clear existing debounce timer
    if (updateTimeouts[productId]) {
      clearTimeout(updateTimeouts[productId]);
    }

    // 4. Debounce the API call by 500ms
    return new Promise((resolve, reject) => {
      updateTimeouts[productId] = setTimeout(async () => {
        try {
          const sessionId = get().getGuestSessionId();
          const res = await apiClient.put('/cart/update', {
            item: { productId, quantity },
            guestSessionId: sessionId
          });
          
          // SUCCESS: Do not call fetchCart(). The local optimistic state is already correct.
          // Optional Polish: Check if the backend clamped the inventory
          const updatedItem = res.data?.updatedItem;
          if (updatedItem && updatedItem.quantity !== quantity) {
            set((state) => ({
              items: state.items.map(item =>
                item.product_id === productId ? { ...item, quantity: updatedItem.quantity } : item
              )
            }));
          }

          resolve(undefined);
        } catch (error) {
          console.error('Failed to update quantity', error);
          // FAILURE: Revert ONLY if the request fails
          set({ items: previousItems });
          reject(error);
        }
      }, 500);
    });
  },
  removeFromCart: async (productId: string) => {
    const previousItems = get().items;
    // Optimistic UI
    set({ items: previousItems.filter(item => item.product_id !== productId) });

    try {
      const sessionId = get().getGuestSessionId();
      await apiClient.delete(`/cart/remove/${productId}`, {
        params: { guestSessionId: sessionId }
      });
    } catch (error) {
      set({ items: previousItems });
      console.error('Failed to remove item', error);
      throw error;
    }
  },
  clearCart: async () => {
    try {
      const sessionId = get().getGuestSessionId();
      await apiClient.delete('/cart/clear', {
        params: { guestSessionId: sessionId }
      });
      set({ items: [] });
    } catch (error) {
      console.error('Failed to clear cart', error);
    }
  }
}));

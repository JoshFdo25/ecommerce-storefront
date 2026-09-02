import { create } from 'zustand';

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  guestSessionId: string | null;
  setIsOpen: (isOpen: boolean) => void;
  setItems: (items: CartItem[]) => void;
  getGuestSessionId: () => string | null;
}

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
  }
}));

'use client';

import { useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCartStore } from '@/store/cart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export function CartSheet() {
  const { items, isOpen, setIsOpen, fetchCart, updateQuantity, removeFromCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen, fetchCart]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const handleCheckout = () => {
    setIsOpen(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2 text-2xl font-semibold">
            <ShoppingCart className="w-6 h-6" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p className="text-lg">Your cart is empty.</p>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Continue Shopping</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-4 items-start">
                  <div className="w-20 h-20 bg-neutral-100 rounded-md flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <Image 
                        src={item.images[0]} 
                        alt={item.name} 
                        fill 
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <span className="text-neutral-400 text-xs">No Image</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                    <p className="font-semibold mt-1">{formatCurrency(item.price)}</p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border rounded-md">
                        <button 
                          className="px-2 py-1 text-neutral-500 hover:text-black disabled:opacity-50"
                          disabled={item.quantity <= 1}
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 text-neutral-500 hover:text-black disabled:opacity-50"
                          disabled={item.quantity >= item.stock_quantity}
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-6 bg-neutral-50">
            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold text-lg">Subtotal</span>
              <span className="font-bold text-xl">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-sm text-neutral-500 mb-6">Shipping and taxes calculated at checkout.</p>
            <Button 
              className="w-full py-6 text-lg rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
              onClick={handleCheckout}
            >
              Initiate Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

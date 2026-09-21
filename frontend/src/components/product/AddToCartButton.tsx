'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    images: string[] | null;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addToCart, setIsOpen, items } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    const existingCartItem = items.find(item => item.product_id === product.id);
    if (existingCartItem && existingCartItem.quantity + quantity > product.stock_quantity) {
      toast.error('Cannot add more of this item', {
        description: `You already have ${existingCartItem.quantity} in your cart, and only ${product.stock_quantity} are available.`
      });
      return;
    }

    setIsAdding(true);
    
    try {
      await addToCart(product.id, quantity);
      
      toast.success('Added to cart', {
        description: `${quantity}x ${product.name} - ${formatCurrency(product.price * quantity)}`,
      });
    } catch (error: any) {
      toast.error('Failed to add item', {
        description: error.response?.data?.error || 'Please try again later.'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    await handleAddToCart();
    window.location.href = '/checkout';
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      {product.stock_quantity > 0 && (
        <div className="flex items-center gap-4 bg-muted/50 w-fit rounded-lg border border-border p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-md"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            -
          </Button>
          <span className="w-8 text-center font-medium text-sm">{quantity}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-md"
            onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
            disabled={quantity >= product.stock_quantity}
          >
            +
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button 
          size="lg" 
          className="w-full sm:flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          onClick={handleAddToCart}
          disabled={product.stock_quantity <= 0 || isAdding}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {product.stock_quantity > 0 ? (
            isAdding ? (
              <span className="flex items-center">
                Adding
                <span className="flex gap-0.5 ml-1 items-end h-3">
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </span>
            ) : 'Add to Cart'
          ) : 'Out of Stock'}
        </Button>
        
        {product.stock_quantity > 0 && (
          <Button 
            size="lg" 
            variant="secondary"
            className="w-full sm:flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={handleBuyNow}
            disabled={isAdding}
          >
            Buy Now
          </Button>
        )}
      </div>
    </div>
  );
}

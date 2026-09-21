'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  productId: string;
  stock: number;
  className?: string;
}

export function AddToCartButton({ productId, stock, className }: AddToCartButtonProps) {
  const { addToCart } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (stock <= 0) return;
    
    setIsAdding(true);
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart', {
        description: 'Your item has been added successfully.'
      });
    } catch (error: any) {
      toast.error('Failed to add item', {
        description: error.response?.data?.error || 'Please try again later.'
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button 
      onClick={handleAdd}
      disabled={isAdding || stock <= 0}
      className={`w-full ${className || ''}`}
      size="lg"
    >
      {isAdding ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : stock <= 0 ? (
        'Out of Stock'
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
  );
}

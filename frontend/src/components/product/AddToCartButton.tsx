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
  const { addItem, setIsOpen } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    setIsAdding(true);
    
    // Convert DB row format to cart item format
    const item = {
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400'
    };

    // Add to Zustand store
    addItem(item);
    
    toast.success('Added to cart', {
      description: `${product.name} - ${formatCurrency(product.price)}`,
    });

    // Open the cart slide-out
    setIsOpen(true);
    
    setTimeout(() => setIsAdding(false), 500);
  };

  return (
    <Button 
      size="lg" 
      className="w-full md:w-auto mt-6"
      onClick={handleAddToCart}
      disabled={product.stock_quantity <= 0 || isAdding}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {product.stock_quantity > 0 
        ? (isAdding ? 'Adding...' : 'Add to Cart') 
        : 'Out of Stock'}
    </Button>
  );
}

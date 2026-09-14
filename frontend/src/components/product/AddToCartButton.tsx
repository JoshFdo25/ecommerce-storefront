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

  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    setIsAdding(true);
    
    const item = {
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image_url: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400'
    };

    addItem(item);
    
    toast.success('Added to cart', {
      description: `${quantity}x ${product.name} - ${formatCurrency(product.price * quantity)}`,
    });

    setIsOpen(true);
    setTimeout(() => setIsAdding(false), 500);
  };

  const handleBuyNow = () => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    handleAddToCart();
    // In a real app, this would redirect to checkout
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
          {product.stock_quantity > 0 ? (isAdding ? 'Adding...' : 'Add to Cart') : 'Out of Stock'}
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

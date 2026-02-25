'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from './wishlist-provider';
import type { Product } from '@/lib/types';

interface WishlistButtonProps {
  product?: Product;
  productId?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function WishlistButton({ product, productId, className, variant = 'ghost', size = 'icon' }: WishlistButtonProps) {
  // Support both product object and productId for backwards compatibility
  const id = product?.id || productId;
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const isInList = id ? isInWishlist(id) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product && id) {
      toggleWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    } else if (id) {
      // Fallback: just toggle by ID if no product details provided
      // This won't show proper toast message but will update state
      toggleWishlist({
        id: id,
        name: '',
        price: 0,
        image: '',
      });
    }
  };

  if (!id) {
    return null;
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={cn(className, 'gap-0')} 
      onClick={handleClick} 
      aria-label={isInList ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={cn('h-5 w-5', isInList && 'fill-primary text-primary')} />
      {size !== 'icon' && <span className=""></span>}
    </Button>
  );
}

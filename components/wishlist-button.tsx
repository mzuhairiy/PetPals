'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from './wishlist-provider';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  const isInList = id ? isInWishlist(id) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is authenticated before toggling wishlist
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    
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

  const handleSignIn = () => {
    setShowAuthDialog(false);
    router.push('/sign-in');
  };

  const handleCancel = () => {
    setShowAuthDialog(false);
  };

  if (!id) {
    return null;
  }

  return (
    <>
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

      {/* Sign In Dialog for Anonymous Users */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to add items to your wishlist. Create an account to save your favorite products!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between flex-row gap-2">
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSignIn}
              className="flex-1"
            >
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

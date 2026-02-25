"use client"

import { useState } from "react"
import ProductQuantity from "@/components/product-quantity"
import AddToCartButton from "@/components/add-to-cart-button"
import WishlistButton from "@/components/wishlist-button"
import type { Product } from "@/lib/types"

interface AddToCartWithQuantityProps {
  product: Product
}

export default function AddToCartWithQuantity({ product }: AddToCartWithQuantityProps) {
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="pt-4 space-y-4">
      <ProductQuantity 
        maxQuantity={product.stock} 
        onQuantityChange={setQuantity}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <AddToCartButton 
          product={product} 
          quantity={quantity}
          className="flex-1" 
        />
        <WishlistButton 
          product={product} 
          variant="outline" 
          size="default" 
        />
      </div>
    </div>
  )
}

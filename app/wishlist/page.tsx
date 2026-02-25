"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useWishlist } from "@/components/wishlist-provider"
import { fetchProducts } from "@/lib/api"
import type { Product } from "@/lib/types"

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist } = useWishlist()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const { addToCart } = useCart()

  // Load all products from API
  useEffect(() => {
    const loadProducts = async () => {
      const products = await fetchProducts()
      setAllProducts(products)
    }
    loadProducts()
  }, [])

  // Get full product details for wishlist items
  const wishlistProducts = allProducts.filter((product) =>
    wishlistItems.some((item) => item.id === product.id)
  )

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    })
  }

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId)
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="container px-4 py-16 text-center">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="mt-6 text-3xl font-bold">Your wishlist is empty</h1>
        <p className="mt-2 text-muted-foreground">Save items you love to your wishlist and revisit them anytime.</p>
        <Button asChild className="mt-8">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="relative">
              <Link href={`/product/${product.slug}`}>
                <Image
                  src={product.image || "/placeholder.svg?height=300&width=300"}
                  alt={product.name}
                  width={300}
                  height={300}
                  className="w-full h-60 object-cover"
                />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-primary"
                onClick={() => handleRemove(product.id)}
              >
                <Trash2 className="h-5 w-5" />
                <span className="sr-only">Remove from wishlist</span>
              </Button>
            </div>
            <div className="p-4">
              <Link href={`/product/${product.slug}`} className="hover:underline">
                <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
              </Link>
              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="font-bold text-primary">${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</span>
                <Button onClick={() => handleAddToCart(product)} size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="outline">
          <Link href="/shop">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}

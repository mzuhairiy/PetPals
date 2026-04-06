"use client"

import Link from "next/link"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import ProductQuantity from "@/components/product-quantity"
import { SafeImage } from "@/components/safe-image"
import { formatPrice } from "@/lib/utils"

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart()

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const FREE_SHIPPING_THRESHOLD = 560000 // Rp 560,000
  const DEFAULT_SHIPPING_COST = 25000 // Rp 25,000
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST
  const total = subtotal + shipping

  if (cartItems.length === 0) {
    return (
      <div className="container px-4 py-16 text-center" data-testid="cart-empty-page">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="mt-6 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild className="mt-8">
          <Link href="/shop" data-testid="cart-empty-continue-shopping-link">Continue Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:py-12" data-testid="cart-page">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="rounded-lg border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold" data-testid="cart-items-count">
                  Cart Items ({cartItems.reduce((total, item) => total + item.quantity, 0)})
                </h2>
                <Button variant="ghost" size="sm" onClick={clearCart} data-testid="cart-clear-btn">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-6" data-testid="cart-items-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4" data-testid={`cart-item-${item.id}`}>
                    <div className="flex-shrink-0">
                      <SafeImage
                        src={item.image || "/placeholder.svg?height=100&width=100"}
                        alt={item.name}
                        width={100}
                        height={100}
                        data-testid={`cart-item-image-${item.id}`}
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <h3 className="font-medium" data-testid={`cart-item-name-${item.id}`}>{item.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`cart-item-price-${item.id}`}>{formatPrice(item.price)}</p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center">
                          <ProductQuantity
                            initialQuantity={item.quantity}
                            maxQuantity={10}
                            onQuantityChange={(quantity) => updateQuantity(item.id, quantity)}
                            testIdPrefix={`cart-item-${item.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                            data-testid={`cart-item-remove-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 sm:text-right font-medium" data-testid={`cart-item-total-${item.id}`}>{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Card className="p-6" data-testid="order-summary-card">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span data-testid="order-subtotal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span data-testid="order-shipping">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span data-testid="order-total">{formatPrice(total)}</span>
              </div>

              {subtotal < FREE_SHIPPING_THRESHOLD && (
                <div className="text-sm text-muted-foreground mt-2" data-testid="order-free-shipping-note">
                  Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more to qualify for free shipping
                </div>
              )}

              <Button asChild className="w-full mt-4">
                <Link href="/checkout" data-testid="checkout-btn">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-4">Secure checkout powered by Midtrans</div>
            </div>
          </Card>

          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href="/shop" data-testid="cart-continue-shopping-link">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

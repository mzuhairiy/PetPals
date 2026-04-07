"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCart } from "@/components/cart-provider"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ShieldCheck, Truck, ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Config from backend
const TAX_PERCENTAGE = 10
const FREE_SHIPPING_THRESHOLD = 560000 // Rp 560,000
const DEFAULT_SHIPPING_COST = 25000 // Rp 25,000

const checkoutSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  zipCode: z.string().min(4, "ZIP code must be at least 4 characters"),
  country: z.string().min(2, "Country is required"),
  notes: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, "You must agree to the terms")
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading checkout...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const { cartItems } = useCart()
  const { token, isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check for success state from URL
  useEffect(() => {
    const success = searchParams.get("success")
    if (success === "true") {
      setShowSuccess(true)
      // Clear the URL param
      router.replace("/checkout")
    }
  }, [searchParams, router])

  // Calculate default values from user
  const defaultValues: Partial<CheckoutFormData> = {
    firstName: user?.name?.split(' ')[0] || "",
    lastName: user?.name?.split(' ').slice(1).join(' ') || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Indonesia",
    notes: "",
    terms: false
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    setValue,
    watch
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues
  })

  // Watch all fields for saving to sessionStorage
  const formValues = watch()

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formValues).length > 0) {
        sessionStorage.setItem("checkout_form_data", JSON.stringify(formValues))
        // Also save cart signature
        const cartSignature = cartItems.map(item => item.id).sort().join(',')
        sessionStorage.setItem("checkout_cart_signature", cartSignature)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formValues, cartItems])

  // Load saved form data from sessionStorage on mount (only if cart matches)
  useEffect(() => {
    // Get current cart item IDs as a signature
    const currentCartIds = cartItems.map(item => item.id).sort().join(',')
    
    // Get saved cart signature
    const savedCartSignature = sessionStorage.getItem("checkout_cart_signature")
    const savedData = sessionStorage.getItem("checkout_form_data")
    
    // If cart is empty or cart has changed, clear form data
    if (cartItems.length === 0 || currentCartIds !== savedCartSignature) {
      sessionStorage.removeItem("checkout_form_data")
      sessionStorage.removeItem("checkout_cart_signature")
      return
    }
    
    // Load form data if cart matches
    if (savedData && currentCartIds === savedCartSignature) {
      try {
        const parsed = JSON.parse(savedData)
        Object.keys(parsed).forEach((key) => {
          if (key !== 'terms') {  // Don't restore terms checkbox
            setValue(key as keyof CheckoutFormData, parsed[key])
          }
        })
      } catch (e) {
        console.error("Failed to parse saved form data", e)
      }
    }
  }, [setValue, cartItems])

  // Clear form data from sessionStorage after successful order
  const clearFormData = () => {
    sessionStorage.removeItem("checkout_form_data")
  }

  // Calculate totals - prices from cart are already in IDR
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * (TAX_PERCENTAGE / 100))
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST
  const total = subtotal + tax + shipping

  const onSubmit = async (data: CheckoutFormData) => {
    // Check if user is authenticated
    if (!isAuthenticated || !token) {
      toast({
        title: "Authentication required",
        description: "Please login to place an order.",
        variant: "destructive"
      })
      router.push("/sign-in?redirect=checkout")
      return
    }

    // Prevent empty cart
    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create Order only (payment will be done on next page)
      console.log("Creating order with API_URL:", API_URL)
      const orderResponse = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          shippingAddress: {
            street: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country
          }
        })
      })

      const orderResult = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderResult.error?.message || "Failed to create order")
      }

      const { orderId, paymentId } = orderResult.data

      // Clear form data only - cart will be cleared after successful payment
      clearFormData()

      // Redirect to checkout payment page with order ID
      router.push(`/checkout/${orderId}`)
    } catch (error: any) {
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="container px-4 py-16 text-center" data-testid="checkout-success-page">
        <div className="flex justify-center mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4" data-testid="checkout-success-title">Order Placed Successfully!</h1>
        <p className="text-muted-foreground mb-8" data-testid="checkout-success-message">
          Thank you for your order. Your payment has been processed and your order is being prepared for shipment.
        </p>
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/shop" data-testid="checkout-success-continue-shopping-link">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/orders" data-testid="checkout-success-view-orders-link">View Order History</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container px-4 py-16 text-center" data-testid="checkout-empty-cart">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some items to your cart before proceeding to checkout.</p>
        <Button asChild className="mt-8">
          <Link href="/shop" data-testid="checkout-empty-shop-link">Shop Now</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:py-12" data-testid="checkout-page">
      <div className="mb-8">
        <Link href="/cart" className="flex items-center text-sm text-primary hover:underline" data-testid="checkout-back-to-cart-link">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Cart
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="checkout-form">
            <div className="space-y-8">
              {/* Shipping Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Shipping Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      onBlur={() => trigger("firstName")}
                      className={errors.firstName ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-first-name-input"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs" data-testid="checkout-first-name-error">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      onBlur={() => trigger("lastName")}
                      className={errors.lastName ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-last-name-input"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs" data-testid="checkout-last-name-error">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    onBlur={() => trigger("email")}
                    className={errors.email ? "border-red-500" : ""}
                    disabled={isSubmitting}
                    data-testid="checkout-email-input"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs" data-testid="checkout-email-error">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    onBlur={() => trigger("phone")}
                    className={errors.phone ? "border-red-500" : ""}
                    disabled={isSubmitting}
                    data-testid="checkout-phone-input"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs" data-testid="checkout-phone-error">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    onBlur={() => trigger("address")}
                    className={errors.address ? "border-red-500" : ""}
                    disabled={isSubmitting}
                    data-testid="checkout-address-input"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs" data-testid="checkout-address-error">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      onBlur={() => trigger("city")}
                      className={errors.city ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-city-input"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-xs" data-testid="checkout-city-error">{errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      onBlur={() => trigger("state")}
                      className={errors.state ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-state-input"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-xs" data-testid="checkout-state-error">{errors.state.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                    <Input
                      id="zipCode"
                      {...register("zipCode")}
                      onBlur={() => trigger("zipCode")}
                      className={errors.zipCode ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-zip-code-input"
                    />
                    {errors.zipCode && (
                      <p className="text-red-500 text-xs" data-testid="checkout-zip-code-error">{errors.zipCode.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...register("country")}
                      onBlur={() => trigger("country")}
                      className={errors.country ? "border-red-500" : ""}
                      disabled={isSubmitting}
                      data-testid="checkout-country-input"
                    />
                    {errors.country && (
                      <p className="text-red-500 text-xs" data-testid="checkout-country-error">{errors.country.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Additional Information</h2>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Special instructions for delivery"
                    disabled={isSubmitting}
                    data-testid="checkout-notes-input"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  {...register("terms")}
                  className="rounded border-gray-300"
                  data-testid="checkout-terms-checkbox"
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline" data-testid="checkout-terms-link">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline" data-testid="checkout-privacy-link">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-red-500 text-xs" data-testid="checkout-terms-error">{errors.terms.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="checkout-submit-btn">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Continue to Payment - Rp ${total.toLocaleString('id-ID')}`
                )}
              </Button>
            </div>
          </form>
        </div>

        <div>
          <Card className="p-6" data-testid="checkout-order-summary-card">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-4 pr-2" data-testid="checkout-order-items-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4" data-testid={`checkout-order-item-${item.id}`}>
                    <div className="flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg?height=60&width=60"}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium mt-1">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="checkout-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({TAX_PERCENTAGE}%)</span>
                  <span data-testid="checkout-tax">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span data-testid="checkout-shipping">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span data-testid="checkout-total">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary mr-2" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center text-sm">
                  <Truck className="h-4 w-4 text-primary mr-2" />
                  <span>Free shipping on orders over Rp 560.000</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

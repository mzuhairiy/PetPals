"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""

interface OrderData {
  orderId: string
  total: number
  status: string
  items: Array<{
    product: {
      name: string
    }
    quantity: number
    price: number
  }>
}

export default function CheckoutPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { token, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [snapToken, setSnapToken] = useState<string | null>(null)
  const isInitialized = useRef(false)

  // Check for payment result from URL params
  const paymentStatus = searchParams.get("status")
  const paymentOrderId = searchParams.get("order_id")

  // Reset initialization when orderId changes
  useEffect(() => {
    isInitialized.current = false
  }, [orderId])

  useEffect(() => {
    // If we have payment status in URL, show appropriate message
    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({
          title: "Payment Successful",
          description: "Your order has been placed successfully!",
          variant: "default"
        })
        router.push("/account?tab=orders")
      } else if (paymentStatus === "pending") {
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. We'll notify you once it's confirmed.",
          variant: "default"
        })
      } else if (paymentStatus === "error") {
        toast({
          title: "Payment Failed",
          description: "There was an issue with your payment. Please try again.",
          variant: "destructive"
        })
      }
      return
    }

    // Otherwise, load order and initialize payment
    const initializePayment = async () => {
      // Prevent double initialization (React StrictMode)
      if (isInitialized.current) {
        console.log("Already initialized, skipping...")
        return
      }

      if (!isAuthenticated || !token) {
        console.log("Not authenticated, redirecting to sign-in")
        router.push("/sign-in?redirect=checkout")
        return
      }

      // Mark as initialized AFTER auth check passes
      isInitialized.current = true

      try {
        console.log("Fetching order details for:", orderId)
        // Fetch order details
        const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        console.log("Order response status:", orderResponse.status)

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json()
          throw new Error(errorData.error?.message || "Failed to fetch order")
        }

        const orderResult = await orderResponse.json()
        console.log("Order result:", orderResult)
        setOrderData(orderResult.data)

        // Get Snap token
        console.log("Getting snap token for order:", orderId)
        const snapResponse = await fetch(`${API_URL}/api/payments/midtrans/snap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId
          })
        })

        console.log("Snap response status:", snapResponse.status)

        // Handle any 2xx response as success
        const isSuccess = snapResponse.status >= 200 && snapResponse.status < 300
        const snapResult = await snapResponse.json()
        console.log("Snap result:", snapResult)
        
        if (!isSuccess) {
          console.error("Snap error response:", snapResult)
          throw new Error(snapResult.error?.message || `Failed to initialize payment (${snapResponse.status})`)
        }

        setSnapToken(snapResult.data.snapToken)

      } catch (error: any) {
        console.error("Payment initialization error:", error)
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          toast({
            title: "Connection Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to initialize payment",
            variant: "destructive"
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializePayment()
  }, [orderId, token, isAuthenticated])

  // Handle Snap payment
  useEffect(() => {
    if (!snapToken || typeof window === "undefined") return

    // Load Snap JS
    const script = document.createElement("script")
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js"
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY)
    script.async = true

    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snap = (window as any).snap
      if (snap) {
        setIsProcessing(true)
        snap.pay(snapToken, {
          onSuccess: (result: any) => {
            console.log("Payment success:", result)
            toast({
              title: "Payment Successful",
              description: "Your order has been placed successfully!",
              variant: "default"
            })
            // Clear cart and redirect to orders
            router.push("/account?tab=orders")
          },
          onPending: (result: any) => {
            console.log("Payment pending:", result)
            toast({
              title: "Payment Pending",
              description: "Your payment is being processed.",
              variant: "default"
            })
          },
          onError: (result: any) => {
            console.error("Payment error:", result)
            toast({
              title: "Payment Failed",
              description: "Please try again or use a different payment method.",
              variant: "destructive"
            })
          },
          onClose: () => {
            console.log("Customer closed the popup")
            setIsProcessing(false)
          }
        })
      }
    }

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [snapToken, router, toast])

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="container flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">We couldn't find this order.</p>
          <Button onClick={() => router.push("/shop")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:py-12">
      <Card className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-medium">{orderData.orderId}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Items</span>
            <span>{orderData.items.length} item(s)</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${Number(orderData.total).toFixed(2)}</span>
          </div>
        </div>

        {isProcessing ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Opening payment window...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You will be redirected to Midtrans to complete your payment securely.
            </p>

            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Pay Now
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/account?tab=orders")}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Test mode: Use card number 4811 1111 1111 1114, any future date, any CVC
      </p>
    </div>
  )
}

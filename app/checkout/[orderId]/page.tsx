"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/components/ui/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""

interface OrderData {
  id: string
  total: number
  status: string
  items: Array<{
    nameSnapshot: string
    quantity: number
    price: number
  }>
}

export default function CheckoutPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { token, isAuthenticated } = useAuth()
  const { clearCart } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingToken, setIsCreatingToken] = useState(false)

  // Handle Back button - save form state before leaving
  const handleBack = () => {
    router.push("/checkout")
  }

  // Handle payment success - redirect to checkout with success state
  const handlePaymentSuccess = () => {
    router.push("/checkout?success=true")
  }

  // Fetch order details on page load
  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated || !token) {
        router.push("/sign-in?redirect=checkout")
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Failed to fetch order")
        }

        const result = await response.json()
        setOrderData(result.data)
      } catch (error: any) {
        console.error("Error fetching order:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to load order",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, token, isAuthenticated, router, toast])

  // Handle Pay Now button click
  const handlePayNow = async () => {
    if (!token) {
      router.push("/sign-in?redirect=checkout")
      return
    }

    setIsCreatingToken(true)

    try {
      // Create Snap token
      const snapResponse = await fetch(`${API_URL}/api/payments/midtrans/snap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      })

      const snapResult = await snapResponse.json()

      if (!snapResponse.ok || !snapResult.success) {
        throw new Error(snapResult.error?.message || "Failed to create payment token")
      }

      const snapToken = snapResult.data.snapToken

      // Load Snap JS and open modal
      if (typeof window !== "undefined" && snapToken) {
        // Dynamically load Snap JS
        const existingScript = document.querySelector('script[data-client-key]')
        if (!existingScript) {
          const script = document.createElement("script")
          script.src = "https://app.sandbox.midtrans.com/snap/snap.js"
          script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY)
          script.async = true
          document.body.appendChild(script)

          script.onload = () => {
            openSnapModal(snapToken)
          }
        } else {
          openSnapModal(snapToken)
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      })
    } finally {
      setIsCreatingToken(false)
    }
  }

  // Open Snap modal
  const openSnapModal = (snapToken: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = (window as any).snap
    if (snap) {
      snap.pay(snapToken, {
        onSuccess: (result: unknown) => {
          console.log("Payment success:", result)
          // Clear cart only after successful payment
          clearCart()
          toast({
            title: "Payment Successful",
            description: "Your order has been placed successfully!",
            variant: "default"
          })
          handlePaymentSuccess()
        },
        onPending: (result: unknown) => {
          console.log("Payment pending:", result)
          toast({
            title: "Payment Pending",
            description: "Your payment is being processed.",
            variant: "default"
          })
        },
        onError: (result: unknown) => {
          console.error("Payment error:", result)
          toast({
            title: "Payment Failed",
            description: "Please try again or use a different payment method.",
            variant: "destructive"
          })
        },
        onClose: () => {
          console.log("Customer closed the popup")
        }
      })
    }
  }

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
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Checkout
        </Button>
      </div>

      <Card className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-medium">{orderData.id.slice(0, 8)}...</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Items</span>
            <span>{orderData.items.length} item(s)</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>Rp {orderData.total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <Button
          onClick={handlePayNow}
          disabled={isCreatingToken}
          className="w-full"
        >
          {isCreatingToken ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Test mode: Use card number 4811 1111 1111 1114
        </p>
      </Card>
    </div>
  )
}

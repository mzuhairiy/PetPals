"use client"

import { useState, useEffect, use, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ArrowLeft, ExternalLink, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/components/ui/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005"
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
  return (
    <Suspense fallback={
      <div className="container flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment...</p>
        </div>
      </div>
    }>
      <CheckoutPaymentContent params={params} />
    </Suspense>
  )
}

function CheckoutPaymentContent({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { token, isAuthenticated } = useAuth()
  const { clearCart } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingToken, setIsCreatingToken] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [snapPopupFailed, setSnapPopupFailed] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  // Handle Back button
  const handleBack = () => {
    router.push("/checkout")
  }

  // Handle payment success
  const handlePaymentSuccess = useCallback(() => {
    clearCart()
    router.push("/checkout?success=true")
  }, [clearCart, router])

  // Check payment status manually or from redirect
  const checkPaymentStatus = useCallback(async () => {
    if (!token) return

    setIsCheckingStatus(true)
    try {
      const response = await fetch(`${API_URL}/api/payments/midtrans/status/${orderId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        const pStatus = result.data?.payment?.status
        const oStatus = result.data?.status

        setPaymentStatus(pStatus)

        if (pStatus === "PAID" || oStatus === "PROCESSING") {
          toast({
            title: "Payment Successful",
            description: "Your payment has been confirmed!",
            variant: "default",
            dataTestId: "toast-payment-success",
          })
          handlePaymentSuccess()
          return
        }

        if (pStatus === "FAILED" || pStatus === "EXPIRED" || pStatus === "CANCELLED") {
          toast({
            title: "Payment " + pStatus.charAt(0) + pStatus.slice(1).toLowerCase(),
            description: "Please try again or use a different payment method.",
            variant: "destructive",
            dataTestId: "toast-payment-status-failed",
          })
          return
        }

        // Still pending
        toast({
          title: "Payment Pending",
          description: "Your payment is still being processed. Please complete payment or wait a moment.",
          dataTestId: "toast-payment-status-pending",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to check payment status. Please try again.",
        variant: "destructive",
        dataTestId: "toast-payment-status-error",
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }, [token, orderId, toast, handlePaymentSuccess])

  // Handle redirect back from Midtrans (?status=unfinish or ?status=error)
  useEffect(() => {
    const status = searchParams.get("status")
    if (status === "unfinish") {
      toast({
        title: "Payment Not Completed",
        description: "You left the payment page before completing. You can try again or check status.",
        variant: "destructive",
        dataTestId: "toast-payment-unfinish",
      })
    } else if (status === "error") {
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
        dataTestId: "toast-payment-error-redirect",
      })
    }
  }, [searchParams, toast])

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
          variant: "destructive",
          dataTestId: "toast-payment-fetch-error",
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
    setSnapPopupFailed(false)
    setPaymentStatus(null)

    try {
      // Step 1: Create Snap token from backend
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
      const snapRedirectUrl = snapResult.data.redirectUrl

      // Always store redirect URL
      if (snapRedirectUrl) {
        setRedirectUrl(snapRedirectUrl)
      }

      if (typeof window === "undefined" || !snapToken) return

      // Step 2: Try loading Snap JS and opening popup
      const snapLoaded = await loadSnapScript()

      if (!snapLoaded) {
        console.error("Snap JS failed to load")
        showCdnFailure(snapRedirectUrl)
        return
      }

      // Step 3: Call snap.pay() and monitor if popup actually renders
      const popupRendered = await trySnapPopup(snapToken)

      if (!popupRendered) {
        console.error("Snap popup did not render - CDN assets likely blocked")
        showCdnFailure(snapRedirectUrl)
      }

    } catch (error: any) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
        dataTestId: "toast-payment-init-error",
      })
    } finally {
      setIsCreatingToken(false)
    }
  }

  // Load Snap JS script with timeout
  const loadSnapScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-client-key]')

      if (existingScript) {
        resolve(true)
        return
      }

      const script = document.createElement("script")
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js"
      script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY)
      script.async = true

      const timeout = setTimeout(() => {
        console.warn("Snap JS load timeout (10s)")
        resolve(false)
      }, 10000)

      script.onload = () => {
        clearTimeout(timeout)
        resolve(true)
      }

      script.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }

      document.body.appendChild(script)
    })
  }

  // Try opening Snap popup and detect if it actually renders
  const trySnapPopup = (snapToken: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const snap = (window as any).snap
      if (!snap) {
        resolve(false)
        return
      }

      let callbackFired = false
      const markCallbackFired = () => { callbackFired = true }

      try {
        snap.pay(snapToken, {
          onSuccess: (result: unknown) => {
            markCallbackFired()
            console.log("Payment success:", result)
            toast({
              title: "Payment Successful",
              description: "Your order has been placed successfully!",
              variant: "default",
              dataTestId: "toast-payment-success",
            })
            handlePaymentSuccess()
          },
          onPending: (result: unknown) => {
            markCallbackFired()
            console.log("Payment pending:", result)
            toast({
              title: "Payment Pending",
              description: "Your payment is being processed.",
              variant: "default",
              dataTestId: "toast-payment-pending",
            })
          },
          onError: (result: unknown) => {
            markCallbackFired()
            console.error("Payment error:", result)
            toast({
              title: "Payment Failed",
              description: "Please try again or use a different payment method.",
              variant: "destructive",
              dataTestId: "toast-payment-failed",
            })
          },
          onClose: () => {
            markCallbackFired()
            console.log("Customer closed the popup")
          }
        })
      } catch (err) {
        console.error("snap.pay() threw:", err)
        resolve(false)
        return
      }

      // Monitor DOM for Snap popup rendering
      // snap.pay() doesn't throw when CDN assets fail — it fails silently
      let checks = 0
      const maxChecks = 10 // 10 × 500ms = 5 seconds
      const checkInterval = setInterval(() => {
        checks++

        const snapModal =
          document.getElementById("snap-midtrans") ||
          document.querySelector('iframe[title*="midtrans" i]') ||
          document.querySelector('iframe[src*="midtrans"]') ||
          document.querySelector('iframe[src*="snap"]') ||
          document.querySelector('[class*="snap"]')

        if (snapModal) {
          clearInterval(checkInterval)
          resolve(true)
          return
        }

        if (checks >= maxChecks) {
          clearInterval(checkInterval)
          resolve(callbackFired)
        }
      }, 500)
    })
  }

  // Show CDN failure state
  const showCdnFailure = (url?: string) => {
    setSnapPopupFailed(true)
    if (url) {
      setRedirectUrl(url)
    }
    toast({
      title: "Payment Popup Failed",
      description: "Could not load payment popup due to a network issue. Please use the redirect link below.",
      variant: "destructive",
      dataTestId: "toast-snap-cdn-failed",
    })
  }

  // Auto-poll payment status when redirect fallback is shown
  useEffect(() => {
    if (!snapPopupFailed || !redirectUrl || !token) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/payments/midtrans/status/${orderId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })

        if (response.ok) {
          const result = await response.json()
          const pStatus = result.data?.payment?.status
          const oStatus = result.data?.status

          setPaymentStatus(pStatus)

          if (pStatus === "PAID" || oStatus === "PROCESSING") {
            clearInterval(pollInterval)
            toast({
              title: "Payment Successful",
              description: "Your payment has been confirmed!",
              variant: "default",
              dataTestId: "toast-payment-success",
            })
            handlePaymentSuccess()
          } else if (pStatus === "FAILED" || pStatus === "EXPIRED" || pStatus === "CANCELLED") {
            clearInterval(pollInterval)
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [snapPopupFailed, redirectUrl, orderId, token, toast, handlePaymentSuccess])

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
      <div className="container flex items-center justify-center min-h-screen px-4" data-testid="payment-order-not-found">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">We couldn&apos;t find this order.</p>
          <Button onClick={() => router.push("/shop")} data-testid="payment-not-found-shop-btn">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:py-12" data-testid="payment-page">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} data-testid="payment-back-btn">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Checkout
        </Button>
      </div>

      <Card className="max-w-lg mx-auto p-6" data-testid="payment-card">
        <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-medium" data-testid="payment-order-id">{orderData.id.slice(0, 8)}...</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Items</span>
            <span data-testid="payment-items-count">{orderData.items.length} item(s)</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span data-testid="payment-total">Rp {orderData.total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Pay Now button */}
        <Button
          onClick={handlePayNow}
          disabled={isCreatingToken}
          className="w-full"
          data-testid="payment-pay-now-btn"
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

        {/* CDN failure: show redirect fallback with Check Status */}
        {snapPopupFailed && redirectUrl && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg space-y-4" data-testid="payment-cdn-failed">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-semibold">
                Payment popup could not load
              </p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Your network is blocking the Midtrans payment popup. Please use the link below to complete your payment, then check the status.
            </p>

            {/* Open Payment Page button */}
            <a
              href={redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="payment-redirect-link"
            >
              Open Payment Page <ExternalLink className="h-4 w-4" />
            </a>

            {/* Check Payment Status button */}
            <Button
              onClick={checkPaymentStatus}
              disabled={isCheckingStatus}
              variant="outline"
              className="w-full"
              data-testid="payment-check-status-btn"
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Payment Status"
              )}
            </Button>

            {/* Payment status indicator */}
            {paymentStatus && (
              <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                paymentStatus === "PAID" 
                  ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                  : paymentStatus === "PENDING"
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
              }`} data-testid="payment-status-indicator">
                {paymentStatus === "PAID" ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : paymentStatus === "PENDING" ? (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>
                  Status: <strong>{paymentStatus}</strong>
                  {paymentStatus === "PENDING" && " — Complete payment in the Midtrans page, then check again."}
                </span>
              </div>
            )}

            <p className="text-xs text-center text-amber-600 dark:text-amber-400">
              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
              Auto-checking every 5 seconds...
            </p>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-4" data-testid="payment-test-mode-note">
          Test mode: Use card number 4811 1111 1111 1114
        </p>
      </Card>
    </div>
  )
}

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export type WishlistItem = {
  id: string
  name: string
  price: number
  image: string
}

type WishlistContextType = {
  wishlistItems: WishlistItem[]
  addToWishlist: (item: WishlistItem) => Promise<void>
  removeFromWishlist: (id: string) => Promise<void>
  isInWishlist: (id: string) => boolean
  toggleWishlist: (item: WishlistItem) => Promise<void>
  isLoading: boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { isAuthenticated, token } = useAuth()

  // Get auth token from localStorage
  const getToken = () => localStorage.getItem("token")

  // Load wishlist from backend when user logs in
  useEffect(() => {
    const loadWishlist = async () => {
      const authToken = getToken()
      
      if (!authToken) {
        // Not authenticated - load from localStorage as fallback
        const savedWishlist = localStorage.getItem("wishlistItems")
        if (savedWishlist) {
          try {
            setWishlistItems(JSON.parse(savedWishlist))
          } catch (error) {
            console.error("Failed to parse wishlist from localStorage:", error)
          }
        }
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/wishlist`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        })

        // If unauthorized (invalid/expired token), fall back to localStorage
        if (response.status === 401) {
          console.warn("Wishlist auth failed, using localStorage")
          const savedWishlist = localStorage.getItem("wishlistItems")
          if (savedWishlist) {
            try {
              setWishlistItems(JSON.parse(savedWishlist))
            } catch (e) {
              console.error("Failed to parse localStorage wishlist:", e)
            }
          }
          setIsLoading(false)
          return
        }

        if (response.ok) {
          const result = await response.json()
          // Transform backend data to frontend format
          const items = result.data.map((item: any) => ({
            id: item.product.id,
            name: item.product.name,
            price: Number(item.product.price),
            image: item.product.image || ''
          }))
          setWishlistItems(items)
          // Also save to localStorage as backup
          localStorage.setItem("wishlistItems", JSON.stringify(items))
        }
      } catch (error) {
        console.error("Failed to fetch wishlist:", error)
        // Fallback to localStorage
        const savedWishlist = localStorage.getItem("wishlistItems")
        if (savedWishlist) {
          try {
            setWishlistItems(JSON.parse(savedWishlist))
          } catch (e) {
            console.error("Failed to parse localStorage wishlist:", e)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadWishlist()
  }, [isAuthenticated])

  // Save wishlist to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("wishlistItems", JSON.stringify(wishlistItems))
      localStorage.setItem("wishlist", JSON.stringify(wishlistItems.map((item) => item.id)))
    }
  }, [wishlistItems, isLoading])

  const addToWishlist = async (item: WishlistItem) => {
    const authToken = getToken()

    if (!authToken) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add items to your wishlist.",
        variant: "destructive",
        dataTestId: "toast-wishlist-signin-required",
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ productId: item.id })
      })

      if (response.ok) {
        setWishlistItems((prev) => {
          if (prev.some((i) => i.id === item.id)) {
            return prev
          }
          return [...prev, item]
        })
        toast({
          title: "Added to wishlist",
          description: `${item.name} has been added to your wishlist`,
          dataTestId: "toast-wishlist-item-added",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error?.message || "Failed to add to wishlist",
          variant: "destructive",
          dataTestId: "toast-wishlist-add-error",
        })
      }
    } catch (error) {
      console.error("Failed to add to wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to add to wishlist. Please try again.",
        variant: "destructive",
        dataTestId: "toast-wishlist-add-error",
      })
    }
  }

  const removeFromWishlist = async (id: string) => {
    const item = wishlistItems.find((i) => i.id === id)
    const authToken = getToken()

    if (!authToken) {
      // Just remove locally if not authenticated
      setWishlistItems((prev) => prev.filter((item) => item.id !== id))
      if (item) {
        toast({
          title: "Removed from wishlist",
          description: `${item.name} has been removed from your wishlist`,
          dataTestId: "toast-wishlist-item-removed",
        })
      }
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      setWishlistItems((prev) => prev.filter((item) => item.id !== id))
      if (item) {
        toast({
          title: "Removed from wishlist",
          description: `${item.name} has been removed from your wishlist`,
          dataTestId: "toast-wishlist-item-removed",
        })
      }
    } catch (error) {
      console.error("Failed to remove from wishlist:", error)
      // Still remove locally on error
      setWishlistItems((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const isInWishlist = (id: string): boolean => {
    return wishlistItems.some((item) => item.id === id)
  }

  const toggleWishlist = async (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      await removeFromWishlist(item.id)
    } else {
      await addToWishlist(item)
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        isLoading
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}

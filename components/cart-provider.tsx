"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"

export type CartItem = {
  id: string
  name: string
  price: number
  image: string
  quantity: number
}

type CartContextType = {
  cartItems: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const { toast } = useToast()

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error)
      }
    }
  }, [])

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (item: CartItem) => {
    let message = ""
    let shouldToast = false

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)

      if (existingItem) {
        message = `${item.name} quantity updated to ${existingItem.quantity + item.quantity}`
        shouldToast = true
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      } else {
        message = `${item.name} added to your cart`
        shouldToast = true
        return [...prevItems, { ...item, quantity: item.quantity }]
      }
    })

    // Defer toast to avoid React error
    if (shouldToast) {
      setTimeout(() => {
        toast({
          title: "Item added to cart",
          description: message,
          dataTestId: "toast-cart-item-added",
        })
      }, 0)
    }
  }

  const removeFromCart = (id: string) => {
    // Find item BEFORE state update so we can use it in toast
    const itemToRemove = cartItems.find((i) => i.id === id)
    
    setCartItems((prevItems) => {
      return prevItems.filter((item) => item.id !== id)
    })

    // Defer toast to avoid React error - call toast AFTER setCartItems
    if (itemToRemove) {
      setTimeout(() => {
        toast({
          title: "Item removed",
          description: `${itemToRemove.name} removed from your cart`,
          dataTestId: "toast-cart-item-removed",
        })
      }, 0)
    }
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id)
      return
    }

    setCartItems((prevItems) => prevItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setCartItems([])
    // Defer toast to avoid React error: Cannot update a component while rendering another
    setTimeout(() => {
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
        dataTestId: "toast-cart-cleared",
      })
    }, 0)
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

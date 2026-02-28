import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from "@/components/cart-provider"
import { WishlistProvider } from "@/components/wishlist-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/error-boundary"
import LayoutClient from "./layout-client"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "PetPals - What your pet needs, when they need it",
  description: "Premium pet products for cats and dogs with same-day delivery",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
    <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ErrorBoundary>
                <LayoutClient>
                  {children}
                </LayoutClient>
                <Toaster />
              </ErrorBoundary>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

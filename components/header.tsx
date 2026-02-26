"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Search, Menu, X, User, Heart, PawPrint, Cat, Dog, LogOut, Loader2 } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { searchProducts } from "@/lib/api"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { cartItems } = useCart()
  const { user, isAuthenticated, logout } = useAuth()

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchProducts(searchQuery)
        setSearchResults(results)
        setShowResults(results.length > 0)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      closeSearch()
    }
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])
    setShowResults(false)
  }

  const handleResultClick = (slug: string) => {
    router.push(`/product/${slug}`)
    closeSearch()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>

        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-xl">PetPals</span>
          </Link>
        </div>

        <nav className="hidden md:flex mx-6 items-center space-x-4 lg:space-x-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/shop" className="text-sm font-medium transition-colors hover:text-primary">
            Shop
          </Link>
          <Link
            href="/shop?category=cat"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center"
          >
            <Cat className="mr-1 h-4 w-4" /> Cats
          </Link>
          <Link
            href="/shop?category=dog"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center"
          >
            <Dog className="mr-1 h-4 w-4" /> Dogs
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            About Us
          </Link>
        </nav>

        <div className={cn("transition-all duration-200 ease-in-out relative", isSearchOpen ? "flex-1" : "w-0 overflow-hidden")}>
          {isSearchOpen && (
            <div ref={searchRef} className="relative w-full max-w-md mx-auto">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search products..." 
                  className="w-full pl-8 pr-10 rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </form>
              
              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleResultClick(product.slug)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={product.image || "/placeholder.svg?height=40&width=40"} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">${Number(product.price).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={handleSearch}
                    className="w-full p-3 text-sm text-primary hover:bg-muted text-center border-t"
                  >
                    View all results for "{searchQuery}"
                  </button>
                </div>
              )}

              {/* No results message */}
              {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg p-4 z-50">
                  <p className="text-sm text-muted-foreground text-center">No products found for "{searchQuery}"</p>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={closeSearch}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close search</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {!isSearchOpen && (
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          <Link href="/wishlist">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          <div className="hidden md:flex">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" className="mr-1">
                  <User className="mr-2 h-4 w-4" />
                  {user?.name}
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="mr-1">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button variant="default" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
          <div className="md:hidden">
            {isAuthenticated ? (
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign Out</span>
              </Button>
            ) : (
              <Link href="/sign-in">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Account</span>
                </Button>
              </Link>
            )}
          </div>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                  {totalItems}
                </span>
              )}
              <span className="sr-only">Cart</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-background md:hidden">
          <nav className="container grid gap-6 p-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/shop"
              className="flex items-center gap-2 text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              Shop
            </Link>
            <Link
              href="/shop?category=cat"
              className="flex items-center gap-2 text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              <Cat className="h-5 w-5" /> Cats
            </Link>
            <Link
              href="/shop?category=dog"
              className="flex items-center gap-2 text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              <Dog className="h-5 w-5" /> Dogs
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              About Us
            </Link>
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <User className="h-5 w-5" />
                  {user?.name}
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 text-lg font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-2 text-lg font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

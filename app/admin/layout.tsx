"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Package, ShoppingCart, LayoutDashboard, LogOut, Settings, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/sign-in")
      } else if (user?.role !== "ADMIN") {
        router.push("/")
      } else {
        setIsLoading(false)
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  const handleLogout = () => {
    logout()
    router.push("/sign-in")
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header - Different from customer header */}
      <header className="sticky top-0 z-50 w-full bg-slate-900 text-white">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
              <Settings className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 hidden sm:inline">{user?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {children}
      </main>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Shield, Loader2, Save, ArrowLeft, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export default function AccountPage() {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { user, isAuthenticated, isLoading: authLoading, updateProfile, logoutAll } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Auth guard - redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in")
    }
  }, [authLoading, isAuthenticated, router])

  // Set initial name from user
  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setIsInitialLoading(false)
    }
  }, [user])

  const handleGoBack = () => {
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name cannot be empty.",
        variant: "destructive",
        dataTestId: "toast-account-validation-error",
      })
      return
    }

    setIsLoading(true)

    try {
      await updateProfile(name.trim())
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
        dataTestId: "toast-account-update-success",
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
        dataTestId: "toast-account-update-error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoutAll = async () => {
    if (!confirm("Are you sure you want to log out from all devices? You will need to sign in again on all devices.")) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logoutAll()
      toast({
        title: "Logged Out",
        description: "You have been logged out from all devices.",
        dataTestId: "toast-account-logout-success",
      })
      router.push("/sign-in")
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to log out from all devices.",
        variant: "destructive",
        dataTestId: "toast-account-logout-error",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Show loading while checking auth
  if (authLoading || isInitialLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 pt-0 pb-[130px]">
      <Button
        variant="ghost"
        onClick={handleGoBack}
        className="self-start mb-4"
        data-testid="account-back-btn"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Card className="w-full max-w-md" data-testid="account-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            My Account
          </CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} data-testid="account-form">
          <CardContent className="space-y-6">
            {/* Name Field - Editable */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                data-testid="account-name-input"
              />
            </div>

            {/* Email Field - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted cursor-not-allowed"
                data-testid="account-email-input"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Role Field - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account Type
              </Label>
              <Input
                id="role"
                type="text"
                value={user.role === "admin" ? "Administrator" : "Customer"}
                disabled
                className="bg-muted cursor-not-allowed"
                data-testid="account-role-input"
              />
            </div>
          </CardContent>
          
          <div className="px-6 pb-6 space-y-4">
            <Button 
              className="w-full" 
              type="submit" 
              disabled={isLoading || !name.trim() || name.trim() === user.name}
              data-testid="account-save-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>

            <Button 
              variant="destructive" 
              className="w-full" 
              type="button"
              onClick={handleLogoutAll}
              disabled={isLoggingOut}
              data-testid="account-logout-all-btn"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout from all devices
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

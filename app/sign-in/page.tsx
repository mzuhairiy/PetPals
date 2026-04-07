"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PawPrint, Lock, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional()
})

type SignInFormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur"
  })

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true)

    try {
      await login(data.email, data.password)
      
      // Get user from localStorage to check role
      const storedUser = localStorage.getItem("user")
      const user = storedUser ? JSON.parse(storedUser) : null
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
        dataTestId: "toast-signin-success",
      })
      
      // Redirect admin to admin panel, others to home
      if (user?.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/")
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
        dataTestId: "toast-signin-error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-12" data-testid="signin-page">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <PawPrint className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="signin-form">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                onBlur={() => trigger("email")}
                className={errors.email ? "border-red-500" : ""}
                data-testid="signin-email-input"
              />
              {errors.email && (
                <p className="text-red-500 text-xs" data-testid="signin-email-error">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="signin-forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                {...register("password")}
                onBlur={() => trigger("password")}
                className={errors.password ? "border-red-500" : ""}
                data-testid="signin-password-input"
              />
              {errors.password && (
                <p className="text-red-500 text-xs" data-testid="signin-password-error">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                {...register("remember")}
                className="rounded border-gray-300"
                data-testid="signin-remember-checkbox"
              />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" type="submit" disabled={isLoading} data-testid="signin-submit-btn">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-primary hover:underline" data-testid="signin-signup-link">
                Sign up
              </Link>
            </div>
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" data-testid="signin-google-btn">
                Google
              </Button>
              <Button variant="outline" type="button" data-testid="signin-facebook-btn">
                Facebook
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <Lock className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-xs text-muted-foreground">Secure, encrypted connection</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

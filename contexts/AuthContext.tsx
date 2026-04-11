"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  logoutAll: () => Promise<void>
  updateProfile: (name: string) => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isRefreshing = useRef(false)
  const refreshPromise = useRef<Promise<boolean> | null>(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    // Add minimum delay to ensure skeleton loading is visible
    const timer = setTimeout(() => {
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    // If already refreshing, wait for the existing promise
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current
    }

    isRefreshing.current = true

    const refreshPromiseFunc = (async () => {
      try {
        const currentToken = localStorage.getItem("token")
        const currentUser = localStorage.getItem("user")

        if (!currentToken || !currentUser) {
          return false
        }

        const userData = JSON.parse(currentUser)

        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({ userId: userData.id }),
        })

        if (!response.ok) {
          // Refresh failed - logout
          logout()
          return false
        }

        const data = await response.json()
        const newToken = data.data.token

        setToken(newToken)
        setUser(data.data.user)
        localStorage.setItem("token", newToken)
        localStorage.setItem("user", JSON.stringify(data.data.user))

        return true
      } catch (error) {
        console.error("Token refresh failed:", error)
        logout()
        return false
      } finally {
        isRefreshing.current = false
        refreshPromise.current = null
      }
    })()

    refreshPromise.current = refreshPromiseFunc
    return refreshPromiseFunc
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Login failed")
    }

    const data = await response.json()
    const { token: newToken, user: newUser } = data.data

    setToken(newToken)
    setUser(newUser)
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Registration failed")
    }

    // After successful registration, auto-login
    await login(email, password)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }

  const logoutAll = async () => {
    try {
      const currentToken = localStorage.getItem("token")
      
      // Call the logout-all endpoint
      await fetch(`${API_URL}/api/auth/logout-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        }
      })
    } catch (error) {
      console.error("Logout all failed:", error)
    } finally {
      // Clear local state regardless of API call result
      setUser(null)
      setToken(null)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  const updateProfile = async (name: string) => {
    const currentToken = localStorage.getItem("token")
    
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Update failed")
    }

    const data = await response.json()
    const updatedUser = data.data

    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    logoutAll,
    updateProfile,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

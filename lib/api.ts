import { products as staticProducts } from "./products"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Flag to track if we're attempting a refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: Response | PromiseLike<Response>) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: Error | null, newToken: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }
  })
  failedQueue = []
}

// Custom fetch that handles token refresh
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const headers = {
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // If unauthorized, try to refresh token
  if (response.status === 401 && !url.includes("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true

      // Attempt to refresh token
      try {
        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: JSON.parse(localStorage.getItem("user") || "{}").id }),
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          localStorage.setItem("token", data.data.token)
          localStorage.setItem("user", JSON.stringify(data.data.user))
          processQueue(null, data.data.token)
          const newToken = data.data.token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "Authorization": `Bearer ${newToken}`,
            },
          })

          isRefreshing = false
          return retryResponse
        } else {
          processQueue(new Error("Token refresh failed"))
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          window.location.href = "/sign-in"
        }
      } catch (error) {
        processQueue(error as Error)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/sign-in"
      }

      isRefreshing = false
    }

    // Wait for token refresh to complete
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
  }

  return response
}

export interface ProductFilters {
  category?: string
  pet?: string
  search?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: string
  limit?: string
}

export interface ProductsResponse {
  products: any[]
  metadata?: {
    totalCount: number
    currentPage: number
    totalPages: number
    limit: number
  }
}

// Simple fetch that returns static data on any failure
async function fetchFromAPI(url: string): Promise<ProductsResponse> {
  try {
    const response = await authFetch(url, {
      next: { revalidate: 0 }  // Don't cache
    })
    
    if (!response.ok) {
      console.warn('API returned non-ok status:', response.status)
      return { products: staticProducts }
    }
    
    const result = await response.json()
    return { 
      products: result.data || [],
      metadata: result.metadata
    }
  } catch (err) {
    console.warn('API fetch failed, using static data:', err)
    return { products: staticProducts }
  }
}

export async function fetchProducts(filters?: ProductFilters): Promise<ProductsResponse> {
  const params = new URLSearchParams()
  
  if (filters) {
    Object.entries(filters).forEach(function([key, value]) {
      if (value) {
        params.append(key, value)
      }
    })
  }

  const url = `${API_URL}/api/products${params.toString() ? "?" + params.toString() : ""}`
  
  return fetchFromAPI(url)
}

export async function fetchProductById(id: string): Promise<any> {
  try {
    const response = await authFetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 0 }
    })
    
    if (!response.ok) {
      return staticProducts.find(function(p) { return p.id === id })
    }
    
    const result = await response.json()
    return result.data
  } catch (err) {
    console.warn('API fetch failed, using static data:', err)
    return staticProducts.find(function(p) { return p.id === id })
  }
}

export async function fetchProductBySlug(slug: string): Promise<any> {
  const response = await fetchProducts()
  return response.products.find(function(p: any) { return p.slug === slug })
}

export async function searchProducts(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) {
    return []
  }
  
  const url = `${API_URL}/api/products?search=${encodeURIComponent(query.trim())}`
  
  try {
    const response = await authFetch(url, {
      next: { revalidate: 0 }
    })
    
    if (!response.ok) {
      return []
    }
    
    const result = await response.json()
    // Return first 5 results for dropdown
    return (result.data || []).slice(0, 5)
  } catch (err) {
    console.warn('Search failed:', err)
    return []
  }
}

// ============ ADMIN API FUNCTIONS ============

export interface AdminProductInput {
  name: string
  slug: string
  description?: string
  price: number
  originalPrice?: number
  image?: string
  category: string
  pet: string
  stock: number
  tags?: string[]
  isNew?: boolean
  discount?: number
  featured?: boolean
}

export async function createProduct(data: AdminProductInput): Promise<any> {
  const response = await authFetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to create product')
  }
  
  const result = await response.json()
  return result.data
}

export async function updateProduct(id: string, data: Partial<AdminProductInput>): Promise<any> {
  const response = await authFetch(`${API_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to update product')
  }
  
  const result = await response.json()
  return result.data
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await authFetch(`${API_URL}/api/products/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete product')
  }
}

export interface AdminOrder {
  id: string
  createdAt: string
  subtotal: number
  tax: number
  shipping: number
  total: number
  status: string
  user: {
    id: string
    name: string
    email: string
  }
  shippingStreet?: string
  shippingCity?: string
  shippingState?: string
  shippingZipCode?: string
  shippingCountry?: string
  payment?: {
    id: string
    status: string
    transactionId?: string
    provider: string
  }
  items: {
    id: string
    productId: string
    nameSnapshot: string
    price: number
    quantity: number
  }[]
}

export interface OrdersResponse {
  data: AdminOrder[]
  metadata?: {
    totalCount: number
    currentPage: number
    totalPages: number
    limit: number
  }
}

export async function fetchAllOrders(status?: string, page = 1): Promise<OrdersResponse> {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  if (status) {
    params.append('status', status)
  }
  
  const response = await authFetch(`${API_URL}/api/orders/all?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }
  
  return response.json()
}

export async function updateOrderStatus(orderId: string, status: string): Promise<any> {
  const response = await authFetch(`${API_URL}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update order status')
  }
  
  const result = await response.json()
  return result.data
}

import { products as staticProducts } from "./products"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

export interface ProductFilters {
  category?: string
  pet?: string
  search?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
}

// Simple fetch that returns static data on any failure
async function fetchFromAPI(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 0 }  // Don't cache
    })
    
    if (!response.ok) {
      console.warn('API returned non-ok status:', response.status)
      return staticProducts
    }
    
    const result = await response.json()
    return result.data || []
  } catch (err) {
    console.warn('API fetch failed, using static data:', err)
    return staticProducts
  }
}

export async function fetchProducts(filters?: ProductFilters): Promise<any[]> {
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
    const response = await fetch(`${API_URL}/api/products/${id}`, {
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
  const products = await fetchProducts()
  return products.find(function(p: any) { return p.slug === slug })
}

export async function searchProducts(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) {
    return []
  }
  
  const url = `${API_URL}/api/products?search=${encodeURIComponent(query.trim())}`
  
  try {
    const response = await fetch(url, {
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

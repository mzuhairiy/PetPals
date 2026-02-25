const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

export interface ProductFilters {
  category?: string
  pet?: string
  search?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
}

export async function fetchProducts(filters?: ProductFilters): Promise<any[]> {
  const params = new URLSearchParams()
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value)
      }
    })
  }

  const url = `${API_URL}/api/products${params.toString() ? `?${params.toString()}` : ''}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  
  const result = await response.json()
  return result.data || []
}

export async function fetchProductById(id: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/products/${id}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch product')
  }
  
  const result = await response.json()
  return result.data
}

export async function fetchProductBySlug(slug: string): Promise<any> {
  // Fetch all products and find by slug (since API doesn't have slug endpoint)
  const products = await fetchProducts()
  return products.find((p: any) => p.slug === slug)
}

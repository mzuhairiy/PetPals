import { Suspense } from "react"
import { fetchProducts } from "@/lib/api"
import ProductGrid from "@/components/product-grid"
import ShopFilters from "@/components/shop-filters"
import { Skeleton } from "@/components/ui/skeleton"

interface ShopPageProps {
  searchParams: {
    category?: string
    pet?: string
    sort?: string
    min?: string
    max?: string
    search?: string
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  // Convert frontend params to backend format
  const filters: any = {}
  
  if (searchParams.category) {
    filters.category = searchParams.category.toUpperCase()
  }
  
  if (searchParams.pet) {
    filters.pet = searchParams.pet.toUpperCase()
  }
  
  if (searchParams.sort) {
    filters.sort = searchParams.sort
  }
  
  if (searchParams.min) {
    filters.minPrice = searchParams.min
  }
  
  if (searchParams.max) {
    filters.maxPrice = searchParams.max
  }
  
  if (searchParams.search) {
    filters.search = searchParams.search
  }

  // Fetch products from API
  let products = await fetchProducts(filters)

  return (
    <div className="container px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold mb-8">
        {searchParams.search 
          ? `Search Results for "${searchParams.search}"` 
          : searchParams.category 
            ? `${searchParams.category.charAt(0).toUpperCase() + searchParams.category.slice(1)} Products`
            : "Shop Pet Products"
        }
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        <ShopFilters />

        <div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={products} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array(8)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-60 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cat, Dog, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const DEBOUNCE_DELAY = 500

export default function ShopFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const currentCategory = searchParams.get("category") || ""
  const currentPet = searchParams.get("pet") || ""
  const currentSort = searchParams.get("sort") || ""
  const currentMinPrice = searchParams.get("min") ? Number.parseFloat(searchParams.get("min") as string) : 0
  const currentMaxPrice = searchParams.get("max") ? Number.parseFloat(searchParams.get("max") as string) : 0

  // Price range from database
  const [priceRangeMax, setPriceRangeMax] = useState(10000)
  const [isPriceRangeLoaded, setIsPriceRangeLoaded] = useState(false)

  // Local state for filters
  const [category, setCategory] = useState(currentCategory)
  const [pet, setPet] = useState(currentPet)
  const [sort, setSort] = useState(currentSort)
  const [priceRange, setPriceRange] = useState<[number, number]>([currentMinPrice, currentMaxPrice || priceRangeMax])
  const [minInput, setMinInput] = useState(currentMinPrice.toString())
  const [maxInput, setMaxInput] = useState((currentMaxPrice || priceRangeMax).toString())

  // Fetch price range on mount
  useEffect(() => {
    const fetchPriceRange = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/price-range`)
        const result = await response.json()
        if (result.success && result.data) {
          const max = Math.ceil(result.data.max * 1.1) // Add 10% buffer
          setPriceRangeMax(max)
          setIsPriceRangeLoaded(true)
          // Initialize with fetched max if not set
          if (!currentMaxPrice) {
            setPriceRange([0, max])
            setMaxInput(max.toString())
          }
        }
      } catch (error) {
        console.error("Failed to fetch price range:", error)
      }
    }
    fetchPriceRange()
  }, [])

  // Initialize state from URL on mount
  useEffect(() => {
    setCategory(searchParams.get("category") || "")
    setPet(searchParams.get("pet") || "")
    setSort(searchParams.get("sort") || "")
    
    const min = searchParams.get("min")
    const max = searchParams.get("max")
    if (min || max) {
      setPriceRange([
        min ? Number(min) : 0,
        max ? Number(max) : priceRangeMax
      ])
      if (min) setMinInput(min)
      if (max) setMaxInput(max)
    }
  }, [])

  // Debounced URL update - only for user-initiated filter changes
  // Skip on initial mount to preserve URL params
  useEffect(() => {
    // Skip if price range not loaded yet
    if (!isPriceRangeLoaded) return
    
    // Skip if no filters are set - don't need to update URL
    if (!category && !pet && !sort && priceRange[0] === 0 && priceRange[1] === priceRangeMax) {
      return
    }
    
    const timer = setTimeout(() => {
      const params = new URLSearchParams()

      if (category) {
        params.set("category", category)
      }

      if (pet) {
        params.set("pet", pet)
      }

      if (sort) {
        params.set("sort", sort)
      }

      if (priceRange[0] > 0) {
        params.set("min", priceRange[0].toString())
      }

      if (priceRange[1] < priceRangeMax) {
        params.set("max", priceRange[1].toString())
      }

      const newParams = params.toString()
      const currentParams = searchParams.toString()
      
      // Only push if params actually changed from current URL
      if (newParams !== currentParams) {
        if (newParams) {
          router.push(`/shop?${newParams}`)
        } else {
          router.push("/shop")
        }
      }
    }, DEBOUNCE_DELAY)

    return () => clearTimeout(timer)
  }, [category, pet, sort, priceRange, priceRangeMax, router, searchParams, isPriceRangeLoaded])

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]]
    setPriceRange(newRange)
    setMinInput(newRange[0].toString())
    setMaxInput(newRange[1].toString())
  }

  // Handle min input change
  const handleMinInputChange = (value: string) => {
    setMinInput(value)
    const numValue = Number.parseFloat(value) || 0
    
    // Validate: min cannot be negative
    if (numValue < 0) return
    
    // Validate: min cannot exceed max
    const currentMax = Number.parseFloat(maxInput) || priceRangeMax
    if (numValue > currentMax) return
    
    setPriceRange([numValue, currentMax])
  }

  // Handle max input change
  const handleMaxInputChange = (value: string) => {
    setMaxInput(value)
    const numValue = Number.parseFloat(value) || priceRangeMax
    
    // Validate: max cannot exceed price range max
    if (numValue > priceRangeMax) return
    
    // Validate: max cannot be less than min
    const currentMin = Number.parseFloat(minInput) || 0
    if (numValue < currentMin) return
    
    setPriceRange([currentMin, numValue])
  }

  // Handle min input blur (reset to valid value)
  const handleMinBlur = () => {
    const numValue = Number.parseFloat(minInput) || 0
    const clampedValue = Math.max(0, Math.min(numValue, priceRange[1]))
    setMinInput(clampedValue.toString())
    setPriceRange([clampedValue, priceRange[1]])
  }

  // Handle max input blur (reset to valid value)
  const handleMaxBlur = () => {
    const numValue = Number.parseFloat(maxInput) || priceRangeMax
    const clampedValue = Math.max(priceRange[0], Math.min(numValue, priceRangeMax))
    setMaxInput(clampedValue.toString())
    setPriceRange([priceRange[0], clampedValue])
  }

  // Reset all filters
  const resetFilters = () => {
    setCategory("")
    setPet("")
    setSort("")
    setPriceRange([0, priceRangeMax])
    setMinInput("0")
    setMaxInput(priceRangeMax.toString())
    router.push("/shop")
  }

  // Check if any filters are active
  const hasActiveFilters = category || pet || sort || priceRange[0] > 0 || priceRange[1] < priceRangeMax

  return (
    <div className="space-y-6" data-testid="shop-filters">
      {hasActiveFilters && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Active Filters</h3>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs" data-testid="shop-filters-clear-all-btn">
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {category && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-filter-category">
              Category: {category}
              <Button variant="ghost" size="icon" onClick={() => setCategory("")} className="h-4 w-4 p-0 ml-1">
                <X className="h-3 w-3" />
                <span className="sr-only">Remove category filter</span>
              </Button>
            </Badge>
          )}

          {pet && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-filter-pet">
              Pet: {pet}
              <Button variant="ghost" size="icon" onClick={() => setPet("")} className="h-4 w-4 p-0 ml-1">
                <X className="h-3 w-3" />
                <span className="sr-only">Remove pet filter</span>
              </Button>
            </Badge>
          )}

          {(priceRange[0] > 0 || priceRange[1] < priceRangeMax) && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-filter-price">
              Price: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              <Button variant="ghost" size="icon" onClick={() => {
                setPriceRange([0, priceRangeMax])
                setMinInput("0")
                setMaxInput(priceRangeMax.toString())
              }} className="h-4 w-4 p-0 ml-1">
                <X className="h-3 w-3" />
                <span className="sr-only">Remove price filter</span>
              </Button>
            </Badge>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["category", "pet", "price", "sort"]}>
        <AccordionItem value="category">
          <AccordionTrigger>Category</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-toys"
                  checked={category === "toys"}
                  onCheckedChange={() => setCategory(category === "toys" ? "" : "toys")}
                  data-testid="filter-category-toys"
                />
                <Label htmlFor="category-toys">Toys</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-food"
                  checked={category === "food"}
                  onCheckedChange={() => setCategory(category === "food" ? "" : "food")}
                  data-testid="filter-category-food"
                />
                <Label htmlFor="category-food">Food</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-supplements"
                  checked={category === "supplements"}
                  onCheckedChange={() => setCategory(category === "supplements" ? "" : "supplements")}
                  data-testid="filter-category-supplements"
                />
                <Label htmlFor="category-supplements">Supplements</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pet">
          <AccordionTrigger>Pet Type</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pet-cat"
                  checked={pet === "cat"}
                  onCheckedChange={() => setPet(pet === "cat" ? "" : "cat")}
                  data-testid="filter-pet-cat"
                />
                <Label htmlFor="pet-cat" className="flex items-center">
                  <Cat className="h-4 w-4 mr-1" /> Cats
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pet-dog"
                  checked={pet === "dog"}
                  onCheckedChange={() => setPet(pet === "dog" ? "" : "dog")}
                  data-testid="filter-pet-dog"
                />
                <Label htmlFor="pet-dog" className="flex items-center">
                  <Dog className="h-4 w-4 mr-1" /> Dogs
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Slider
                value={[priceRange[0], priceRange[1]]}
                max={priceRangeMax}
                step={1000}
                onValueChange={handleSliderChange}
                className="my-6"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="min-price" className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    id="min-price"
                    type="number"
                    value={minInput}
                    onChange={(e) => handleMinInputChange(e.target.value)}
                    onBlur={handleMinBlur}
                    min={0}
                    max={priceRangeMax}
                    className="h-8"
                  />
                </div>
                <span className="text-muted-foreground mt-5">-</span>
                <div className="flex-1">
                  <Label htmlFor="max-price" className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    id="max-price"
                    type="number"
                    value={maxInput}
                    onChange={(e) => handleMaxInputChange(e.target.value)}
                    onBlur={handleMaxBlur}
                    min={0}
                    max={priceRangeMax}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sort">
          <AccordionTrigger>Sort By</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sort-price-asc"
                  checked={sort === "price_asc"}
                  onCheckedChange={() => setSort(sort === "price_asc" ? "" : "price_asc")}
                  data-testid="filter-sort-price-asc"
                />
                <Label htmlFor="sort-price-asc">Price: Low to High</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sort-price-desc"
                  checked={sort === "price_desc"}
                  onCheckedChange={() => setSort(sort === "price_desc" ? "" : "price_desc")}
                  data-testid="filter-sort-price-desc"
                />
                <Label htmlFor="sort-price-desc">Price: High to Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sort-rating"
                  checked={sort === "rating"}
                  onCheckedChange={() => setSort(sort === "rating" ? "" : "rating")}
                  data-testid="filter-sort-rating"
                />
                <Label htmlFor="sort-rating">Highest Rated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sort-newest"
                  checked={sort === "newest"}
                  onCheckedChange={() => setSort(sort === "newest" ? "" : "newest")}
                  data-testid="filter-sort-newest"
                />
                <Label htmlFor="sort-newest">Newest First</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

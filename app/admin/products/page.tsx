"use client"

import { useEffect, useState } from "react"
import { Package, Plus, Edit, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { fetchProducts, createProduct, updateProduct, deleteProduct, AdminProductInput } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export default function AdminProductsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<AdminProductInput>({
    name: "",
    slug: "",
    description: "",
    price: 0,
    originalPrice: undefined,
    image: "",
    category: "FOOD",
    pet: "DOG",
    stock: 0,
    tags: [],
    isNew: false,
    discount: 0,
    featured: false
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await fetchProducts()
      setProducts(response.products || [])
    } catch (error) {
      console.error("Failed to load products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image || "",
        category: product.category,
        pet: product.pet,
        stock: product.stock,
        tags: product.tags || [],
        isNew: product.isNew,
        discount: product.discount || 0,
        featured: product.featured
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: "",
        slug: "",
        description: "",
        price: 0,
        originalPrice: undefined,
        image: "",
        category: "FOOD",
        pet: "DOG",
        stock: 0,
        tags: [],
        isNew: false,
        discount: 0,
        featured: false
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Clean up the data - remove undefined and null values
    const cleanData: any = {}
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        cleanData[key] = value
      }
    })

    // Handle originalPrice - don't send if not provided
    if (!formData.originalPrice) {
      delete cleanData.originalPrice
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, cleanData)
        toast({ title: "Product updated successfully" })
      } else {
        await createProduct(cleanData)
        toast({ title: "Product created successfully" })
      }
      setIsDialogOpen(false)
      loadProducts()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      await deleteProduct(id)
      toast({ title: "Product deleted successfully" })
      loadProducts()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" })
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div data-testid="admin-products-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Products</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="admin-add-product-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle data-testid="admin-product-dialog-title">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update product details below" : "Fill in the product details below"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                      required
                      data-testid="admin-product-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      data-testid="admin-product-slug-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="admin-product-description-input"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (IDR)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      required
                      data-testid="admin-product-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Original Price (IDR)</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      value={formData.originalPrice || ""}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value ? parseInt(e.target.value) : undefined })}
                      data-testid="admin-product-original-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      required
                      data-testid="admin-product-stock-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="image">Image URL</Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://..."
                      data-testid="admin-product-image-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                      data-testid="admin-product-discount-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOOD">Food</SelectItem>
                        <SelectItem value="TOYS">Toys</SelectItem>
                        <SelectItem value="SUPPLEMENTS">Supplements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pet Type</Label>
                    <Select
                      value={formData.pet}
                      onValueChange={(value) => setFormData({ ...formData, pet: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAT">Cat</SelectItem>
                        <SelectItem value="DOG">Dog</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (comma separated)</Label>
                    <Input
                      value={formData.tags?.join(", ") || ""}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isNew}
                      onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                    />
                    <span className="text-sm">Mark as New</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    />
                    <span className="text-sm">Featured</span>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="admin-product-cancel-btn">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="admin-product-submit-btn">
                  {isSubmitting ? "Saving..." : editingProduct ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="admin-products-search-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`admin-product-row-${product.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.pet}</TableCell>
                  <TableCell>
                    <div>
                      {formatPrice(product.price)}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.originalPrice)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={product.stock <= 5 ? "text-red-500 font-medium" : ""}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {product.isNew && <Badge>New</Badge>}
                      {product.discount > 0 && <Badge variant="destructive">{product.discount}% OFF</Badge>}
                      {product.featured && <Badge variant="secondary">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(product)}
                        data-testid={`admin-product-edit-btn-${product.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        data-testid={`admin-product-delete-btn-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

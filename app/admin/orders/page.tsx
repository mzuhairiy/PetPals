"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { fetchAllOrders, updateOrderStatus, AdminOrder } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]

export default function AdminOrdersPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const response = await fetchAllOrders(statusFilter || undefined)
      setOrders(response.data || [])
    } catch (error) {
      console.error("Failed to load orders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsUpdating(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      toast({ title: "Order status updated" })
      loadOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>
      case "PROCESSING":
        return <Badge variant="default">Processing</Badge>
      case "SHIPPED":
        return <Badge variant="default" className="bg-blue-500">Shipped</Badge>
      case "DELIVERED":
        return <Badge variant="secondary">Delivered</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>
        <Button variant="outline" size="icon" onClick={loadOrders}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Orders</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={statusFilter || "all"} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{order.id.slice(0, 8)}...</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.user?.name || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">{order.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.quantity}x {item.nameSnapshot}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(order.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        Subtotal: {formatPrice(order.subtotal)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(order.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                        disabled={isUpdating === order.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0) + status.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

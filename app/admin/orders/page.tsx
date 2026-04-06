"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, RefreshCw, Package } from "lucide-react"
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
import { fetchAllOrders, updateOrderStatus, createShipment, retryShipment, syncShipmentStatus, checkCanEditStatus, AdminOrder } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

// Admin can only edit these statuses when no shipment exists
const ALLOWED_ADMIN_STATUSES = ["PENDING", "PROCESSING", "CANCELLED"]

// All order statuses for filtering
const ALL_ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]

export default function AdminOrdersPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isCreatingShipment, setIsCreatingShipment] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  // Track which orders have editable status
  const [editableOrders, setEditableOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const response = await fetchAllOrders(statusFilter || undefined)
      const ordersData = response.data || []
      setOrders(ordersData)
      
      // Check which orders can be edited by admin
      const editableSet = new Set<string>()
      for (const order of ordersData) {
        // Admin can only edit PROCESSING orders (when preparing item, before shipment)
        if (!order.shipmentId && order.status === 'PROCESSING') {
          editableSet.add(order.id)
        }
      }
      setEditableOrders(editableSet)
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

  const handleCreateShipment = async (orderId: string) => {
    setIsCreatingShipment(orderId)
    try {
      await createShipment(orderId)
      toast({ title: "Shipment created successfully" })
      loadOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to create shipment", variant: "destructive" })
    } finally {
      setIsCreatingShipment(null)
    }
  }

  const handleRetryShipment = async (orderId: string) => {
    setIsCreatingShipment(orderId)
    try {
      await retryShipment(orderId)
      toast({ title: "Shipment retry successful" })
      loadOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to retry shipment", variant: "destructive" })
    } finally {
      setIsCreatingShipment(null)
    }
  }

  const handleSyncStatus = async (orderId: string) => {
    setIsSyncing(orderId)
    try {
      const result = await syncShipmentStatus(orderId)
      toast({ title: "Status synced", description: result.message || `Order status: ${result.orderStatus}` })
      loadOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to sync shipment status", variant: "destructive" })
    } finally {
      setIsSyncing(null)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value)
  }

  // Format order status to sentence case
  const getStatusText = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase()
  }

  // Format shipping status to sentence case (e.g., picked_up -> Picked up)
  const formatShippingStatus = (status: string | undefined) => {
    if (!status) return '-'
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
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

  // Check if status select should be disabled
  const isStatusDisabled = (order: AdminOrder) => {
    // Disable if shipment exists
    if (order.shipmentId) return true
    // Disable if status is not PENDING or PROCESSING (can edit these to move forward)
    if (!['PENDING', 'PROCESSING'].includes(order.status)) return true
    // Disable if currently updating
    if (isUpdating === order.id) return true
    return false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div data-testid="admin-orders-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>
        <Button variant="outline" size="icon" onClick={loadOrders} data-testid="refresh-orders-btn">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Orders</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={statusFilter || "all"} onValueChange={handleFilterChange} data-testid="status-filter">
              <SelectTrigger className="w-40" data-testid="status-filter-trigger">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="status-filter-option-all">All Statuses</SelectItem>
                {ALL_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} data-testid={`status-filter-option-${status.toLowerCase()}`}>
                    {getStatusText(status)}
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
                <TableHead>Shipment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow data-testid="no-orders-row">
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
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
                      <span className="text-sm">{getStatusText(order.status)}</span>
                    </TableCell>
                    <TableCell>
                      {order.shipmentId ? (
                        <div className="text-sm" data-testid={`shipment-info-${order.id}`}>
                          <span className="font-medium">{order.courier?.toUpperCase()}</span>
                          {order.trackingId && (
                            <div className="text-xs text-muted-foreground">
                              {order.trackingId}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            {order.shippingStatus && (
                              <span className="text-xs text-muted-foreground">
                                {formatShippingStatus(order.shippingStatus)}
                              </span>
                            )}
                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => handleSyncStatus(order.id)}
                                disabled={isSyncing === order.id}
                                title="Sync status from Biteship"
                                data-testid={`sync-status-btn-${order.id}`}
                              >
                                <RefreshCw className={`h-3 w-3 ${isSyncing === order.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : order.status === 'PROCESSING' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateShipment(order.id)}
                          disabled={isCreatingShipment === order.id}
                          data-testid={`create-shipment-btn-${order.id}`}
                        >
                          {isCreatingShipment === order.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Package className="h-3 w-3 mr-1" />
                          )}
                          Create
                        </Button>
                      ) : order.shippingStatus === 'failed' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRetryShipment(order.id)}
                          disabled={isCreatingShipment === order.id}
                          data-testid={`retry-shipment-btn-${order.id}`}
                        >
                          {isCreatingShipment === order.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Retry
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(order.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isStatusDisabled(order) ? (
                        <span className="text-xs text-muted-foreground mr-2" data-testid={`order-status-display-${order.id}`}>
                          {order.shipmentId ? "Auto-managed" : getStatusText(order.status)}
                        </span>
                      ) : (
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={isUpdating === order.id}
                          data-testid={`order-status-select-${order.id}`}
                        >
                          <SelectTrigger className="w-32" data-testid={`order-status-trigger-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALLOWED_ADMIN_STATUSES.map((status) => (
                              <SelectItem key={status} value={status} data-testid={`order-status-option-${order.id}-${status.toLowerCase()}`}>
                                {getStatusText(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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

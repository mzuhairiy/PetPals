"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ShoppingCart, DollarSign, AlertTriangle, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDashboardStats, DashboardStats } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
      href: "/admin/orders"
    },
    {
      title: "Total Revenue",
      value: formatPrice(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: "bg-green-500",
      href: "/admin/orders"
    },
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "bg-purple-500",
      href: "/admin/products"
    },
    {
      title: "Low Stock",
      value: stats?.lowStockProducts || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      href: "/admin/products"
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Daily Orders
            </CardTitle>
            <CardDescription>Orders in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.dailyChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    dot={{ fill: '#00C49F', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Orders by Status
            </CardTitle>
            <CardDescription>Current order status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.ordersByStatus || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(stats?.ordersByStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders in the system</CardDescription>
            </div>
            <Link href="/admin/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentOrders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-mono text-sm">{order.id.slice(0, 8)}...</div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatPrice(order.total)}</div>
                    <div className={`text-xs px-2 py-0.5 rounded ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                <p className="text-center text-gray-500 py-4">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

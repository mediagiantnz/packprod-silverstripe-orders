import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/reports';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatNumber } from '@/utils/format';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GroupByPeriod } from '@/types/reports';
import { RefreshCw } from 'lucide-react';

export default function Reports() {
  const [groupBy, setGroupBy] = useState<GroupByPeriod>('day');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const { 
    data: productsData, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts,
    isFetching: isFetchingProducts 
  } = useQuery({
    queryKey: ['products-report', dateRange],
    queryFn: () => reportsApi.getProductReport(dateRange.startDate && dateRange.endDate ? dateRange : undefined),
  });

  const { 
    data: salesData, 
    isLoading: salesLoading, 
    error: salesError,
    refetch: refetchSales,
    isFetching: isFetchingSales 
  } = useQuery({
    queryKey: ['sales-report', groupBy, dateRange],
    queryFn: () => reportsApi.getSalesReport({ 
      groupBy,
      ...(dateRange.startDate && dateRange.endDate ? dateRange : {})
    }),
  });

  const handleRefreshAll = () => {
    refetchProducts();
    refetchSales();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights</p>
        </div>
        <Button 
          onClick={handleRefreshAll} 
          disabled={isFetchingProducts || isFetchingSales}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(isFetchingProducts || isFetchingSales) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilter onDateChange={setDateRange} defaultPreset="thisMonth" />
        </CardContent>
      </Card>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sales">Sales Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {productsLoading ? (
            <LoadingSpinner />
          ) : productsError || !productsData?.data ? (
            <Card className="p-8">
              <div className="text-center text-destructive">
                <p className="font-semibold mb-2">Unable to load product data</p>
                <p className="text-sm text-muted-foreground">
                  {productsError ? 'Failed to connect to API. Please check CORS settings.' : 'No data available'}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{productsData.data.summary?.total_products || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Orders Analyzed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{productsData.data.summary?.total_orders_analyzed || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {productsData.data.topByRevenue?.slice(0, 10).map((product, idx) => (
                        <div key={product.product_code} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{product.product_code}</div>
                            <div className="text-sm text-muted-foreground truncate">{product.description}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold">{formatCurrency(product.total_revenue)}</div>
                            <div className="text-sm text-muted-foreground">{product.order_count} orders</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Products by Quantity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {productsData.data.topByQuantity?.slice(0, 10).map((product, idx) => (
                        <div key={product.product_code} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{product.product_code}</div>
                            <div className="text-sm text-muted-foreground truncate">{product.description}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold">{formatNumber(product.total_quantity)}</div>
                            <div className="text-sm text-muted-foreground">{product.order_count} orders</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          {salesLoading ? (
            <LoadingSpinner />
          ) : salesError || !salesData?.data ? (
            <Card className="p-8">
              <div className="text-center text-destructive">
                <p className="font-semibold mb-2">Unable to load sales data</p>
                <p className="text-sm text-muted-foreground">
                  {salesError ? 'Failed to connect to API. Please check CORS settings.' : 'No data available'}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setGroupBy('day')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    groupBy === 'day' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setGroupBy('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    groupBy === 'week' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setGroupBy('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    groupBy === 'month' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Monthly
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.data.summary?.total_revenue || '0')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatNumber(salesData.data.summary?.total_orders || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Order Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.data.summary?.average_order_value || '0')}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData.data.timeline || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData.data.timeline || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        formatter={(value: number) => [value, 'Orders']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="order_count" fill="hsl(var(--chart-2))" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

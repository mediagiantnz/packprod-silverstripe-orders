import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ordersApi } from '@/services/orders';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils/format';
import { ShoppingCart, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Orders() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [filters, setFilters] = useState({
    minTotal: '',
    maxTotal: '',
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['orders', dateRange, filters],
    queryFn: ({ pageParam }) =>
      ordersApi.listOrders({
        ...(dateRange.startDate && dateRange.endDate ? dateRange : {}),
        ...filters,
        limit: 50,
        lastEvaluatedKey: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.meta?.lastEvaluatedKey,
    initialPageParam: undefined as string | undefined,
  });

  // Flatten all pages into a single array
  const orders = data?.pages.flatMap((page) => page.data) || [];
  const totalCount = data?.pages[0]?.meta?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">View and manage all orders</p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilter onDateChange={setDateRange} defaultPreset="thisMonth" />
          
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Total</label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.minTotal}
                onChange={(e) => setFilters((f) => ({ ...f, minTotal: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Total</label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.maxTotal}
                onChange={(e) => setFilters((f) => ({ ...f, maxTotal: e.target.value }))}
              />
            </div>
          </div>
          <Button
            onClick={() => {
              setDateRange({ startDate: '', endDate: '' });
              setFilters({ minTotal: '', maxTotal: '' });
            }}
            variant="outline"
            className="mt-4"
          >
            Clear All Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders.length} loaded)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-destructive text-center py-8">
              <p className="font-semibold mb-2">Error loading orders</p>
              <p className="text-sm text-muted-foreground">Failed to connect to API. Please check CORS settings.</p>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders found"
              description="Try adjusting your filters to see more results."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Order ID</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Items</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.orderID} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <Link to={`/orders/${order.orderID}`} className="text-primary hover:underline font-medium">
                            {order.order_reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{order.customer.contact_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{order.customer.company || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-4 text-right">{order.items.length}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(order.totals.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      'Load More Orders'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

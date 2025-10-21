import { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ordersApi } from '@/services/orders';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils/format';
import { ShoppingCart, RefreshCw, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

type SortField = 'date' | 'total' | 'customer' | 'items';
type SortOrder = 'asc' | 'desc';

export default function Orders() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [filters, setFilters] = useState({
    minTotal: '',
    maxTotal: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  // Client-side filtering and sorting
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((order) =>
        order.order_reference?.toLowerCase().includes(searchLower) ||
        order.customer?.contact_name?.toLowerCase().includes(searchLower) ||
        order.customer?.email?.toLowerCase().includes(searchLower) ||
        order.customer?.company?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'date':
          compareValue = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'total':
          compareValue = parseFloat(b.totals?.total || '0') - parseFloat(a.totals?.total || '0');
          break;
        case 'customer':
          compareValue = (a.customer?.contact_name || '').localeCompare(b.customer?.contact_name || '');
          break;
        case 'items':
          compareValue = (b.items?.length || 0) - (a.items?.length || 0);
          break;
      }

      return sortOrder === 'asc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [orders, searchTerm, sortField, sortOrder]);

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
          <CardTitle>Filters & Sorting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateRangeFilter onDateChange={setDateRange} defaultPreset="thisMonth" />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by order ID, customer, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Order Date</SelectItem>
                  <SelectItem value="total">Total Amount</SelectItem>
                  <SelectItem value="customer">Customer Name</SelectItem>
                  <SelectItem value="items">Item Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Order</label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Highest/Newest First</SelectItem>
                  <SelectItem value="asc">Lowest/Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              setDateRange({ startDate: '', endDate: '' });
              setFilters({ minTotal: '', maxTotal: '' });
              setSearchTerm('');
            }}
            variant="outline"
            className="w-full"
          >
            Clear All Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredAndSortedOrders.length} {searchTerm ? 'found' : 'loaded'})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-destructive text-center py-8">
              <p className="font-semibold mb-2">Error loading orders</p>
              <p className="text-sm text-muted-foreground">Failed to connect to API. Please check CORS settings.</p>
            </div>
          ) : filteredAndSortedOrders.length === 0 ? (
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
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Contact</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Items</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedOrders.map((order) => (
                      <tr key={order.orderID} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <Link to={`/orders/${order.orderID}`} className="text-primary hover:underline font-medium">
                            {order.order_reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{order.customer.company || order.customer.contact_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{order.customer.contact_name}</td>
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

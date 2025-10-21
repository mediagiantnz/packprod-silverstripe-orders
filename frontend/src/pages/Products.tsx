import { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from '@/services/products';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/utils/format';
import { RefreshCw, Package, Search, ArrowUpDown } from 'lucide-react';

type SortField = 'revenue' | 'quantity' | 'orders' | 'code';
type SortOrder = 'asc' | 'desc';

export default function Products() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');
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
    queryKey: ['products', dateRange, searchTerm],
    queryFn: ({ pageParam }) =>
      productsApi.listProducts({
        limit: 50,
        lastEvaluatedKey: pageParam,
        search: searchTerm || undefined,
        ...(dateRange.startDate && dateRange.endDate ? dateRange : {}),
      }),
    getNextPageParam: (lastPage) => lastPage.data?.lastEvaluatedKey?.product_code,
    initialPageParam: undefined as string | undefined,
  });

  const allProducts = data?.pages.flatMap((page) => page.data?.products || []) || [];

  // Sort products based on selected criteria
  const sortedProducts = useMemo(() => {
    const products = [...allProducts];

    products.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'revenue':
          compareValue = (b.total_revenue || 0) - (a.total_revenue || 0);
          break;
        case 'quantity':
          compareValue = (b.total_quantity || 0) - (a.total_quantity || 0);
          break;
        case 'orders':
          compareValue = (b.order_count || 0) - (a.order_count || 0);
          break;
        case 'code':
          compareValue = a.product_code.localeCompare(b.product_code);
          break;
      }

      return sortOrder === 'asc' ? -compareValue : compareValue;
    });

    return products;
  }, [allProducts, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">View and analyze product performance</p>
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
        <CardContent className="space-y-4">
          <DateRangeFilter onDateChange={setDateRange} defaultPreset="thisMonth" />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="quantity">Quantity Sold</SelectItem>
                  <SelectItem value="orders">Order Count</SelectItem>
                  <SelectItem value="code">Product Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Order</label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Highest First</SelectItem>
                  <SelectItem value="asc">Lowest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSpinner />
      ) : error || !data ? (
        <Card className="p-8">
          <div className="text-center text-destructive">
            <p className="font-semibold mb-2">Unable to load products</p>
            <p className="text-sm text-muted-foreground">
              {error ? 'Failed to connect to API. Please check CORS settings.' : 'No data available'}
            </p>
          </div>
        </Card>
      ) : sortedProducts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-semibold mb-2">No products found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Products ({formatNumber(sortedProducts.length)})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedProducts.map((product) => (
                  <div
                    key={product.product_code}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{product.product_code}</div>
                      <div className="text-sm text-muted-foreground">{product.description}</div>
                      {product.last_ordered && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Last ordered: {new Date(product.last_ordered).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-6 space-y-1">
                      {product.total_revenue !== undefined && (
                        <div className="font-bold text-lg">{formatCurrency(product.total_revenue)}</div>
                      )}
                      {product.total_quantity !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          Qty: {formatNumber(product.total_quantity)}
                        </div>
                      )}
                      {product.order_count !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {product.order_count} orders
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                className="gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

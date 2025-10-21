import { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { customersApi } from '@/services/customers';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils/format';
import { getCustomerSegment, getSegmentBadgeClass } from '@/utils/customer-segments';
import { Users, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');

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
    queryKey: ['customers'],
    queryFn: ({ pageParam }) =>
      customersApi.listCustomers({
        limit: 100,
        lastEvaluatedKey: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.meta?.lastEvaluatedKey,
    initialPageParam: undefined as string | undefined,
  });

  // Flatten all pages into a single array
  const customers = data?.pages.flatMap((page) => page.data) || [];
  
  // Client-side search (backend doesn't support search yet)
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">View and manage customer relationships</p>
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
          <CardTitle>Search Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            All Customers ({filteredCustomers.length} {searchTerm ? 'filtered' : 'loaded'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-destructive text-center py-8">
              <p className="font-semibold mb-2">Error loading customers</p>
              <p className="text-sm text-muted-foreground">Failed to connect to API. Please check CORS settings.</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description={searchTerm ? "Try adjusting your search to see more results." : "No customers available."}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Company</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Orders</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total Spend</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Last Order</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const segment = getCustomerSegment(customer);
                      return (
                        <tr key={customer.contactID} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <Link to={`/customers/${customer.contactID}`} className="text-primary hover:underline font-medium">
                              {customer.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{customer.email}</td>
                          <td className="py-3 px-4">{customer.company || '-'}</td>
                          <td className="py-3 px-4 text-right">{customer.metrics.orderCount}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(customer.metrics.totalSpend)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(customer.metrics.lastOrderDate)}</td>
                          <td className="py-3 px-4">
                            <Badge className={getSegmentBadgeClass(segment)} variant="secondary">
                              {segment}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {!searchTerm && hasNextPage && (
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
                      'Load More Customers'
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

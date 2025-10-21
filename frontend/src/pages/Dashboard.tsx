import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/reports';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils/format';
import { DollarSign, ShoppingCart, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['overview', dateRange],
    queryFn: () => reportsApi.getOverview(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-destructive">Error loading dashboard data</div>;
  if (!data?.data) return null;

  const { overview, recent_orders } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your sales and orders</p>
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
          <CardTitle>Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilter onDateChange={setDateRange} defaultPreset="thisMonth" />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today"
          value={formatCurrency(overview.today.revenue)}
          subtitle={`${overview.today.order_count} orders · Avg ${formatCurrency(overview.today.avg_order_value)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="This Week"
          value={formatCurrency(overview.this_week.revenue)}
          subtitle={`${overview.this_week.order_count} orders · Avg ${formatCurrency(overview.this_week.avg_order_value)}`}
          icon={ShoppingCart}
        />
        <MetricCard
          title="This Month"
          value={formatCurrency(overview.this_month.revenue)}
          subtitle={`${overview.this_month.order_count} orders · Avg ${formatCurrency(overview.this_month.avg_order_value)}`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Customers"
          value={overview.total_customers}
          subtitle="All time"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recent_orders && recent_orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_orders.slice(0, 10).map((order) => (
                    <tr key={order.orderID} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Link to={`/orders/${order.orderID}`} className="text-primary hover:underline font-medium">
                          {order.order_reference}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{order.customer.contact_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(order.totals.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent orders</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/services/customers';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils/format';
import { ArrowLeft, User, Mail, Phone, Building2, CreditCard, ShoppingCart, Calendar, TrendingUp } from 'lucide-react';

export default function CustomerDetail() {
  const { contactID } = useParams<{ contactID: string }>();
  const navigate = useNavigate();

  const { data: customerResponse, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer', contactID],
    queryFn: () => customersApi.getCustomer(contactID!),
    enabled: !!contactID,
  });

  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['customer-orders', contactID],
    queryFn: () => customersApi.getCustomerOrders(contactID!, { limit: 10 }),
    enabled: !!contactID,
  });

  const customer = customerResponse?.data;
  const orders = ordersResponse?.data || [];

  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/customers')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive py-8">
              <p className="font-semibold mb-2">Customer not found</p>
              <p className="text-sm text-muted-foreground">The customer could not be loaded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSegmentBadgeVariant = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return 'default';
      case 'Active':
        return 'secondary';
      case 'New':
        return 'outline';
      case 'Dormant':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/customers')} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <Badge variant={getSegmentBadgeVariant(customer.metrics.segment)}>
              {customer.metrics.segment}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Customer since {customer.metrics.lastOrderDate ? formatDate(customer.metrics.lastOrderDate) : 'N/A'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Lifetime Value</div>
          <div className="text-3xl font-bold">{formatCurrency(customer.metrics.totalSpend)}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customer.metrics.orderCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Orders placed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(customer.metrics.totalSpend)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Avg: {formatCurrency(parseFloat(customer.metrics.totalSpend) / customer.metrics.orderCount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Last Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {customer.metrics.lastOrderReference || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {customer.metrics.lastOrderDate ? formatDate(customer.metrics.lastOrderDate) : 'No orders'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Full Name</div>
              <div className="font-medium">{customer.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                {customer.email || '-'}
              </a>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </div>
              <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                {customer.phone || '-'}
              </a>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </div>
              <div>{customer.company || '-'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Customer ID</div>
              <div className="font-mono text-sm">{customer.contactID}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Account Name</div>
              <div>{customer.accountName || customer.ppl_account || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Account Code</div>
              <div className="font-mono">{customer.accountCode || customer.ppl_account_number || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Segment</div>
              <div>
                <Badge variant={getSegmentBadgeVariant(customer.metrics.segment)}>
                  {customer.metrics.segment}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <LoadingSpinner />
          ) : orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No orders found for this customer
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Order Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Items</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
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
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4 text-right">{order.items.length}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(order.totals.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="capitalize text-sm">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orders.length > 0 && (
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link to={`/orders?customerID=${customer.contactID}`}>
                  View All Orders
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

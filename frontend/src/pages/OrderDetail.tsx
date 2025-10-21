import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/services/orders';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils/format';
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, Hash } from 'lucide-react';

export default function OrderDetail() {
  const { orderID } = useParams<{ orderID: string }>();
  const navigate = useNavigate();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['order', orderID],
    queryFn: () => ordersApi.getOrder(orderID!),
    enabled: !!orderID,
  });

  const order = response?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/orders')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive py-8">
              <p className="font-semibold mb-2">Order not found</p>
              <p className="text-sm text-muted-foreground">The order could not be loaded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/orders')} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <h1 className="text-3xl font-bold">Order #{order.order_reference}</h1>
          <p className="text-muted-foreground mt-1">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Order Total</div>
          <div className="text-3xl font-bold">{formatCurrency(order.totals.total)}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="font-medium">
                <Link
                  to={`/customers/${order.contactID}`}
                  className="text-primary hover:underline"
                >
                  {order.customer.contact_name}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div>{order.customer.email || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone</div>
              <div>{order.customer.phone || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div>{order.customer.company || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Account</div>
              <div>{order.customer.account_name} ({order.customer.account_code})</div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div>{order.delivery.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div>{order.delivery.company || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div>
                {order.delivery.street}<br />
                {order.delivery.city}<br />
                {order.delivery.country}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone</div>
              <div>{order.delivery.phone || '-'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Payment Type</div>
              <div className="font-medium">{order.payment.payment_type}</div>
            </div>
            {order.payment.transaction_id && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Transaction ID</div>
                <div className="font-mono text-sm">{order.payment.transaction_id}</div>
              </div>
            )}
            {order.payment.amount && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Amount</div>
                <div className="font-medium">{order.payment.amount}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Order ID</div>
              <div className="font-mono text-sm">{order.orderID}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Reference</div>
              <div className="font-medium">{order.order_reference}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Greentree ID</div>
              <div className="font-mono text-sm">{order.greentree_id || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="capitalize">{order.status}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
              <div>{formatDate(order.updatedAt)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Product Code</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Description</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Unit Price</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-3 px-4 font-mono text-sm">{item.product_code}</td>
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.totals.subtotal)}</span>
            </div>
            {order.totals.freight && parseFloat(order.totals.freight) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Freight {order.totals.freight_description && `(${order.totals.freight_description})`}:
                </span>
                <span className="font-medium">{formatCurrency(order.totals.freight)}</span>
              </div>
            )}
            {order.totals.gst && parseFloat(order.totals.gst) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST:</span>
                <span className="font-medium">{formatCurrency(order.totals.gst)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(order.totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

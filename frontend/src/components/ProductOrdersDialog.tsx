import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/services/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/utils/format';
import { Package, Users, TrendingUp, ShoppingCart, Calendar, User, Mail, Phone, Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductOrdersDialogProps {
  productCode: string | null;
  productDescription?: string;
  onClose: () => void;
}

export function ProductOrdersDialog({ productCode, productDescription, onClose }: ProductOrdersDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-orders', productCode],
    queryFn: () => productsApi.getProductOrders(productCode!),
    enabled: !!productCode,
  });

  const productOrders = data?.data;

  return (
    <Dialog open={!!productCode} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            {productCode}
            {productOrders?.category && (
              <Badge variant="secondary" className="ml-2">
                {productOrders.category}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {productDescription || 'View all orders for this product'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error || !productOrders ? (
          <div className="text-center text-destructive py-12">
            <p className="font-semibold mb-2">Unable to load product orders</p>
            <p className="text-sm text-muted-foreground">
              {error ? 'Failed to connect to API' : 'No data available'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{formatNumber(productOrders.summary.totalOrders)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <Users className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Unique Customers</p>
                        <p className="text-2xl font-bold">{formatNumber(productOrders.summary.uniqueCustomers)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <Package className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Quantity</p>
                        <p className="text-2xl font-bold">{formatNumber(productOrders.summary.totalQuantitySold)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-info/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(parseFloat(productOrders.summary.totalRevenue))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders List */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order History ({productOrders.orders.length})
                </h3>
                <div className="space-y-3">
                  {productOrders.orders.map((order) => (
                    <Card key={order.orderID} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Order Info */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-lg">Order #{order.order_reference}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(order.createdAt).toLocaleDateString('en-NZ', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>

                            {/* Product Item Details */}
                            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                              <p className="text-sm font-medium">Product Details</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Quantity:</span>
                                <span className="font-semibold">{formatNumber(order.productItem.quantity)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Unit Price:</span>
                                <span>{formatCurrency(order.productItem.unit_price)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                                <span className="font-medium">Total:</span>
                                <span className="font-bold text-primary">{formatCurrency(parseFloat(order.productItem.total_price.toString()))}</span>
                              </div>
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium mb-2">Customer Information</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{order.customer.contact_name}</p>
                                  {order.customer.company && (
                                    <p className="text-muted-foreground text-xs truncate">{order.customer.company}</p>
                                  )}
                                </div>
                              </div>

                              {order.customer.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <p className="text-muted-foreground truncate text-xs">{order.customer.email}</p>
                                </div>
                              )}

                              {order.customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <p className="text-muted-foreground text-xs">{order.customer.phone}</p>
                                </div>
                              )}

                              {order.customer.account_name && (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-muted-foreground text-xs truncate">{order.customer.account_name}</p>
                                    {order.customer.account_code && (
                                      <p className="text-muted-foreground text-xs">Code: {order.customer.account_code}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

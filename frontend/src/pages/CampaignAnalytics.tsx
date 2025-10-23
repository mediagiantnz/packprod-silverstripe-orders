import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/services/campaigns';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import { ArrowLeft, Mail, CheckCircle, Eye, MousePointerClick, ShoppingCart, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CampaignAnalytics() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => campaignsApi.getCampaignAnalytics(id!),
    enabled: !!id,
  });

  const analytics = data?.data;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const stats = [
    {
      title: 'Sent',
      value: analytics?.performance.sent || 0,
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Delivered',
      value: analytics?.performance.delivered || 0,
      rate: analytics?.rates.deliveryRate,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Opened',
      value: analytics?.performance.opened || 0,
      rate: analytics?.rates.openRate,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Clicked',
      value: analytics?.performance.clicked || 0,
      rate: analytics?.rates.clickRate,
      icon: MousePointerClick,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Converted',
      value: analytics?.performance.converted || 0,
      rate: analytics?.rates.conversionRate,
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Revenue',
      value: `$${analytics?.performance.revenue || '0.00'}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-destructive text-center py-8">
          <p className="font-semibold mb-2">Error loading analytics</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : analytics ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{analytics.campaignName}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`${getStatusBadgeColor(analytics.status)} text-white`}>
                      {analytics.status}
                    </Badge>
                    <Badge variant="outline">{analytics.segment}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDate(analytics.createdAt)}</dd>
                </div>
                {analytics.sentAt && (
                  <div>
                    <dt className="text-muted-foreground">Sent</dt>
                    <dd className="font-medium">{formatDate(analytics.sentAt)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      {stat.rate && (
                        <p className="text-sm text-muted-foreground mt-1">{stat.rate}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {analytics.performance.sent === 0 && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardContent className="pt-6">
                <p className="text-yellow-800">
                  This campaign hasn't been sent yet. Analytics will be available once the campaign is sent.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

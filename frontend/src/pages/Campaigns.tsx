import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/services/campaigns';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/utils/format';
import { Mail, RefreshCw, Plus, Send, BarChart3, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Campaign, CampaignStatus } from '@/types/campaign';

export default function Campaigns() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: () =>
      campaignsApi.listCampaigns(
        statusFilter !== 'all' ? { status: statusFilter } : {}
      ),
  });

  const campaigns = data?.data || [];

  const getStatusBadgeColor = (status: CampaignStatus) => {
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

  const getSegmentBadgeColor = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return 'bg-purple-500';
      case 'Active':
        return 'bg-green-500';
      case 'New':
        return 'bg-blue-500';
      case 'Dormant':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and manage email campaigns</p>
        </div>
        <div className="flex gap-2">
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
          <Button size="sm" className="gap-2" asChild>
            <Link to="/campaigns/new">
              <Plus className="h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Campaign Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            All Campaigns ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-destructive text-center py-8">
              <p className="font-semibold mb-2">Error loading campaigns</p>
              <p className="text-sm text-muted-foreground">
                Failed to connect to API. Please check CORS settings.
              </p>
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No campaigns found"
              description="Create your first email campaign to get started."
              action={
                <Button className="mt-4" asChild>
                  <Link to="/campaigns/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Segment
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Sent
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Delivered
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Opened
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign: Campaign) => (
                    <tr
                      key={campaign.campaignID}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {campaign.subject}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getStatusBadgeColor(campaign.status)} text-white`}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getSegmentBadgeColor(campaign.segment)} text-white`}>
                          {campaign.segment}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">{campaign.stats.sent}</td>
                      <td className="py-3 px-4 text-right">{campaign.stats.delivered}</td>
                      <td className="py-3 px-4 text-right">{campaign.stats.opened}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/campaigns/${campaign.campaignID}/analytics`}>
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/campaigns/${campaign.campaignID}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {campaign.status === 'draft' && (
                            <Button size="sm" variant="ghost">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

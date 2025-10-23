import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '@/services/campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campaign, CampaignSegment } from '@/types/campaign';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface CampaignFormProps {
  campaign?: Campaign;
  mode: 'create' | 'edit';
}

export function CampaignForm({ campaign, mode }: CampaignFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    content: campaign?.content || '',
    segment: campaign?.segment || 'All' as CampaignSegment,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => campaignsApi.updateCampaign(campaign!.campaignID, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Email content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (mode === 'create') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Campaign Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Summer Sale 2025"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Email Subject</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Exclusive Summer Deals Inside!"
              className={errors.subject ? 'border-red-500' : ''}
            />
            {errors.subject && <p className="text-sm text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Customer Segment</label>
            <Select
              value={formData.segment}
              onValueChange={(value) => setFormData({ ...formData, segment: value as CampaignSegment })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Customers</SelectItem>
                <SelectItem value="VIP">VIP ($5000+ spend)</SelectItem>
                <SelectItem value="Active">Active (ordered in 90 days)</SelectItem>
                <SelectItem value="New">New (first 30 days)</SelectItem>
                <SelectItem value="Dormant">Dormant (no orders 90+ days)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose which customer segment should receive this campaign
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Email Content (HTML)</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={`<h1>Hello {firstName}!</h1>\n<p>Thank you for being a valued customer at {company}.</p>\n<p>Check out our latest products...</p>`}
              rows={12}
              className={`font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
            />
            {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content}</p>}
            <p className="text-sm text-muted-foreground mt-1">
              Available tokens: {'{firstName}'}, {'{lastName}'}, {'{name}'}, {'{company}'}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">
              Error {mode === 'create' ? 'creating' : 'updating'} campaign:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Campaign' : 'Update Campaign'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/campaigns')}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

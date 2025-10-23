import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/services/campaigns';
import { CampaignForm } from '@/components/CampaignForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function CampaignEdit() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getCampaign(id!),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <p className="text-muted-foreground mt-1">Update campaign details and content</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-destructive text-center py-8">
          <p className="font-semibold mb-2">Error loading campaign</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : (
        <CampaignForm mode="edit" campaign={data?.data} />
      )}
    </div>
  );
}

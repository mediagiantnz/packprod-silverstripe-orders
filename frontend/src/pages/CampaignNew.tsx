import { CampaignForm } from '@/components/CampaignForm';

export default function CampaignNew() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Campaign</h1>
        <p className="text-muted-foreground mt-1">Create a new email marketing campaign</p>
      </div>

      <CampaignForm mode="create" />
    </div>
  );
}

import { ComingSoon } from '@/components/ComingSoon';

export default function Campaigns() {
  return (
    <ComingSoon
      feature="CAMPAIGNS"
      description="Marketing automation and campaign builder will be available soon."
      features={[
        'Visual workflow builder',
        'Email template editor',
        'Campaign analytics',
        'A/B testing',
        'Customer segmentation',
      ]}
    />
  );
}

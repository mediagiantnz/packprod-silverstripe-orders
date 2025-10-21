import { ComingSoon } from '@/components/ComingSoon';

export default function Alerts() {
  return (
    <ComingSoon
      feature="ALERTS"
      description="Email alerts and notifications will be available soon."
      features={[
        'New customer alerts',
        'High-value order notifications',
        'Large quantity alerts',
        'Custom alert rules',
        'Alert history',
      ]}
    />
  );
}

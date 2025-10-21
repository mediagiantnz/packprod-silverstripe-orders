import { ComingSoon } from '@/components/ComingSoon';

export default function UserManagement() {
  return (
    <ComingSoon
      feature="USER_MANAGEMENT"
      description="User management and access control will be available soon."
      features={[
        'User roles and permissions',
        'Team member management',
        'Activity logs',
        'Security settings',
      ]}
    />
  );
}

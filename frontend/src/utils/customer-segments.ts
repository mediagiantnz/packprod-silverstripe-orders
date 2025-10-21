import { Customer, CustomerSegment } from '@/types/customer';
import { differenceInDays, parseISO } from 'date-fns';

const VIP_THRESHOLD = 5000; // $5000+ total spend = VIP

export function getCustomerSegment(customer: Customer): CustomerSegment {
  const daysSinceLastOrder = customer.metrics.lastOrderDate
    ? differenceInDays(new Date(), parseISO(customer.metrics.lastOrderDate))
    : Infinity;

  const totalSpend = parseFloat(customer.metrics.totalSpend || '0');

  // VIP: High spend
  if (totalSpend >= VIP_THRESHOLD) return 'VIP';

  // New: First order within 30 days
  if (customer.metrics.orderCount === 1 && daysSinceLastOrder <= 30) return 'New';

  // Dormant: No order in 90+ days
  if (daysSinceLastOrder > 90) return 'Dormant';

  // Active: Default
  return 'Active';
}

export function getSegmentColor(segment: CustomerSegment): string {
  switch (segment) {
    case 'VIP':
      return 'default'; // primary
    case 'New':
      return 'secondary';
    case 'Active':
      return 'outline';
    case 'Dormant':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function getSegmentBadgeClass(segment: CustomerSegment): string {
  switch (segment) {
    case 'VIP':
      return 'bg-primary text-primary-foreground';
    case 'New':
      return 'bg-success text-success-foreground';
    case 'Active':
      return 'bg-secondary text-secondary-foreground';
    case 'Dormant':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

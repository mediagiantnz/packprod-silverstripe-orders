export interface Customer {
  contactID: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  company: string;
  accountName: string;
  accountCode: string;

  // Legacy fields for backwards compatibility
  ppl_account?: string;
  ppl_account_number?: string;
  clientID?: string;
  createdAt?: string;
  updatedAt?: string;

  metrics: {
    orderCount: number;
    totalSpend: string;
    lastOrderDate: string | null;
    lastOrderReference: string | null;
    segment: CustomerSegment;
  };

  status?: CustomerSegment; // Deprecated: use metrics.segment
}

export type CustomerSegment = 'New' | 'Active' | 'Dormant' | 'VIP';

export interface CustomersParams {
  limit?: number;
  lastEvaluatedKey?: string | null;
}

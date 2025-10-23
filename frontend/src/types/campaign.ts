/**
 * Campaign Types
 * TypeScript interfaces for marketing campaign management
 */

export type CampaignStatus = 'draft' | 'active' | 'completed';
export type CampaignSegment = 'All' | 'VIP' | 'Active' | 'New' | 'Dormant';
export type CampaignType = 'email';

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
}

export interface Campaign {
  campaignID: string;
  clientID: string;
  name: string;
  subject: string;
  content: string;
  segment: CampaignSegment;
  type: CampaignType;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  stats: CampaignStats;
}

export interface CampaignAnalyticsRates {
  deliveryRate: string;
  openRate: string;
  clickRate: string;
  conversionRate: string;
}

export interface CampaignAnalyticsPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  segment: CampaignSegment;
  status: CampaignStatus;
  createdAt: string;
  sentAt: string | null;
  performance: CampaignAnalyticsPerformance;
  rates: CampaignAnalyticsRates;
  timeline: any[];
  topLinks: any[];
  customerSegments: any[];
}

export interface CreateCampaignRequest {
  name: string;
  subject: string;
  content: string;
  segment?: CampaignSegment;
  type?: CampaignType;
}

export interface UpdateCampaignRequest {
  name?: string;
  subject?: string;
  content?: string;
  segment?: CampaignSegment;
  status?: CampaignStatus;
}

export interface SendCampaignResponse {
  campaignId: string;
  sent: number;
  delivered: number;
  errors: number;
  segment: CampaignSegment;
  totalCustomers: number;
}

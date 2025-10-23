import {
  Campaign,
  CampaignAnalytics,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  SendCampaignResponse
} from '@/types/campaign';
import { StandardResponse } from '@/types/api';
import { apiRequest, buildQueryString } from './api-client';

export interface CampaignsListParams {
  limit?: number;
  status?: string;
  lastEvaluatedKey?: string;
}

export const campaignsApi = {
  async listCampaigns(params: CampaignsListParams = {}): Promise<StandardResponse<Campaign[]>> {
    const queryString = buildQueryString(params);
    return apiRequest<Campaign[]>(`/campaigns${queryString}`);
  },

  async getCampaign(campaignID: string): Promise<StandardResponse<Campaign>> {
    return apiRequest<Campaign>(`/campaigns/${campaignID}`);
  },

  async createCampaign(data: CreateCampaignRequest): Promise<StandardResponse<Campaign>> {
    return apiRequest<Campaign>('/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async updateCampaign(campaignID: string, data: UpdateCampaignRequest): Promise<StandardResponse<Campaign>> {
    return apiRequest<Campaign>(`/campaigns/${campaignID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async deleteCampaign(campaignID: string): Promise<StandardResponse<{ campaignID: string }>> {
    return apiRequest<{ campaignID: string }>(`/campaigns/${campaignID}`, {
      method: 'DELETE',
    });
  },

  async sendCampaign(campaignID: string): Promise<StandardResponse<SendCampaignResponse>> {
    return apiRequest<SendCampaignResponse>(`/campaigns/${campaignID}/send`, {
      method: 'POST',
    });
  },

  async getCampaignAnalytics(campaignID: string): Promise<StandardResponse<CampaignAnalytics>> {
    return apiRequest<CampaignAnalytics>(`/campaigns/${campaignID}/analytics`);
  },
};

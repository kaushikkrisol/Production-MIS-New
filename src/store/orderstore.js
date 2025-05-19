// File: /store/v.js
import { create } from 'zustand';
import config from '../config';

const useCampaignStore = create((set) => ({
  campaigns: [],

  fetchCampaigns: async () => {
    try {
      const res = await fetch(config.Order.URL.GetOrder);
      const data = await res.json();
      set({ campaigns: data });
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
    }
  },



  addCampaign: (campaign) =>
    set((state) => {
      fetch(config.Order.URL.SaveOrder, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      }).catch(console.error);

      return { campaigns: [...state.campaigns, campaign] };
    }),

    setCampaigns: (updatedCampaigns) => set({ campaigns: updatedCampaigns }),
    
    updateItemStatus: ({ from, to, campaignId, itemId }) => {
      set((state) => {
        const updatedCampaigns = state.campaigns.map((campaign) => {
          if (campaign.id === campaignId) {
            return {
              ...campaign,
              items: campaign.items.map((item) =>
                item.id === itemId ? { ...item, status: to } : item
              ),
            };
          }
          return campaign;
        });
        return { campaigns: updatedCampaigns };
      });
    }
    
  }));

export default useCampaignStore;

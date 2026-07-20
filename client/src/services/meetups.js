import { api } from './api.js';

export const meetupsService = {
  async propose({ partnerId, place, scheduledAt }) {
    return api.post('/meetups', { partnerId, place, scheduledAt });
  },
  async list() {
    return api.get('/meetups');
  },
  async confirm(id, pin) {
    return api.post(`/meetups/${id}/confirm`, { pin });
  },
  async cancel(id) {
    return api.post(`/meetups/${id}/cancel`);
  },
};

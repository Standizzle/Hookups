import { api } from './api.js';

export const parentalService = {
  async link(minorPhone) {
    return api.post('/parental/link', { minorPhone });
  },
  async myLinks() {
    return api.get('/parental/my-links');
  },
  async accept(id) {
    return api.post(`/parental/${id}/accept`);
  },
  async updateSettings(id, settings) {
    return api.patch(`/parental/${id}`, settings);
  },
};

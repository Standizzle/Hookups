import { api } from './api.js';

export const parentalService = {
  async link(minorPhone) {
    return api.post('/parental/link', { minorPhone });
  },
  async myLinks() {
    return api.get('/parental/my-links');
  },
};

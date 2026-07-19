import { api } from './api.js';

export const partnersService = {
  async list() {
    return api.get('/partners');
  },
  async request(partnerId) {
    return api.post('/partners/request', { partnerId });
  },
  async accept(id) {
    return api.post(`/partners/${id}/accept`);
  },
  async unlink(id) {
    return api.delete(`/partners/${id}`);
  },
};

import { api } from './api.js';

export const billingService = {
  async status() {
    return api.get('/billing/status');
  },
  async checkout(plan) {
    return api.post('/billing/checkout', { plan });
  },
  async cancel() {
    return api.post('/billing/cancel');
  },
  async addGuardian(phone) {
    return api.post('/billing/family/guardians', { phone });
  },
  async removeGuardian(id) {
    return api.delete(`/billing/family/guardians/${id}`);
  },
};

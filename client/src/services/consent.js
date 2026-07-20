import { api } from './api.js';

export const consentService = {
  async request({ consenterId, method, terms, location, expiresInMinutes }) {
    return api.post('/consent/request', { consenterId, method, terms, location, expiresInMinutes });
  },

  async getDisclosure(consentId) {
    return api.get(`/consent/${consentId}`);
  },

  async confirm(consentId, { pin, agreedToLocation, lat, lng }) {
    return api.post(`/consent/${consentId}/confirm`, { pin, agreedToLocation, lat, lng });
  },

  async revoke(consentId, { pin, reason }) {
    return api.post(`/consent/${consentId}/revoke`, { pin, reason });
  },

  async list({ status, limit, offset } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (limit)  params.set('limit', limit);
    if (offset) params.set('offset', offset);
    return api.get(`/consent?${params}`);
  },

  async getRecord(id) {
    return api.get(`/consent/${id}/record`);
  },

  async downloadPdf(id, filename) {
    return api.download(`/consent/${id}/export/pdf`, filename);
  },

  async downloadAllCsv() {
    return api.download('/consent/export/csv', 'hookups-consent-records.csv');
  },
};

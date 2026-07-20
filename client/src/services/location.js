import { api } from './api.js';

export const locationService = {
  async start(recordId, precision = 'exact') {
    return api.post('/location/share/start', { recordId, precision });
  },
  async ping(recordId, { lat, lng, accuracy }) {
    return api.post('/location/share/ping', { recordId, lat, lng, accuracy });
  },
  async stop(recordId) {
    return api.post('/location/share/stop', { recordId });
  },
  async getPartner(recordId) {
    return api.get(`/location/share/${recordId}`);
  },
};

import { api } from './api.js';

export const discoverService = {
  async nearby() {
    return api.get('/discover/nearby');
  },
  async action(targetUserId, action) {
    return api.post('/discover/action', { targetUserId, action });
  },
  async matches() {
    return api.get('/discover/matches');
  },
};

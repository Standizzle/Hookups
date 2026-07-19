import { api } from './api.js';

export const logsService = {
  async list({ limit, offset } = {}) {
    const params = new URLSearchParams();
    if (limit)  params.set('limit', limit);
    if (offset) params.set('offset', offset);
    return api.get(`/users/me/logs?${params}`);
  },
};

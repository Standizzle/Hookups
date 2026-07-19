import { api } from './api.js';

export const relationshipsService = {
  async mine() {
    return api.get('/relationships');
  },
  async request(partnerPhone) {
    return api.post('/relationships/request', { partnerPhone });
  },
  async accept(id, pin) {
    return api.post(`/relationships/${id}/accept`, { pin });
  },
  async updateSettings(id, settings) {
    return api.patch(`/relationships/${id}/settings`, settings);
  },
  async end(id, pin) {
    return api.post(`/relationships/${id}/end`, { pin });
  },
  async addHallPass(id, phone, expiresAt) {
    return api.post(`/relationships/${id}/hall-pass`, { phone, expiresAt });
  },
  async removeHallPass(id, entryId) {
    return api.delete(`/relationships/${id}/hall-pass/${entryId}`);
  },
  async approvals() {
    return api.get('/relationships/approvals');
  },
  async approveApproval(id) {
    return api.post(`/relationships/approvals/${id}/approve`);
  },
  async denyApproval(id) {
    return api.post(`/relationships/approvals/${id}/deny`);
  },
};

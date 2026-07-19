import { api } from './api.js';

export const guardianService = {
  async listContacts() {
    return api.get('/guardian/contacts');
  },
  async addContact({ name, phone, relation, isPrimary }) {
    return api.post('/guardian/contacts', { name, phone, relation, isPrimary });
  },
  async removeContact(id) {
    return api.delete(`/guardian/contacts/${id}`);
  },
  async sendAlert(type, { lat, lng } = {}) {
    return api.post('/alerts/guardian', { type, lat, lng });
  },
};

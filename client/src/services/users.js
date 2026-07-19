import { api } from './api.js';

export const usersService = {
  async lookupByPhone(phone) {
    return api.get(`/users/lookup?phone=${encodeURIComponent(phone)}`);
  },
};

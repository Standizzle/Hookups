import { api } from './api.js';

export const usersService = {
  async lookupByPhone(phone) {
    return api.get(`/users/lookup?phone=${encodeURIComponent(phone)}`);
  },
  async updateProfile({ university, bio, avatarEmoji, interests, discoverable }) {
    return api.patch('/users/me/profile', { university, bio, avatarEmoji, interests, discoverable });
  },
  async updateLocation(lat, lng) {
    return api.post('/users/me/location', { lat, lng });
  },
};

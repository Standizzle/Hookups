import { api } from './api.js';

export const usersService = {
  async lookupByPhone(phone) {
    return api.get(`/users/lookup?phone=${encodeURIComponent(phone)}`);
  },
  async checkHandle(username) {
    return api.get(`/users/handle-check?username=${encodeURIComponent(username)}`);
  },
  async updateProfile({ username, university, bio, interests, discoverable }) {
    return api.patch('/users/me/profile', { username, university, bio, interests, discoverable });
  },
  async updateLocation(lat, lng) {
    return api.post('/users/me/location', { lat, lng });
  },
  async uploadAvatar(file) {
    const form = new FormData();
    form.append('file', file);
    return api.postForm('/users/me/avatar', form);
  },
  async deleteAvatar() {
    return api.delete('/users/me/avatar');
  },
};

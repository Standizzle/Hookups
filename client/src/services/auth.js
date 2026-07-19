import { api, setToken, clearToken } from './api.js';

export const authService = {
  async signup({ fullName, phone }) {
    return api.post('/auth/signup', { fullName, phone });
  },

  async verifyOTP({ phone, code, fullName }) {
    const data = await api.post('/auth/verify-otp', { phone, code, fullName });
    if (data.token) setToken(data.token);
    return data;
  },

  async setPIN({ pin, duressPin }) {
    const data = await api.post('/auth/set-pin', { pin, duressPin });
    if (data.token) setToken(data.token);
    return data;
  },

  async login({ phone, pin, lat, lng }) {
    const data = await api.post('/auth/login', { phone, pin, lat, lng });
    if (data.token) setToken(data.token);
    return data;
  },

  async forgotPin(phone) {
    return api.post('/auth/forgot-pin', { phone });
  },

  async resetPin({ phone, code, newPin }) {
    const data = await api.post('/auth/reset-pin', { phone, code, newPin });
    if (data.token) setToken(data.token);
    return data;
  },

  async setDuressPin({ currentPin, duressPin }) {
    return api.patch('/auth/duress-pin', { currentPin, duressPin });
  },

  async getMe() {
    return api.get('/auth/me');
  },

  logout() {
    clearToken();
  },
};

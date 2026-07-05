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

  async login({ phone, pin }) {
    const data = await api.post('/auth/login', { phone, pin });
    if (data.token) setToken(data.token);
    return data;
  },

  async getMe() {
    return api.get('/auth/me');
  },

  logout() {
    clearToken();
  },
};

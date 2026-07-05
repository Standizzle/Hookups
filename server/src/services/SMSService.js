import twilio from 'twilio';

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      // Dev stub — log instead of send
      return null;
    }
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export const SMSService = {
  async send(to, body) {
    const client = getClient();
    if (!client) {
      console.log(`[SMS stub] To: ${to}\n${body}`);
      return { sid: 'dev-stub', status: 'dev' };
    }
    return client.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to, body });
  },

  async sendOTP(to) {
    const client = getClient();
    if (!client) {
      const code = '123456'; // dev OTP
      console.log(`[OTP stub] To: ${to} Code: ${code}`);
      return { code };
    }
    await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to, channel: 'sms' });
    return {};
  },

  async verifyOTP(to, code) {
    const client = getClient();
    if (!client) {
      return code === '123456'; // dev accepts this code
    }
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code });
    return result.status === 'approved';
  },
};

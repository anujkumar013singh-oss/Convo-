import api from './api';

/**
 * Email Service for OTP Delivery via Brevo SMTP Relay
 */

export const sendEmailOtp = async (email, otpCode) => {
  try {
    const res = await api.sendOtp(email, otpCode);
    if (res && res.success !== false) {
      return { success: true };
    }
  } catch (err) {
    console.error('API send-otp call error:', err);
  }

  return { success: false, error: 'Failed to send verification code email' };
};

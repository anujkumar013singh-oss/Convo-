import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for auth & OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  validate: { trustProxy: false },
});

router.use(authLimiter);

// Configure Nodemailer Transporter using Brevo SMTP Relay
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS on 587
  auth: {
    user: process.env.SMTP_USER || process.env.BREVO_USER || '',
    pass: process.env.BREVO_API_KEY || process.env.SMTP_PASS || '',
  },
});

// Helper function to send OTP via Brevo SMTP Relay with Modern UI Template
const sendBrevoEmailOtp = async (email, otpCode) => {
  try {
    const senderEmail = process.env.SENDER_EMAIL || 'anujkumar013singh@gmail.com';
    const info = await transporter.sendMail({
      from: `"Convo Verification" <${senderEmail}>`,
      to: email,
      subject: `${otpCode} is your Convo security verification code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convo Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; background-color: #121215; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  <!-- Top Gradient Accent Bar -->
                  <tr>
                    <td height="4" style="background: linear-gradient(90deg, #7c5cfc 0%, #a78bfa 50%, #6366f1 100%);"></td>
                  </tr>

                  <!-- Header / Logo -->
                  <tr>
                    <td style="padding: 32px 32px 20px 32px; text-align: center;">
                      <div style="display: inline-block; background: rgba(124, 92, 252, 0.12); border: 1px solid rgba(124, 92, 252, 0.3); border-radius: 16px; padding: 10px 18px; margin-bottom: 16px;">
                        <span style="font-size: 18px; font-weight: 800; color: #a78bfa; letter-spacing: 2px;">CONVO</span>
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Verify your email address</h1>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                        Enter the following 6-digit code to complete your security verification.
                      </p>
                    </td>
                  </tr>

                  <!-- OTP Box -->
                  <tr>
                    <td style="padding: 10px 32px 24px 32px;" align="center">
                      <div style="background: linear-gradient(180deg, rgba(24, 24, 28, 0.9) 0%, rgba(18, 18, 22, 0.9) 100%); border: 1px solid rgba(124, 92, 252, 0.4); border-radius: 18px; padding: 24px; text-align: center; box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 24px rgba(124, 92, 252, 0.15);">
                        <div style="font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 38px; font-weight: 800; color: #c4b5fd; letter-spacing: 10px; padding-left: 10px;">
                          ${otpCode}
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- Expiration Notice -->
                  <tr>
                    <td style="padding: 0 32px 24px 32px;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 12px 16px;">
                        <tr>
                          <td style="font-size: 13px; color: #a1a1aa; text-align: center; line-height: 1.4;">
                            ⏱️ This verification code is valid for <strong style="color: #ffffff;">10 minutes</strong>. Do not share this code with anyone.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 32px;">
                      <div style="border-top: 1px solid rgba(255,255,255,0.06);"></div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px 32px 32px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                        If you didn't request this code, you can safely ignore this email. Someone may have typed your address by mistake.
                      </p>
                      <p style="margin: 12px 0 0 0; font-size: 11px; color: #52525b; font-weight: 500;">
                        © CONVO Inc. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`[Brevo SMTP Relay] Modern Email Sent to ${email} from ${senderEmail} (Message ID: ${info.messageId})`);
    return true;
  } catch (err) {
    console.error('[Brevo SMTP Relay Error]:', err.message);
    return false;
  }
};

// ── POST /api/auth/send-otp ──
router.post('/send-otp', async (req, res) => {
  try {
    const { email, otp, isForgotPassword } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const emailLower = email.toLowerCase().trim();

    // Verification check: Ensure user is registered ONLY for Forgot Password OTP requests
    if (isForgotPassword) {
      const existingUser = await User.findOne({ email: emailLower });
      if (!existingUser) {
        return res.status(404).json({ error: 'This email is not registered with any account. Please check your email or create a new account.' });
      }
    }

    const otpCode = otp || Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email: emailLower });
    await OTP.create({ email: emailLower, otp: otpCode });

    await sendBrevoEmailOtp(emailLower, otpCode);

    res.json({ success: true, message: 'OTP code sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

// ── POST /api/auth/verify-otp ──
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), otp: otp.trim() });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    await OTP.deleteMany({ email: email.toLowerCase() });
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { username, fullName, email, phone, password, avatarUrl } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanUsername = (username || '').replace(/^@+/, '').trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const usernameLower = cleanUsername.toLowerCase();
    const emailLower = email.toLowerCase().trim();

    // Check existing username or email
    const existingUser = await User.findOne({
      $or: [{ usernameLower }, { email: emailLower }],
    });

    if (existingUser) {
      if (existingUser.usernameLower === usernameLower) {
        return res.status(400).json({ error: `Username @${cleanUsername} is already taken` });
      }
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password with bcrypt cost factor 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: cleanUsername,
      usernameLower,
      fullName: fullName || cleanUsername,
      email: emailLower,
      phone: phone || '',
      passwordHash,
      avatarUrl: avatarUrl || '',
      isEmailVerified: true,
      isOnline: true,
      lastSeenAt: new Date(),
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: newUser.toJSON(),
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email or Username and password are required' });
    }

    const cleanInput = (email || '').replace(/^@+/, '').trim();
    const cleanLower = cleanInput.toLowerCase();
    const escapedInput = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: new RegExp('^' + escapedInput + '$', 'i') },
        { usernameLower: cleanLower },
        { username: new RegExp('^' + escapedInput + '$', 'i') },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'No user account found matching this email or username' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    user.isOnline = true;
    user.lastSeenAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    try {
      if (res.cookie) {
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }
    } catch (e) {
      /* ignore cookie header error in serverless */
    }

    res.json({
      user: user.toJSON(),
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// ── POST /api/auth/refresh ──
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── POST /api/auth/reset-password (Real Database Password Update) ──
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email/Username and password (min 6 chars) are required' });
    }

    const cleanInput = (email || '').replace(/^@+/, '').toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { usernameLower: cleanInput },
        { username: cleanInput },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found with this email or username' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.isOnline = true;
    user.lastSeenAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      user: user.toJSON(),
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

export default router;

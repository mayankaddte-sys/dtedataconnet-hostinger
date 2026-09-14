// Password Reset Email Service for @vppup.in domain accounts
// OTP tracking still uses localStorage (short-lived, single-browser-session
// data), but the OTP itself is now actually emailed via a Supabase Edge
// Function backed by Gmail SMTP, instead of only being shown on-screen.

import { apiClient as supabase } from './apiClient';

export interface PasswordResetToken {
  token: string;
  email: string;
  userCode: string;
  userName: string;
  expiresAt: number; // timestamp
  otp: string; // 6-digit OTP
}

const RESET_TOKENS_STORAGE_KEY = 'dte_password_reset_tokens_v1';

// Get all active reset tokens
export const getActiveResetTokens = (): Record<string, PasswordResetToken> => {
  try {
    const raw = localStorage.getItem(RESET_TOKENS_STORAGE_KEY);
    if (!raw) return {};
    const tokens: Record<string, PasswordResetToken> = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired
    const active: Record<string, PasswordResetToken> = {};
    Object.entries(tokens).forEach(([key, val]) => {
      if (val.expiresAt > now) {
        active[key] = val;
      }
    });
    return active;
  } catch (e) {
    return {};
  }
};

// Send an email via the Supabase Edge Function (Gmail SMTP backend).
// Returns { success, error? } — never throws, so callers can just check
// the result instead of wrapping every call in try/catch.
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text, // now explicitly forwarded
      }
    });
    if (error) {
      console.error('Email send failed', error);
      return { success: false, error: error.message || 'Failed to send email.' };
    }
    if (data?.error) {
      console.error('Email send failed', data.error);
      return { success: false, error: data.error };
    }
    return { success: true };
  } catch (err) {
    console.error('Email send failed', err);
    return { success: false, error: 'Could not reach the email service.' };
  }
}

// Generate 6-digit numeric OTP, save it, and actually email it to the user.
export const requestEmailPasswordReset = async (
  email: string,
  userCode: string,
  userName: string
): Promise<{ success: boolean; otp: string; token: string; message: string; expiresMinutes: number }> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresMinutes = 15;
    const expiresAt = Date.now() + expiresMinutes * 60 * 1000;

    const resetData: PasswordResetToken = {
      token,
      email: normalizedEmail,
      userCode,
      userName,
      expiresAt,
      otp
    };

    const tokens = getActiveResetTokens();
    // Save under email as well as token key
    tokens[normalizedEmail] = resetData;
    tokens[token] = resetData;

    localStorage.setItem(RESET_TOKENS_STORAGE_KEY, JSON.stringify(tokens));

    // Actually send the email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Your DTE Portal Password Reset Code',
      text: `Hi ${userName},\n\nYour password reset code is: ${otp}\n\nThis code expires in ${expiresMinutes} minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Your password reset code for account <strong>${userCode}</strong>:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #4338ca;">${otp}</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">Expires in ${expiresMinutes} minutes. If you didn't request this, ignore this email.</p>
        </div>
      `
    });

    if (!emailResult.success) {
      return {
        success: false,
        otp: '',
        token: '',
        expiresMinutes: 0,
        message: `Failed to send email: ${emailResult.error || 'Unknown error'}`
      };
    }

    return {
      success: true,
      otp,
      token,
      expiresMinutes,
      message: `A 6-digit password reset code has been sent to ${normalizedEmail}. Please check your inbox (and spam folder).`
    };
  } catch (e) {
    console.error('requestEmailPasswordReset failed', e);
    return {
      success: false,
      otp: '',
      token: '',
      expiresMinutes: 0,
      message: 'Something went wrong while sending the email.'
    };
  }
};

// Verify OTP
export const verifyResetOtp = (
  email: string,
  enteredOtp: string
): { valid: boolean; token?: string; error?: string } => {
  const normalizedEmail = email.trim().toLowerCase();
  const tokens = getActiveResetTokens();
  const data = tokens[normalizedEmail];

  if (!data) {
    return { valid: false, error: 'No password reset request found, or it has expired. Please request a new one.' };
  }

  if (Date.now() > data.expiresAt) {
    return { valid: false, error: 'This OTP has expired (15-minute limit). Please request a new code.' };
  }

  if (data.otp !== enteredOtp.trim()) {
    return { valid: false, error: 'Incorrect OTP. Please enter the 6-digit code sent to your @vppup.in email.' };
  }

  return { valid: true, token: data.token };
};

// Complete Reset by Token or Verified OTP
export const completePasswordReset = (
  email: string,
  tokenOrOtp: string
): boolean => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const tokens = getActiveResetTokens();
    const data = tokens[normalizedEmail];
    if (data) {
      delete tokens[normalizedEmail];
      if (data.token) delete tokens[data.token];
      localStorage.setItem(RESET_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
    }
    return true;
  } catch (e) {
    return false;
  }
};

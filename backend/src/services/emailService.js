import nodemailer from 'nodemailer';

import logger from '../utils/logger.js';

/**
 * Email service for sending transactional emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Configure transporter based on environment
      const transporterConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      };

      // For development/testing, you can use ethereal email
      if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
        logger.warn('Email service running in development mode without SMTP configuration');
        logger.info('To test emails, configure SMTP settings in environment variables');
      }

      this.transporter = nodemailer.createTransporter(transporterConfig);
      this.initialized = true;

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send email with HTML template
   */
  async sendEmail(options) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { to, subject, html, text, template, templateData } = options;

    try {
      let emailHtml = html;
      let emailText = text;

      // Use template if provided
      if (template && this.templates[template]) {
        const templateResult = this.templates[template](templateData || {});
        emailHtml = templateResult.html;
        emailText = templateResult.text;
      }

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Messenger',
          address: process.env.EMAIL_FROM_ADDRESS || 'noreply@messenger.local',
        },
        to,
        subject,
        html: emailHtml,
        text: emailText,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        subject,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user) {
    const subject = `Welcome to Messenger, ${user.firstName || user.username}!`;

    const templateData = {
      user: user,
      verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${user.emailVerificationToken}`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@messenger.local',
    };

    return this.sendEmail({
      to: user.email,
      subject,
      template: 'welcome',
      templateData,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(user) {
    const subject = 'Verify your email address';

    const templateData = {
      user: user,
      verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${user.emailVerificationToken}`,
      expiryHours: 24,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@messenger.local',
    };

    return this.sendEmail({
      to: user.email,
      subject,
      template: 'emailVerification',
      templateData,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user) {
    const subject = 'Reset your password';

    const templateData = {
      user: user,
      resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${user.passwordResetToken}`,
      expiryMinutes: 10,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@messenger.local',
    };

    return this.sendEmail({
      to: user.email,
      subject,
      template: 'passwordReset',
      templateData,
    });
  }

  /**
   * Send admin notification for new user registration
   */
  async sendAdminNotification(user) {
    const subject = 'New user registration';

    const templateData = {
      user: user,
      adminPanelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users`,
      reviewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users/${user.id}`,
    };

    // Send to admin email if configured
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.warn('Admin email not configured, skipping admin notification');
      return;
    }

    return this.sendEmail({
      to: adminEmail,
      subject,
      template: 'adminNotification',
      templateData,
    });
  }

  /**
   * Send user approval email
   */
  async sendUserApprovalEmail(user, adminNotes) {
    const subject = 'Your account has been approved!';

    const templateData = {
      user: user,
      adminNotes: adminNotes,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@messenger.local',
    };

    return this.sendEmail({
      to: user.email,
      subject,
      template: 'userApproval',
      templateData,
    });
  }

  /**
   * Send user rejection email
   */
  async sendUserRejectionEmail(user, reason, adminNotes) {
    const subject = 'Account registration update';

    const templateData = {
      user: user,
      reason: reason,
      adminNotes: adminNotes,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@messenger.local',
    };

    return this.sendEmail({
      to: user.email,
      subject,
      template: 'userRejection',
      templateData,
    });
  }

  /**
   * Email templates
   */
  templates = {
    welcome: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Messenger</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #5a67d8; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to Messenger!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.user.firstName || data.user.username},</h2>
            <p>Welcome to Messenger! We're excited to have you join our community.</p>

            <p>Your account has been created successfully, but you'll need to verify your email address before you can start using all features.</p>

            <div style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <div class="warning">
              <strong>Next Steps:</strong>
              <ol>
                <li>Click the verification button above</li>
                <li>Complete your profile (optional)</li>
                <li>Start messaging with friends!</li>
              </ol>
            </div>

            <p>If you have any questions, feel free to contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>

            <p>Best regards,<br>The Messenger Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${data.user.email}. If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Messenger!

        Hello ${data.user.firstName || data.user.username},

        Welcome to Messenger! We're excited to have you join our community.

        Your account has been created successfully, but you'll need to verify your email address before you can start using all features.

        Please visit this link to verify your email: ${data.verificationUrl}

        Next Steps:
        1. Verify your email address
        2. Complete your profile (optional)
        3. Start messaging with friends!

        If you have any questions, feel free to contact our support team at ${data.supportEmail}.

        Best regards,
        The Messenger Team

        ---
        This email was sent to ${data.user.email}. If you didn't create an account, please ignore this email.
      `,
    }),

    emailVerification: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #5a67d8; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .expiry { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.user.firstName || data.user.username},</h2>
            <p>Thank you for registering with Messenger! To complete your registration and start using your account, please verify your email address.</p>

            <div style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <div class="expiry">
              <strong>Important:</strong> This verification link will expire in ${data.expiryHours} hours for security reasons.
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${data.verificationUrl}</p>

            <p>If you didn't create an account with us, please ignore this email.</p>

            <p>Best regards,<br>The Messenger Team</p>
          </div>
          <div class="footer">
            <p>If you have any questions, contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        Verify Your Email Address

        Hello ${data.user.firstName || data.user.username},

        Thank you for registering with Messenger! To complete your registration and start using your account, please verify your email address.

        Please visit this link to verify your email: ${data.verificationUrl}

        Important: This verification link will expire in ${data.expiryHours} hours for security reasons.

        If you didn't create an account with us, please ignore this email.

        Best regards,
        The Messenger Team

        ---
        If you have any questions, contact us at ${data.supportEmail}
      `,
    }),

    passwordReset: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #c53030; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .expiry { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.user.firstName || data.user.username},</h2>
            <p>We received a request to reset your password. If you made this request, click the button below to create a new password.</p>

            <div style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>

            <div class="expiry">
              <strong>Security Notice:</strong> This link will expire in ${data.expiryMinutes} minutes. For your security, please don't share this email with anyone.
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e53e3e;">${data.resetUrl}</p>

            <p><strong>If you didn't request a password reset,</strong> please ignore this email. Your password will remain unchanged.</p>

            <p>Best regards,<br>The Messenger Team</p>
          </div>
          <div class="footer">
            <p>If you have any questions, contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password

        Hello ${data.user.firstName || data.user.username},

        We received a request to reset your password. If you made this request, please visit this link to create a new password:

        ${data.resetUrl}

        Security Notice: This link will expire in ${data.expiryMinutes} minutes. For your security, please don't share this email with anyone.

        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

        Best regards,
        The Messenger Team

        ---
        If you have any questions, contact us at ${data.supportEmail}
      `,
    }),

    adminNotification: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New User Registration</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .user-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-size: 14px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>New User Registration</h1>
          </div>
          <div class="content">
            <h2>Administrator Notification</h2>
            <p>A new user has registered and requires approval.</p>

            <div class="user-info">
              <h3>User Details:</h3>
              <p><strong>Username:</strong> ${data.user.username}</p>
              <p><strong>Email:</strong> ${data.user.email}</p>
              <p><strong>Name:</strong> ${data.user.firstName || ''} ${data.user.lastName || ''}</p>
              <p><strong>Registered:</strong> ${new Date(data.user.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> <span style="color: #e53e3e;">Pending Approval</span></p>
            </div>

            <p>Please review this registration in the admin panel:</p>

            <div style="text-align: center;">
              <a href="${data.adminPanelUrl}" class="button">View Admin Panel</a>
              <a href="${data.reviewUrl}" class="button">Review User</a>
            </div>

            <p>This notification was sent because new user registrations require manual approval as per your security policy.</p>
          </div>
          <div class="footer">
            <p>Messenger Admin System</p>
          </div>
        </body>
        </html>
      `,
      text: `
        New User Registration - Administrator Notification

        A new user has registered and requires approval.

        User Details:
        - Username: ${data.user.username}
        - Email: ${data.user.email}
        - Name: ${data.user.firstName || ''} ${data.user.lastName || ''}
        - Registered: ${new Date(data.user.createdAt).toLocaleString()}
        - Status: Pending Approval

        Please review this registration in the admin panel:
        Admin Panel: ${data.adminPanelUrl}
        Review User: ${data.reviewUrl}

        This notification was sent because new user registrations require manual approval as per your security policy.

        ---
        Messenger Admin System
      `,
    }),

    userApproval: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #059669; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #d1fae5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Account Approved!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.user.firstName || data.user.username},</h2>
            <p>Great news! Your account has been approved and you now have full access to Messenger.</p>

            <div class="highlight">
              <strong>Welcome to our community!</strong> You can now:
              <ul>
                <li>Send and receive messages</li>
                <li>Join video calls</li>
                <li>Share files and media</li>
                <li>Connect with other users</li>
              </ul>
            </div>

            ${
              data.adminNotes
                ? `
            <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Admin Notes:</strong>
              <p>${data.adminNotes}</p>
            </div>
            `
                : ''
            }

            <div style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Start Using Messenger</a>
            </div>

            <p>If you have any questions, feel free to contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>

            <p>Welcome aboard!<br>The Messenger Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${data.user.email}. If you didn't register for an account, please contact support.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Approved!

        Hello ${data.user.firstName || data.user.username},

        Great news! Your account has been approved and you now have full access to Messenger.

        Welcome to our community! You can now:
        - Send and receive messages
        - Join video calls
        - Share files and media
        - Connect with other users

        ${data.adminNotes ? `Admin Notes: ${data.adminNotes}` : ''}

        Visit this link to start using Messenger: ${data.loginUrl}

        If you have any questions, feel free to contact our support team at ${data.supportEmail}.

        Welcome aboard!
        The Messenger Team

        ---
        This email was sent to ${data.user.email}. If you didn't register for an account, please contact support.
      `,
    }),

    userRejection: data => ({
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Registration Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .reason-box { background: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .support-info { background: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Account Registration Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.user.firstName || data.user.username},</h2>
            <p>Thank you for your interest in Messenger. After reviewing your registration, we are unable to approve your account at this time.</p>

            <div class="reason-box">
              <strong>Reason:</strong>
              <p>${data.reason}</p>
            </div>

            ${
              data.adminNotes
                ? `
            <div style="background: #f3f4f6; border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Additional Information:</strong>
              <p>${data.adminNotes}</p>
            </div>
            `
                : ''
            }

            <div class="support-info">
              <strong>What can you do?</strong>
              <ul>
                <li>Contact our support team if you believe this decision was made in error</li>
                <li>Review our community guidelines and try registering again</li>
                <li>Ensure all information provided was accurate</li>
              </ul>
            </div>

            <p>If you have questions about this decision or would like to appeal, please contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>

            <p>We appreciate your understanding.<br>The Messenger Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${data.user.email} regarding your registration attempt.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Registration Update

        Hello ${data.user.firstName || data.user.username},

        Thank you for your interest in Messenger. After reviewing your registration, we are unable to approve your account at this time.

        Reason: ${data.reason}

        ${data.adminNotes ? `Additional Information: ${data.adminNotes}` : ''}

        What can you do?
        - Contact our support team if you believe this decision was made in error
        - Review our community guidelines and try registering again
        - Ensure all information provided was accurate

        If you have questions about this decision or would like to appeal, please contact our support team at ${data.supportEmail}.

        We appreciate your understanding.
        The Messenger Team

        ---
        This email was sent to ${data.user.email} regarding your registration attempt.
      `,
    }),
  };
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;

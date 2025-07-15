import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailBackupService {
  private transporter;
  private readonly logger = new Logger(MailBackupService.name);

  constructor() {
    // Configuration Mailgun (alternative si Gmail bloqué)
    const mailgunDomain = process.env.MAILGUN_DOMAIN || 'sandbox-xxx.mailgun.org';
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    
    this.logger.log(`📧 Mailgun configuration:`);
    this.logger.log(`   Domain: ${mailgunDomain}`);
    this.logger.log(`   API Key: ${mailgunApiKey ? '✅ Configured' : '❌ Missing'}`);

    // Configuration Mailgun SMTP
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${mailgunDomain}`,
        pass: mailgunApiKey,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    this.logger.log(`📧 [MAILGUN] Starting email send process:`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    
    try {
      const info = await this.transporter.sendMail({
        from: 'École <noreply@educareschool.me>',
        to,
        subject,
        html,
      });
      
      this.logger.log(`✅ [MAILGUN] Email sent successfully!`);
      this.logger.log(`   Message ID: ${info.messageId}`);
      
    } catch (error) {
      this.logger.error(`❌ [MAILGUN] Email send failed:`, error);
      throw error;
    }
  }
} 
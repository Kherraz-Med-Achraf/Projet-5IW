import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailSendGridService {
  private transporter;
  private readonly logger = new Logger(MailSendGridService.name);

  constructor() {
    // Configuration SendGrid (100% gratuit, pas de carte bancaire)
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    
    this.logger.log(`📧 SendGrid configuration:`);
    this.logger.log(`   API Key: ${sendgridApiKey ? '✅ Configured' : '❌ Missing'}`);

    if (sendgridApiKey) {
      // Configuration SendGrid SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey', // Toujours "apikey" pour SendGrid
          pass: sendgridApiKey,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      });
    } else {
      this.logger.error('❌ SendGrid API Key missing');
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    this.logger.log(`📧 [SENDGRID] Starting email send process:`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    
    try {
      const info = await this.transporter.sendMail({
        from: 'École <noreply@educareschool.me>',
        to,
        subject,
        html,
      });
      
      this.logger.log(`✅ [SENDGRID] Email sent successfully!`);
      this.logger.log(`   Message ID: ${info.messageId}`);
      
    } catch (error) {
      this.logger.error(`❌ [SENDGRID] Email send failed:`, error);
      throw error;
    }
  }
} 
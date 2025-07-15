import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Configuration SendGrid (100% gratuit, sans carte bancaire)
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    
          // Fallback Gmail si SendGrid non configuré
    const emailUser = process.env.EMAIL_USER;
    let emailPass: string | null = null;
    
    try {
      emailPass = readSecret('/run/secrets/email_pass', 'EMAIL_PASS');
    } catch (error) {
      this.logger.warn('⚠️ Gmail credentials not found, trying Mailgun...');
    }
    
    // Prioriser SendGrid si configuré
    if (sendgridApiKey) {
      this.logger.log(`📧 Using SENDGRID configuration:`);
      this.logger.log(`   API Key: ✅ Configured`);
      
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
      
    } else if (emailUser && emailPass) {
      this.logger.log(`📧 Using GMAIL configuration (fallback):`);
      this.logger.log(`   EMAIL_USER: ${emailUser}`);
      this.logger.log(`   EMAIL_PASS: ✅ Configured`);
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        tls: {
          rejectUnauthorized: false
        }
      });
      
          } else {
        this.logger.error('❌ No email configuration found (neither SendGrid nor Gmail)');
      }
  }

  async sendMail(to: string, subject: string, html: string) {
    const fromEmail = process.env.MAILGUN_DOMAIN 
      ? `École <noreply@${process.env.MAILGUN_DOMAIN}>`
      : process.env.EMAIL_USER;
      
    this.logger.log(`📧 Starting email send process:`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    this.logger.log(`   From: ${fromEmail}`);
    
    try {
      this.logger.log(`📧 Attempting to send email via transporter...`);
      
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });
      
      this.logger.log(`✅ Email sent successfully!`);
      this.logger.log(`   Message ID: ${info.messageId}`);
      this.logger.log(`   Response: ${info.response}`);
      
    } catch (error) {
      this.logger.error(`❌ Email send failed:`, error);
      this.logger.error(`   Error code: ${error.code}`);
      this.logger.error(`   Error message: ${error.message}`);
      this.logger.error(`   Error command: ${error.command}`);
      
      throw error;
    }
  }

  async sendChildCredentials(
    parentEmail: string,
    payload: { childName: string; login: string; password: string },
  ) {
    const { childName, login, password } = payload;
    const html = `
      <p>Bonjour,</p>
      <p>Voici les identifiants de connexion pour ${childName} :</p>
      <ul>
        <li>Identifiant : <strong>${login}@kids.local</strong></li>
        <li>Mot de passe : <strong>${password}</strong></li>
      </ul>
      <p>Ces informations peuvent être modifiées ultérieurement si besoin.</p>
    `;
    await this.sendMail(parentEmail, `Accès enfant – ${childName}`, html);
  }
}

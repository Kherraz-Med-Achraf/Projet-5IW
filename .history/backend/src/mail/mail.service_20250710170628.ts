import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);
  private sendgridApiKey: string | null = null;

  constructor() {
    // Configuration SendGrid UNIQUEMENT (100% gratuit, sans carte bancaire)
    // Lire la clé depuis le secret Docker comme les autres services
    try {
      this.sendgridApiKey = readSecret('/run/secrets/sendgrid_api_key', 'SENDGRID_API_KEY');
      
      this.logger.log(`📧 SENDGRID CONFIGURATION FOUND:`);
      this.logger.log(`   API Key: ✅ Configured`);
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey', // Toujours "apikey" pour SendGrid
          pass: this.sendgridApiKey,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      });
      
    } catch (error) {
      this.logger.error('❌ SENDGRID API KEY MISSING - EMAIL SERVICE DISABLED');
      this.logger.error('   Secret path: /run/secrets/sendgrid_api_key');
      this.logger.error('   Env var: SENDGRID_API_KEY');
      this.logger.error('   Gmail fallback DISABLED (ports bloqués en production)');
      
      // Pas de transporter = toutes les tentatives d'email échoueront
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    const fromEmail = this.sendgridApiKey 
      ? `École <noreply@educareschool.me>`
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

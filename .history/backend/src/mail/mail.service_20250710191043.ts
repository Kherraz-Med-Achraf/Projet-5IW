import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private sendgridConfigured = false;

  constructor() {
    // Configuration SendGrid API (HTTP, pas SMTP - ports bloqués sur DigitalOcean)
    try {
      this.logger.log(`🔍 SENDGRID API: Attempting to read secret...`);
      this.logger.log(`   Secret path: /run/secrets/sendgrid_api_key`);
      this.logger.log(`   Env var: SENDGRID_API_KEY`);
      
      // Lire directement depuis le fichier secret Docker
      const apiKey = readSecret('/run/secrets/sendgrid_api_key', 'SENDGRID_API_KEY');
      
      this.logger.log(`📧 SENDGRID API CONFIGURATION FOUND:`);
      this.logger.log(`   API Key: ✅ Configured (${apiKey ? apiKey.substring(0, 20) + '...' : 'null'})`);
      
      // Configurer SendGrid API
      sgMail.setApiKey(apiKey);
      this.sendgridConfigured = true;
      
      this.logger.log(`✅ SENDGRID API: Configuration successful`);
      
    } catch (error) {
      this.logger.error('❌ SENDGRID API KEY MISSING - EMAIL SERVICE DISABLED');
      this.logger.error('   Secret path: /run/secrets/sendgrid_api_key');
      this.logger.error('   Env var: SENDGRID_API_KEY');
      this.logger.error('   Note: Using HTTP API instead of SMTP (ports blocked on DigitalOcean)');
      this.logger.error('   Detailed error:', error.message);
      
      this.sendgridConfigured = false;
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.sendgridConfigured) {
      const errorMsg = 'Email service not configured - SendGrid API key missing';
      this.logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    const fromEmail = `École <noreply@educareschool.me>`;
      
    this.logger.log(`📧 SENDGRID API: Starting email send process:`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    this.logger.log(`   From: ${fromEmail}`);
    
    try {
      this.logger.log(`📧 SENDGRID API: Attempting to send email...`);
      
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
      };
      
      const response = await sgMail.send(msg);
      
      this.logger.log(`✅ SENDGRID API: Email sent successfully!`);
      this.logger.log(`   Status code: ${response[0].statusCode}`);
      this.logger.log(`   Message ID: ${response[0].headers['x-message-id']}`);
      
    } catch (error) {
      this.logger.error(`❌ SENDGRID API: Email send failed:`, error);
      this.logger.error(`   Error code: ${error.code}`);
      this.logger.error(`   Error message: ${error.message}`);
      this.logger.error(`   Error response: ${error.response?.body || 'No response body'}`);
      
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

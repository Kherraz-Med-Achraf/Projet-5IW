import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readSecret } from '../utils/secret';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Diagnostic email configuration
    const emailUser = process.env.EMAIL_USER;
    let emailPass: string | null = null;
    
    // Lire le mot de passe depuis le secret Docker comme les autres services
    try {
      emailPass = readSecret('/run/secrets/email_pass', 'EMAIL_PASS');
    } catch (error) {
      this.logger.error('❌ Unable to read email password from secret or env var');
      emailPass = null;
    }
    
    this.logger.log(`📧 Email configuration check:`);
    this.logger.log(`   EMAIL_USER: ${emailUser ? '✅ Configured' : '❌ Missing'}`);
    this.logger.log(`   EMAIL_PASS: ${emailPass ? '✅ Configured' : '❌ Missing'}`);
    
    if (!emailUser || !emailPass) {
      this.logger.error('❌ Email configuration incomplete - emails will fail');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass || undefined,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    this.logger.log(`📧 Starting email send process:`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    this.logger.log(`   From: ${process.env.EMAIL_USER}`);
    
    try {
      this.logger.log(`📧 Attempting to send email via transporter...`);
      
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
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

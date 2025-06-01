import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
      });
      this.logger.log(`Email envoyé: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Erreur lors de l’envoi de l’email', error);
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

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Exemple avec Gmail (100% gratuit, attention aux restrictions et à l'utilisation d’un App Password)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // ton email Gmail
        pass: process.env.EMAIL_PASS, // ton mot de passe ou app password
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
}

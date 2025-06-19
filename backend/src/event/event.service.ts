import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import Stripe from 'stripe';
import { MailService } from '../mail/mail.service';
import * as fs from 'fs';

// Determine Stripe secret: prefer environment variable for local dev, fall back to Docker secret file in production.
const stripeSecret = process.env.STRIPE_SECRET || (() => {
  try {
    return fs.readFileSync('/run/secrets/stripe_secret', 'utf8').trim();
  } catch {
    return '';
  }
})();

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16',
});

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  /** Liste des événements à venir */
  async listUpcoming() {
    const events = await this.prisma.event.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });

    // calc capacity left
    const withCap = await Promise.all(events.map(async ev => {
      if (ev.capacity) {
        const count = await this.prisma.eventRegistrationChild.count({ where: { registration: { eventId: ev.id } } });
        return { ...ev, capacityLeft: Math.max(ev.capacity - count, 0) } as any;
      }
      return { ...ev, capacityLeft: null } as any;
    }));
    return withCap;
  }

  /** Liste inscrits pour un event */
  async listRegistrations(eventId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: { parentProfile: { include: { user: true } }, children: { include: { child: true } } },
    });
  }

  /** Liste des événements auxquels le parent est inscrit */
  async listMyEvents(userId: string) {
    const parent = await this.prisma.parentProfile.findUnique({ where: { userId } });
    if (!parent) return [];

    const regs = await this.prisma.eventRegistration.findMany({
      where: { parentProfileId: parent.id },
      include: {
        event: true,
        children: { include: { child: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return regs.map(r => ({
      registrationId: r.id,
      eventId: r.eventId,
      eventTitle: r.event.title,
      eventDate: r.event.date,
      children: r.children.map(c => `${c.child.firstName} ${c.child.lastName}`),
      paymentStatus: r.paymentStatus,
    }));
  }

  /** Création d'un événement (samedi) */
  async create(dto: CreateEventDto, creatorUserId: string, imageUrl?: string) {
    const date = new Date(dto.date);
    if (date.getDay() !== 6) {
      throw new BadRequestException('La date doit être un samedi');
    }
    const start = new Date(`${dto.date}T${dto.startTime}:00`);
    const end   = new Date(`${dto.date}T${dto.endTime}:00`);
    if (end <= start) throw new BadRequestException('Heure de fin invalide');

    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        date,
        startTime: start,
        endTime: end,
        priceCt: Math.round(dto.price * 100),
        capacity: dto.capacity ?? null,
        imageUrl: imageUrl ?? null,
        createdByUserId: creatorUserId,
      },
    });
  }

  /** Mise à jour (si non verrouillé) */
  async update(id: string, dto: UpdateEventDto, userRole: Role, imageUrl?: string) {
    const ev = await this.prisma.event.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException('Événement introuvable');
    if (ev.isLocked) throw new ForbiddenException('Événement verrouillé après inscriptions');

    if (userRole !== Role.DIRECTOR && userRole !== Role.SERVICE_MANAGER) {
      throw new ForbiddenException();
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.startTime && { startTime: new Date(`${dto.date ?? ev.date.toISOString().substring(0,10)}T${dto.startTime}:00`) }),
        ...(dto.endTime && { endTime: new Date(`${dto.date ?? ev.date.toISOString().substring(0,10)}T${dto.endTime}:00`) }),
        ...(typeof dto.price === 'number' && { priceCt: Math.round(dto.price * 100) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });
  }

  /** Suppression */
  async remove(id: string) {
    const regs = await this.prisma.eventRegistration.findMany({ where: { eventId: id } });

    // rembourse Stripe si besoin
    for (const r of regs) {
      if (r.paymentMethod === PaymentMethod.STRIPE && r.paymentStatus === PaymentStatus.PAID && r.stripeSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(r.stripeSessionId);
          if (typeof session.payment_intent === 'string') {
            await stripe.refunds.create({ payment_intent: session.payment_intent });
          }
        } catch (e) {
          console.error('[Event remove] refund error', e);
        }
      }
    }

    // supprime en cascade enfants -> regs -> event
    await this.prisma.$transaction(async tx => {
      await tx.eventRegistrationChild.deleteMany({ where: { registration: { eventId: id } } });
      await tx.eventRegistration.deleteMany({ where: { eventId: id } });
      await tx.event.delete({ where: { id } });
    });
  }

  /** Inscription d'un parent */
  async register(eventId: string, userId: string, dto: RegisterEventDto, origin: string) {
    // récupère parentProfileId
    const parentProfile = await this.prisma.parentProfile.findUnique({ where: { userId } });
    if (!parentProfile) {
      throw new NotFoundException('Profil parent introuvable');
    }
    const parentProfileId = parentProfile.id;

    const ev = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!ev) throw new NotFoundException('Événement introuvable');

    if (ev.date < new Date()) {
      throw new BadRequestException('Événement passé');
    }

    // capacité
    if (ev.capacity) {
      const countChildren = await this.prisma.eventRegistrationChild.count({
        where: { registration: { eventId } },
      });
      if (countChildren + dto.childIds.length > ev.capacity) {
        throw new BadRequestException('Capacité maximale atteinte');
      }
    }

    // Vérifie doublon même parent
    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_parentProfileId: { eventId, parentProfileId } },
    });
    if (existing) throw new BadRequestException('Vous êtes déjà inscrit');

    const amountCt = ev.priceCt * dto.childIds.length;
    const payMethod = ev.priceCt === 0 ? PaymentMethod.FREE : dto.paymentMethod;
    const payStatus: PaymentStatus = ev.priceCt === 0 ? PaymentStatus.FREE : (payMethod === 'CHEQUE' ? PaymentStatus.PENDING : PaymentStatus.PENDING);

    // Transaction : création registration + enfants
    const result = await this.prisma.$transaction(async tx => {
      const reg = await tx.eventRegistration.create({
        data: {
          eventId,
          parentProfileId,
          paymentMethod: payMethod as any,
          paymentStatus: payStatus as any,
          amountCt,
        },
      });

      await tx.eventRegistrationChild.createMany({
        data: dto.childIds.map(id => ({ registrationId: reg.id, childId: id })),
      });

      // lock event
      await tx.event.update({ where: { id: eventId }, data: { isLocked: true } });

      return reg;
    });

    // email immédiat (gratuit ou chèque)
    if (payMethod !== PaymentMethod.STRIPE) {
      await this._sendRegistrationMail(result.id);
      return { registrationId: result.id, stripeUrl: null };
    }

    // Stripe checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: ev.title },
            unit_amount: ev.priceCt,
          },
          quantity: dto.childIds.length,
        },
      ],
      success_url: `${origin}/events/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/cancel`,
      metadata: { registrationId: result.id },
    });

    // enregistre session id
    await this.prisma.eventRegistration.update({ where: { id: result.id }, data: { stripeSessionId: session.id } });

    return { registrationId: result.id, stripeUrl: session.url };
  }

  /** Confirmation Stripe */
  async confirmStripe(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Paiement non validé');
    }
    const reg = await this.prisma.eventRegistration.findFirst({ where: { stripeSessionId: sessionId } });
    if (!reg) throw new NotFoundException('Inscription inconnue');
    if (reg.paymentStatus !== PaymentStatus.PAID) {
      await this.prisma.eventRegistration.update({ where: { id: reg.id }, data: { paymentStatus: PaymentStatus.PAID } });
      await this._sendRegistrationMail(reg.id);
    }

    const kids = await this.prisma.eventRegistrationChild.findMany({ where: { registrationId: reg.id }, include: { child: true } });
    const event = await this.prisma.event.findUnique({ where: { id: reg.eventId } });
    return {
      eventTitle: event?.title || '',
      children: kids.map(k => `${k.child.firstName} ${k.child.lastName}`),
    };
  }

  async updatePaymentStatus(registrationId: string, status: PaymentStatus) {
    const reg = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Inscription introuvable');
    if (reg.paymentMethod !== PaymentMethod.CHEQUE) {
      throw new BadRequestException('Seules les inscriptions par chèque peuvent être modifiées manuellement');
    }
    return this.prisma.eventRegistration.update({ where: { id: registrationId }, data: { paymentStatus: status } });
  }

  /** Annulation d'une inscription par le parent */
  async cancelRegistration(userId: string, registrationId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId }, include: { event: true, parentProfile: true } });
    if (!reg) throw new NotFoundException('Inscription introuvable');

    // vérifie propriétaire
    if (reg.parentProfile.userId !== userId) throw new ForbiddenException('Accès refusé');

    // remboursement si Stripe payé
    if (reg.paymentMethod === PaymentMethod.STRIPE && reg.paymentStatus === PaymentStatus.PAID) {
      if (!reg.stripeSessionId) {
        throw new BadRequestException('Session Stripe manquante');
      }
      const session = await stripe.checkout.sessions.retrieve(reg.stripeSessionId);
      if (typeof session.payment_intent === 'string') {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
      }
    }

    // suppression des enfants puis de la registration
    await this.prisma.$transaction(async tx => {
      await tx.eventRegistrationChild.deleteMany({ where: { registrationId } });
      await tx.eventRegistration.delete({ where: { id: registrationId } });
    });

    return { canceled: true };
  }

  private async _sendRegistrationMail(regId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: regId },
      include: {
        parentProfile: { include: { user: true } },
        event: true,
        children: { include: { child: true } },
      },
    });
    if (!reg) return;
    const recipient = reg.parentProfile.user.email;

    const childrenList = reg.children
      .map(ec => `${ec.child.firstName} ${ec.child.lastName}`)
      .join(', ');
    const amount = (reg.amountCt / 100).toFixed(2);

    let payInfo = '';
    if (reg.paymentMethod === PaymentMethod.CHEQUE) {
      payInfo = `Mode de paiement : chèque (à remettre sur place). Montant dû : ${amount} €.`;
    } else if (reg.paymentMethod === PaymentMethod.STRIPE) {
      payInfo = `Paiement en ligne confirmé. Montant réglé : ${amount} €.`;
    } else {
      payInfo = 'Événement gratuit.';
    }

    await this.mail.sendMail(
      recipient,
      `Inscription à l'événement : ${reg.event.title}`,
      `<p>Bonjour,</p>
       <p>Votre inscription à l'événement <strong>${reg.event.title}</strong> du ${reg.event.date.toLocaleDateString('fr-FR')} de ${reg.event.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à ${reg.event.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} a bien été prise en compte.</p>
       <p>Enfants inscrits : ${childrenList}</p>
       <p>${payInfo}</p>`
    );
  }
} 
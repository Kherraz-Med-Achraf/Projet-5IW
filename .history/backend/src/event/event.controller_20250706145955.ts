import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Role } from '@prisma/client';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';

@Controller('events')
export class EventController {
  constructor(private readonly svc: EventService) {}

  /** 1. Liste des événements futurs */
  @Get()
  @Roles(
    Role.PARENT,
    Role.DIRECTOR,
    Role.SERVICE_MANAGER,
    Role.SECRETARY,
    Role.STAFF,
  )
  list() {
    return this.svc.listUpcoming();
  }

  /** 2. Créer un événement */
  @Post()
  @UseGuards(CsrfGuard)
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateEventDto,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: any,
  ) {
    const imageUrl = image ? await this._saveImage(image) : undefined;
    return this.svc.create(dto, req.user.id, imageUrl);
  }

  /** 3. Mise à jour */
  @Patch(':id')
  @UseGuards(CsrfGuard)
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: any,
  ) {
    const imageUrl = image ? await this._saveImage(image) : undefined;
    return this.svc.update(id, dto, req.user.role, imageUrl);
  }

  /** 4. Delete */
  @Delete(':id')
  @UseGuards(CsrfGuard)
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  /** 5. Liste inscriptions */
  @Get(':id/registrations')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.SECRETARY)
  regs(@Param('id') id: string) {
    return this.svc.listRegistrations(id);
  }

  /** 6. Inscription parent */
  @Post(':id/register')
  @UseGuards(CsrfGuard)
  @Roles(Role.PARENT)
  async register(
    @Param('id') id: string,
    @Body() dto: RegisterEventDto,
    @Req() req: any,
  ) {
    // Utilise uniquement l'origin approuvée côté configuration afin d'éviter les redirections ouvertes
    const origin = process.env.FRONT_URL || 'http://localhost:5173';
    return this.svc.register(id, req.user.id, dto, origin);
  }

  /** 7. Confirmation Stripe (redirect) */
  @Get('confirm/:sessionId')
  @Roles(Role.PARENT, Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR)
  confirm(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.svc.confirmStripe(sessionId, req.user.id);
  }

  /** 6bis. Mes inscriptions (parent) */
  @Get('mine')
  @Roles(Role.PARENT)
  myEvents(@Req() req: any) {
    return this.svc.listMyEvents(req.user.id);
  }

  /** 13. Mise à jour manuel du statut paiement (chèque reçu) */
  @Patch('registrations/:id/payment')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.SECRETARY)
  updatePayment(@Param('id') id: string) {
    return this.svc.updatePaymentStatus(id, 'PAID' as any);
  }

  /** 14. Annulation d'inscription par le parent */
  @Delete('registrations/:id')
  @Roles(Role.PARENT)
  cancelMyReg(@Param('id') id: string, @Req() req: any) {
    return this.svc.cancelRegistration(req.user.id, id);
  }

  /** 15. Annulation d'inscription par l'admin (chèque non reçu) */
  @Delete('registrations/:id/admin')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.SECRETARY)
  adminCancelReg(@Param('id') id: string) {
    return this.svc.adminCancelRegistration(id);
  }

  private async _saveImage(file: Express.Multer.File): Promise<string> {
    const path = require('path');
    const fs = require('fs/promises');
    const dir = require('path').join(process.cwd(), 'uploads', 'events');
    await fs.mkdir(dir, { recursive: true });
    // Validation MIME robuste via file-type : accepte uniquement JPEG / PNG
    const detected = await fileTypeFromBuffer(file.buffer);
    if (
      !detected ||
      (detected.mime !== 'image/jpeg' && detected.mime !== 'image/png')
    ) {
      throw new BadRequestException("Format d'image non supporté");
    }
    const ext = detected.ext;
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const full = path.join(dir, filename);
    await fs.writeFile(full, file.buffer);
    return `/uploads/events/${filename}`; // chemin statique
  }
}

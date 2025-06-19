import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('events')
export class EventController {
  constructor(private readonly svc: EventService) {}

  /** 1. Liste des événements futurs */
  @Get()
  @Roles(Role.PARENT, Role.DIRECTOR, Role.SERVICE_MANAGER, Role.SECRETARY, Role.STAFF)
  list() {
    return this.svc.listUpcoming();
  }

  /** 2. Créer un événement */
  @Post()
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
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
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
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
  @Roles(Role.PARENT)
  async register(
    @Param('id') id: string,
    @Body() dto: RegisterEventDto,
    @Req() req: any,
  ) {
    const origin = req.headers.origin || process.env.FRONT_URL || 'http://localhost:5173';
    // trouve parentProfileId
    const parent = await this.svc.prisma.parentProfile.findUnique({ where: { userId: req.user.id } });
    if (!parent) throw new BadRequestException('Profil parent introuvable');
    return this.svc.register(id, parent.id, dto, origin);
  }

  /** 7. Confirmation Stripe (redirect) */
  @Get('confirm/:sessionId')
  @Roles(Role.PARENT, Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR)
  confirm(@Param('sessionId') sessionId: string) {
    return this.svc.confirmStripe(sessionId);
  }

  private async _saveImage(file: Express.Multer.File): Promise<string> {
    const path = require('path');
    const fs = require('fs/promises');
    const dir = require('path').join(process.cwd(), 'uploads', 'events');
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      throw new BadRequestException('Format d\'image non supporté');
    }
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
    const full = path.join(dir, filename);
    await fs.writeFile(full, file.buffer);
    return `/uploads/events/${filename}`; // chemin statique
  }
} 
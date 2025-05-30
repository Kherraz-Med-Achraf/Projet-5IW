import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';

@Injectable()
export class EmergencyContactService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForParent(parentProfileId: number) {
    return this.prisma.emergencyContact.findMany({
      where: { parentProfileId },
    });
  }

  async findOneForParent(parentProfileId: number, id: number) {
    const ec = await this.prisma.emergencyContact.findFirst({
      where: { id, parentProfileId },
    });
    if (!ec) throw new NotFoundException(`Contact ${id} introuvable`);
    return ec;
  }

  async createForParent(parentProfileId: number, dto: CreateEmergencyContactDto) {
    return this.prisma.emergencyContact.create({
      data: { parentProfileId, ...dto },
    });
  }

  async updateForParent(parentProfileId: number, id: number, dto: UpdateEmergencyContactDto) {
    const result = await this.prisma.emergencyContact.updateMany({
      where: { id, parentProfileId },
      data: { ...dto },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Contact ${id} introuvable`);
    }
    return this.findOneForParent(parentProfileId, id);
  }

  async removeForParent(parentProfileId: number, id: number) {
    const result = await this.prisma.emergencyContact.deleteMany({
      where: { id, parentProfileId },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Contact ${id} introuvable`);
    }
    return { id };
  }
}

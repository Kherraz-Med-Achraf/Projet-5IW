import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceCron {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleCron() {
    await this.createTodayPresenceSheet();
    await this.createMissingPresenceSheets();
  }

  private async createTodayPresenceSheet() {
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();
    
    if (dayOfWeek === 0) return;

    const existingSheet = await this.prisma.presenceSheet.findFirst({
      where: {
        date: {
          gte: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
          lt: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1),
        },
      },
    });

    if (existingSheet) {
      return;
    }

    const children = await this.prisma.child.findMany({
      select: { id: true, firstName: true, lastName: true },
    });

    if (children.length > 0) {
      await this.prisma.presenceSheet.create({
        data: {
          date: todayDate,
          records: {
            create: children.map((child) => ({
              childId: child.id,
              present: true,
            })),
          },
        },
      });
    }
  }

  private async createMissingPresenceSheets() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14);

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(current);
      const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      const exists = await this.prisma.presenceSheet.findFirst({
        where: {
          date: {
            gte: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
            lt: new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1),
          },
        },
        include: { records: true },
      });

      if (!exists) {
        const children = await this.prisma.child.findMany({
          select: { id: true, firstName: true, lastName: true },
        });

        if (children.length > 0) {
          await this.prisma.presenceSheet.create({
            data: {
              date: new Date(current),
              records: {
                create: children.map((child) => ({
                  childId: child.id,
                  present: true,
                })),
              },
            },
          });
        }
      } else if (exists.records.length === 0) {
        const children = await this.prisma.child.findMany({
          select: { id: true, firstName: true, lastName: true },
        });

        if (children.length > 0) {
          await this.prisma.presenceSheet.update({
            where: { id: exists.id },
            data: {
              records: {
                create: children.map((child) => ({
                  childId: child.id,
                  present: true,
                })),
              },
            },
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }
  }
}

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreatePresenceSheetDto,
  ValidateSheetDto,
  JustifyAbsenceDto,
  JustificationType,
} from './presence.dto';

describe('Presence DTOs', () => {
  describe('CreatePresenceSheetDto', () => {
    it('should validate correct date format', async () => {
      const dto = plainToClass(CreatePresenceSheetDto, {
        date: '2025-01-15',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = plainToClass(CreatePresenceSheetDto, {
        date: '15-01-2025',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });

    it('should reject missing date', async () => {
      const dto = plainToClass(CreatePresenceSheetDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });

    it('should reject null date', async () => {
      const dto = plainToClass(CreatePresenceSheetDto, {
        date: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });

    it('should reject empty string date', async () => {
      const dto = plainToClass(CreatePresenceSheetDto, {
        date: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });
  });

  describe('ValidateSheetDto', () => {
    it('should validate array of child IDs', async () => {
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: [1, 2, 3],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty array', async () => {
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('presentChildIds');
    });

    it('should reject duplicate child IDs', async () => {
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: [1, 2, 2, 3],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('presentChildIds');
    });

    it('should reject non-array values', async () => {
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: 'not-an-array',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('presentChildIds');
    });

    it('should reject missing presentChildIds', async () => {
      const dto = plainToClass(ValidateSheetDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('presentChildIds');
    });

    it('should handle single child ID', async () => {
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: [42],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle large arrays', async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i + 1);
      const dto = plainToClass(ValidateSheetDto, {
        presentChildIds: largeArray,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('JustifyAbsenceDto', () => {
    describe('ABSENCE type validation', () => {
      it('should validate ABSENCE with motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2025-01-15',
          motif: 'Certificat médical',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should reject ABSENCE with empty motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2025-01-15',
          motif: '',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('motif');
      });
    });

    describe('LATENESS type validation', () => {
      it('should validate LATENESS without motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.LATENESS,
          justificationDate: '2025-01-15',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate LATENESS with optional motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.LATENESS,
          justificationDate: '2025-01-15',
          motif: 'Transport en retard',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('Common validation', () => {
      it('should reject invalid justification type', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: 'INVALID_TYPE',
          justificationDate: '2025-01-15',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('type');
      });

      it('should reject invalid date format', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '15/01/2025',
          motif: 'Test',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('justificationDate');
      });

      it('should reject missing date', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          motif: 'Test',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('justificationDate');
      });

      it('should reject missing type', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          justificationDate: '2025-01-15',
          motif: 'Test',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('type');
      });
    });

    describe('Edge cases', () => {
      it('should reject future dates', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: futureDate.toISOString().split('T')[0],
          motif: 'Prévisionnel',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('justificationDate');
      });

      it('should reject too old past dates', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2020-01-01',
          motif: 'Historique',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('justificationDate');
      });

      it('should handle long motif text', async () => {
        const longMotif = 'A'.repeat(1000);
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2025-01-15',
          motif: longMotif,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle special characters in motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2025-01-15',
          motif: "Rendez-vous médical à l'hôpital (urgence) - 15h30",
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle unicode characters in motif', async () => {
        const dto = plainToClass(JustifyAbsenceDto, {
          type: JustificationType.ABSENCE,
          justificationDate: '2025-01-15',
          motif: 'Médecin spécialisé en pédiatrie 👨‍⚕️',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('JustificationType enum', () => {
    it('should have correct ABSENCE value', () => {
      expect(JustificationType.ABSENCE).toBe('ABSENCE');
    });

    it('should have correct LATENESS value', () => {
      expect(JustificationType.LATENESS).toBe('LATENESS');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(JustificationType);
      expect(values).toHaveLength(2);
      expect(values).toContain('ABSENCE');
      expect(values).toContain('LATENESS');
    });
  });
});

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SaveProgressDto } from '../../src/cours/cours.controller';

describe('Validation Integration', () => {
  describe('Integration: DTO Validation + Transformation', () => {
    it('should validate valid SaveProgressDto', async () => {
      const validData = {
        childId: 1,
        matiere: 'francais',
        currentStep: 'introduction',
        progressPercent: 50,
        data: { completed: true },
      };

      const dto = plainToInstance(SaveProgressDto, validData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.childId).toBe(1);
      expect(dto.matiere).toBe('francais');
      expect(dto.data).toEqual({ completed: true });
    });

    it('should reject invalid SaveProgressDto - missing required fields', async () => {
      const invalidData = {
        childId: 1,
        // missing matiere, currentStep, progressPercent
      };

      const dto = plainToInstance(SaveProgressDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      
      const errorProperties = errors.map(error => error.property);
      expect(errorProperties).toContain('matiere');
      expect(errorProperties).toContain('currentStep');
      expect(errorProperties).toContain('progressPercent');
    });

    it('should reject invalid SaveProgressDto - wrong types', async () => {
      const invalidData = {
        childId: 'not-a-number', // should be number
        matiere: 123, // should be string
        currentStep: null, // should be string
        progressPercent: 'fifty', // should be number
        data: 'not-an-object', // should be object
      };

      const dto = plainToInstance(SaveProgressDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      
      const errorProperties = errors.map(error => error.property);
      expect(errorProperties).toContain('childId');
      expect(errorProperties).toContain('matiere');
      expect(errorProperties).toContain('currentStep');
      expect(errorProperties).toContain('progressPercent');
    });

    it('should validate optional data field correctly', async () => {
      const validDataWithoutOptional = {
        childId: 1,
        matiere: 'math',
        currentStep: 'introduction',
        progressPercent: 0,
        // data is optional
      };

      const dto = plainToInstance(SaveProgressDto, validDataWithoutOptional);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.data).toBeUndefined();
    });

    it('should handle edge cases in validation', async () => {
      const edgeCaseData = {
        childId: 0, // edge case: zero
        matiere: '', // edge case: empty string
        currentStep: '   ', // edge case: whitespace
        progressPercent: -1, // edge case: negative
        data: {}, // edge case: empty object
      };

      const dto = plainToInstance(SaveProgressDto, edgeCaseData);
      const errors = await validate(dto);

      // Should have some validation errors for empty/invalid values
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Multiple DTO validation patterns', () => {
    it('should handle batch validation consistently', async () => {
      const testCases = [
        { childId: 1, matiere: 'francais', currentStep: 'intro', progressPercent: 25 },
        { childId: 2, matiere: 'math', currentStep: 'exercices', progressPercent: 75 },
        { childId: 3, matiere: 'communication', currentStep: 'conclusion', progressPercent: 100 },
      ];

      const validationResults = await Promise.all(
        testCases.map(async (testCase) => {
          const dto = plainToInstance(SaveProgressDto, testCase);
          const errors = await validate(dto);
          return { dto, errors };
        })
      );

      // All should be valid
      validationResults.forEach(({ errors }) => {
        expect(errors).toHaveLength(0);
      });

      // Check transformed data
      const dtos = validationResults.map(({ dto }) => dto);
      expect(dtos).toHaveLength(3);
      expect(dtos[0].matiere).toBe('francais');
      expect(dtos[1].progressPercent).toBe(75);
      expect(dtos[2].currentStep).toBe('conclusion');
    });
  });
}); 
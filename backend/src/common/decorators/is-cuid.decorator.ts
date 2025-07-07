import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validateur personnalisé pour les CUID générés par Prisma
 * Un CUID valide commence par 'c' et fait 25 caractères au total
 * Format: c[a-z0-9]{24}
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          
          // CUID format: c[a-z0-9]{24} (25 caractères au total)
          const cuidRegex = /^c[a-z0-9]{24}$/;
          return cuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} doit être un CUID valide`;
        },
      },
    });
  };
} 
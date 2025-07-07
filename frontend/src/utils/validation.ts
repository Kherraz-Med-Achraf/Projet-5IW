import { z } from 'zod'

// Schéma de validation pour le profil utilisateur
export const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/u, 'Le prénom ne peut contenir que des lettres, espaces, traits d\'union et apostrophes'),
  lastName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/u, 'Le nom ne peut contenir que des lettres, espaces, traits d\'union et apostrophes'),
  phone: z
    .string()
    .regex(/^[0-9\s\-\+\(\)]{10,}$/, 'Le téléphone doit être un numéro français valide')
    .optional()
    .or(z.literal(''))
})

// Type TypeScript dérivé du schéma
export type ProfileFormData = z.infer<typeof profileSchema>

// Fonction de validation
export function validateProfile(data: ProfileFormData) {
  try {
    profileSchema.parse(data)
    return { success: true, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        if (err.path) {
          errors[err.path[0] as string] = err.message
        }
      })
      return { success: false, errors }
    }
    return { success: false, errors: { general: 'Erreur de validation' } }
  }
}

// Validation en temps réel
export function validateField(field: keyof ProfileFormData, value: string) {
  try {
    const partialSchema = profileSchema.pick({ [field]: true })
    partialSchema.parse({ [field]: value })
    return { isValid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message }
    }
    return { isValid: false, error: 'Erreur de validation' }
  }
} 
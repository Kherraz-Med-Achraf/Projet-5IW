// src/ai/ai.service.ts
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class AiService {
  private readonly openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || require('fs').readFileSync('/run/secrets/openai_api_key', 'utf8').trim(),
    })
  }

  async improveMission(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              "Tu es un éducateur spécialisé. Améliore la formulation (une phrase concise) de la mission fournie.",
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 60,
      })

      // on renvoie simplement le premier choix, sans les sauts de ligne superflus
      return (completion.choices?.[0].message?.content || '').trim()
    } catch (error: any) {
      // Gestion spécifique des erreurs OpenAI
      if (error.status === 429) {
        if (error.code === 'insufficient_quota') {
          throw new ServiceUnavailableException(
            'Le service IA a atteint sa limite de quota. Veuillez réessayer plus tard ou contacter l\'administrateur.'
          )
        } else {
          throw new ServiceUnavailableException(
            'Trop de requêtes vers le service IA. Veuillez attendre quelques instants avant de réessayer.'
          )
        }
      } else if (error.status === 401) {
        throw new ServiceUnavailableException(
          'Erreur d\'authentification avec le service IA. Contactez l\'administrateur.'
        )
      } else if (error.status === 400) {
        throw new BadRequestException(
          'La demande n\'est pas valide. Vérifiez le contenu de votre mission.'
        )
      } else if (error.status >= 500) {
        throw new ServiceUnavailableException(
          'Le service IA est temporairement indisponible. Réessayez dans quelques instants.'
        )
      } else {
        // Erreur générique
        throw new ServiceUnavailableException(
          'Erreur lors de la communication avec le service IA. Veuillez réessayer plus tard.'
        )
      }
    }
  }
}

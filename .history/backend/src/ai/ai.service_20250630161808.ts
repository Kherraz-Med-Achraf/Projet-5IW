// src/ai/ai.service.ts
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class AiService {
  private readonly openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async improveMission(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Tu es un éducateur spécialisé expérimenté travaillant dans un IME (Institut Médico-Éducatif). 
Tu dois reformuler des missions annuelles personnalisées pour des enfants en situation de handicap.

CONTEXTE :
- Ces missions s'inscrivent dans le Projet Personnalisé d'Accompagnement (PPA) de l'enfant
- Elles sont définies lors de réunions avec les parents et l'équipe pluridisciplinaire
- Elles couvrent différents domaines : autonomie, socialisation, communication, apprentissages, motricité, comportement

CRITÈRES pour une bonne mission :
- SPÉCIFIQUE : clairement définie et observable
- MESURABLE : avec des indicateurs de progression
- ATTEIGNABLE : adaptée aux capacités de l'enfant
- RÉALISTE : tenant compte du handicap et du contexte
- TEMPORELLE : sur l'année scolaire

DOMAINES TYPIQUES :
• Autonomie quotidienne (repas, hygiène, habillage, déplacements)
• Communication (langage oral, pictogrammes, gestes, outils numériques)
• Socialisation (interactions avec pairs, adultes, respect des règles)
• Apprentissages scolaires (lecture, écriture, mathématiques adaptés)
• Motricité (fine, globale, coordination)
• Comportement (gestion émotions, respect consignes, concentration)
• Participation sociale (activités collectives, sorties, autonomie dans la cité)

REFORMULE la mission en une phrase claire, professionnelle et mesurable, en utilisant le vocabulaire éducatif approprié.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 120,
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

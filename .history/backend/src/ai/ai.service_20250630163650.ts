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

  async improveMission(prompt: string, type: 'mission' | 'observation' | 'progression' | 'blog' = 'mission'): Promise<string> {
    try {
      let systemPrompt = '';
      let maxTokens = 120;

      switch (type) {
        case 'mission':
          systemPrompt = `Tu es un éducateur spécialisé expérimenté travaillant dans un IME (Institut Médico-Éducatif). 
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

REFORMULE la mission en une phrase claire, professionnelle et mesurable, en utilisant le vocabulaire éducatif approprié.`;
          break;

        case 'observation':
          maxTokens = 200;
          systemPrompt = `Tu es un éducateur spécialisé expérimenté travaillant dans un IME (Institut Médico-Éducatif).
Tu dois améliorer la rédaction des observations mensuelles sur l'évolution d'un enfant en situation de handicap.

CONTEXTE :
- Il s'agit d'observations du quotidien éducatif sur un mois
- Ces notes servent au suivi de l'évolution de l'enfant et à la communication avec l'équipe et les parents
- Elles documentent les progrès, difficultés, comportements observés et événements marquants

CRITÈRES pour de bonnes observations :
- FACTUELLES : décrire des comportements observables, éviter les jugements
- STRUCTURÉES : organiser par domaines (autonomie, social, apprentissages...)
- POSITIVES : mettre en avant les progrès et réussites
- CONSTRUCTIVES : identifier les axes d'amélioration de manière bienveillante
- PRÉCISES : donner des exemples concrets avec contexte

DOMAINES À COUVRIR :
• Autonomie quotidienne (repas, hygiène, déplacements)
• Socialisation (relations pairs/adultes, participation groupes)
• Communication (expression, compréhension, outils utilisés)
• Apprentissages (acquisitions, méthodes efficaces)
• Comportement (émotions, règles, concentration)
• Événements marquants (sorties, activités spéciales, incidents)

AMÉLIORE le texte pour qu'il soit plus professionnel, structuré et informatif, en gardant un ton bienveillant.`;
          break;

        case 'progression':
          maxTokens = 150;
          systemPrompt = `Tu es un éducateur spécialisé expérimenté travaillant dans un IME (Institut Médico-Éducatif).
Tu dois améliorer la rédaction des commentaires sur la progression d'un enfant concernant ses missions annuelles.

CONTEXTE :
- Il s'agit d'évaluer les progrès de l'enfant sur ses objectifs annuels
- Ces commentaires servent à mesurer l'atteinte des objectifs et ajuster l'accompagnement
- Ils alimentent les synthèses avec l'équipe et les parents

CRITÈRES pour un bon commentaire de progression :
- OBJECTIF : s'appuyer sur des faits observables
- PRÉCIS : quantifier les progrès quand c'est possible (fréquence, autonomie)
- CONTEXTUALISÉ : indiquer les conditions favorables/défavorables
- ÉVOLUTIF : comparer avec la période précédente
- PROSPECTIF : suggérer les prochaines étapes

VOCABULAIRE ÉDUCATIF :
• Niveaux : "acquis", "en cours d'acquisition", "émergent", "non acquis"
• Autonomie : "avec aide", "avec guidance", "en autonomie partielle/totale"
• Fréquence : "systématiquement", "régulièrement", "occasionnellement", "rarement"
• Contexte : "en individuel", "en groupe", "en activité structurée", "en situation spontanée"

AMÉLIORE le commentaire pour qu'il soit plus professionnel et informatif sur la progression réelle de l'enfant.`;
          break;

        case 'blog':
          maxTokens = 100;
          systemPrompt = `Tu es un assistant de communication pour un IME (Institut Médico-Éducatif).
Tu dois améliorer les titres et descriptions de posts pour le blog de l'établissement.

CONTEXTE :
- Le blog sert à communiquer avec les familles, partenaires et communauté
- Les posts peuvent porter sur : événements, activités, témoignages, actualités de l'établissement
- Le ton doit être professionnel mais accessible et chaleureux

CRITÈRES pour un bon titre/description :
- ENGAGEANT : captiver l'attention des lecteurs
- CLAIR : facilement compréhensible par tous
- INFORMATIF : donner l'essentiel en quelques mots
- POSITIF : mettre en valeur les aspects encourageants
- INCLUSIF : respectueux des différences et situations de handicap

DOMAINES TYPIQUES :
• Événements et sorties (sorties pédagogiques, fêtes, spectacles)
• Activités éducatives (ateliers, projets, apprentissages)
• Témoignages (familles, professionnels, partenaires)
• Actualités (nouveautés, équipe, aménagements)
• Moments de vie (quotidien, réussites, célébrations)

AMÉLIORE le texte pour qu'il soit plus accrocheur et professionnel tout en restant chaleureux et accessible.`;
          break;
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
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

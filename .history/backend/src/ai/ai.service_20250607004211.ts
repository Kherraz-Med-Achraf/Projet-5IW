import { Injectable } from '@nestjs/common'
import { Configuration, OpenAIApi } from 'openai'

@Injectable()
export class AiService {
  private readonly openai: OpenAIApi

  constructor() {
    this.openai = new OpenAIApi(
      new Configuration({ apiKey: process.env.OPENAI_API_KEY }),
    )
  }

  /**
   * Retourne une proposition d’amélioration pour la mission passée en argument.
   */
  async improveMission(prompt: string): Promise<string> {
    const { data } = await this.openai.createChatCompletion({
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

    /* on renvoie simplement le premier choix, sans les sauts de ligne superflus */
    return (data.choices[0]?.message?.content || '').trim()
  }
}

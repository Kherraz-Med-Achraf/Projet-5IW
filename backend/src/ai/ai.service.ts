// src/ai/ai.service.ts
import { Injectable } from '@nestjs/common'
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
  }
}

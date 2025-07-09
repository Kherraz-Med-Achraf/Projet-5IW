export type ReactionType = 'LIKE' | 'HEART' | 'SMILE' | 'CLAP' | 'PARTY'

export interface ReactionCounts {
  LIKE: number
  HEART: number
  SMILE: number
  CLAP: number
  PARTY: number
}

export interface Author {
  id: string
  firstName: string
  lastName: string
}

export interface BlogPost {
  id: string
  title: string
  description: string
  mediaUrl?: string
  mediaType?: 'IMAGE' | 'VIDEO'
  createdAt: string
  updatedAt: string
  author: Author
  reactions: ReactionCounts
  userReaction?: ReactionType
}

export interface CreateBlogPostRequest {
  title: string
  description: string
  mediaUrl?: string
  mediaType?: 'IMAGE' | 'VIDEO'
}

export interface CreateReactionRequest {
  type: ReactionType
}

import { IsArray, ArrayNotEmpty, IsString, ArrayMinSize, ArrayMaxSize, Matches } from 'class-validator';

export class CreateChatDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @Matches(/^[A-Za-z0-9_-]{10,40}$/,{ each: true, message: 'Identifiant participant invalide' })
  participants: string[];
} 
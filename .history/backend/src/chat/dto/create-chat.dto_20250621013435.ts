import { IsArray, ArrayNotEmpty, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateChatDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  participants: string[];
} 
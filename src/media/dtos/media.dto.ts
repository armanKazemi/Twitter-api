import { IsEnum, IsString } from 'class-validator';
import { MediaPosition } from '../entities/media.entity';

export class MediaDto {
  @IsString()
  fileName: string;

  @IsString()
  path: string;

  @IsString()
  mimetype: string;

  @IsEnum(MediaPosition)
  mediaPosition: MediaPosition;
}

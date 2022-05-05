import { IsDateString } from 'class-validator';

export class LastSeenOfTimelineDto {
  @IsDateString()
  lastSeen: Date;
}

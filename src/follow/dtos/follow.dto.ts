import { IsInt } from 'class-validator';

export class FollowDto {
  @IsInt()
  targetUserId: number;
}

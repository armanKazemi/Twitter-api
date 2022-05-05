import { IsInt } from 'class-validator';

export class LikeDto {
  @IsInt()
  tweetId: number;
}

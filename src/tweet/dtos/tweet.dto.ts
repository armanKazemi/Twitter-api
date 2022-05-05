import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TweetType } from '../entities/tweet.entity';

export class TweetDto {
  @IsString()
  text: string;

  @IsEnum(TweetType)
  tweetType: TweetType;

  @IsOptional()
  @IsInt()
  referenceTweetId: number;
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LikeEntity } from './entities/like.entity';
import { Repository } from 'typeorm';
import { TweetEntity } from '../tweet/entities/tweet.entity';
import { UserEntity } from '../user/entities/user.entity';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(LikeEntity)
    private readonly likeRepository: Repository<LikeEntity>,
  ) {}

  async getLikeById(likeId: number): Promise<LikeEntity> {
    return;
  }

  async getTweetLikes(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<Array<UserEntity>> {
    return;
  }

  async getTweetLikesCount(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<number> {
    return 0;
  }

  async getUserLikes(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<Array<TweetEntity>> {
    return;
  }

  async getUserLikesCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    return 0;
  }

  async like(requestingUserId: number, tweetId: number): Promise<void> {
    return;
  }

  async unlike(requestingUserId: number, tweetId: number): Promise<void> {
    return;
  }
}

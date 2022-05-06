import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LikeEntity } from './entities/like.entity';
import { getConnection, Repository } from 'typeorm';
import { TweetEntity } from '../tweet/entities/tweet.entity';
import { Status as UserStatus, UserEntity } from '../user/entities/user.entity';
import { Status as FollowStatus } from '../follow/entities/follow.entity';
import { TweetService } from '../tweet/tweet.service';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(LikeEntity)
    private readonly likeRepository: Repository<LikeEntity>,
    private readonly tweetService: TweetService,
  ) {}

  async getLikeById(likeId: number): Promise<LikeEntity> {
    const like = await this.likeRepository
      .createQueryBuilder('likes')
      .where({ id: likeId })
      .getOne();
    if (!like) {
      throw new NotFoundException('Thee is no such like entity.');
    }
    return like;
  }

  async getTweetLikes(
    targetTweetId: number,
    page: number,
  ): Promise<Array<UserEntity>> {
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT users.id, username, name, bio, status FROM users
                LEFT JOIN likes ON
                    users.id = likes.user_id
                WHERE
                    likes.tweet_id = ${targetTweetId}
                ORDER BY 
                    likes.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  async getTweetLikesCount(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<number> {
    const acceptableTargetUser =
      await this.tweetService.requestingUserIsAcceptableForTargetUser(
        requestingUserId,
        targetTweetId,
      );
    if (!acceptableTargetUser) {
      throw new ForbiddenException('You are not allowed.');
    }
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
                LEFT JOIN likes ON
                    users.id = likes.user_id
                WHERE
                    likes.tweet_id = ${targetTweetId}
                `,
      );
    return count.length;
  }

  async getUserLikes(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Return tweets that user has liked
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT 
                    tweets.id, 
                    text, 
                    tweet_type, 
                    reference_tweet_id, 
                    tweets.user_id, 
                    tweets.created_at 
                FROM tweets
                LEFT JOIN likes ON
                    tweets.id = likes.tweet_id
                WHERE
                    likes.user_id = ${targetUserId} AND
                    (
                      likes.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.user_id
                            WHERE
                              users.id = ${requestingUserId}
                              OR
                              users.status = '${UserStatus.private}' AND
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status = '${FollowStatus.follower}'
                              OR
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.target_user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.target_user_id <> ${requestingUserId}
                              )
                        )
                      OR
                      likes.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.user_id <> ${requestingUserId}
                              )
                        )
                    )
                    AND
                    (
                      tweets.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.user_id
                            WHERE
                              users.id = ${requestingUserId}
                              OR
                              users.status = '${UserStatus.private}' AND
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status = '${FollowStatus.follower}'
                              OR
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.target_user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                or
                                follow.target_user_id <> ${requestingUserId}
                              )
                        )
                      OR
                      tweets.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.user_id <> ${requestingUserId}
                              )
                        )
                    )
                ORDER BY 
                    likes.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  async getUserLikesCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Return tweets that user has liked
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                LEFT JOIN likes ON
                    tweets.id = likes.tweet_id
                WHERE
                    likes.user_id = ${targetUserId} AND
                    (
                      likes.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.user_id
                            WHERE
                              users.id = ${requestingUserId}
                              OR
                              users.status = '${UserStatus.private}' AND
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status = '${FollowStatus.follower}'
                              OR
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.target_user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.target_user_id <> ${requestingUserId}
                              )
                        )
                      OR
                      likes.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              (
                                follow.user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.user_id <> ${requestingUserId}
                              )
                        )
                    )
                `,
      );
    return count.length;
  }

  async hasLiked(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<boolean> {
    const like = await this.likeRepository
      .createQueryBuilder('likes')
      .where({
        userId: requestingUserId,
        tweetId: targetTweetId,
      })
      .getOne();
    return !!like;
  }

  async like(requestingUserId: number, tweetId: number): Promise<void> {
    // Check request user can like the tweet or not
    const acceptableCurrentTweet =
      await this.tweetService.requestingUserIsAcceptableForTargetTweet(
        requestingUserId,
        tweetId,
      );
    if (!acceptableCurrentTweet) {
      throw new ForbiddenException('You are not allowed.');
    }
    const hasLiked = await this.hasLiked(requestingUserId, tweetId);
    if (hasLiked) {
      throw new BadRequestException('You have already liked this tweet.');
    }
    const like = new LikeEntity();
    like.tweetId = tweetId;
    like.userId = requestingUserId;
    await this.likeRepository.save(like);
  }

  async unlike(requestingUserId: number, tweetId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM likes
                WHERE
                    user_id = ${requestingUserId} AND
                    tweet_id = ${tweetId}`,
      );
  }
}

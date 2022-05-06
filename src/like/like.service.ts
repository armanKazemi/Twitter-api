import {
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

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(LikeEntity)
    private readonly likeRepository: Repository<LikeEntity>,
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
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
                WHERE 
                    tweets.id = ${targetTweetId} AND
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
                          follow.target_user_id = ${requestingUserId} AND
                          follow.status <> '${FollowStatus.block}'
                    )
                  OR
                  tweets.user_id IN (
                        SELECT users.id FROM users
                        LEFT JOIN follow ON
                          users.id = follow.target_user_id
                        WHERE
                          users.status = '${UserStatus.public}' AND
                          follow.user_id = ${requestingUserId} AND
                          follow.status <> '${FollowStatus.block}'
                    )
                )
               `,
      );
    if (acceptableTargetUser.at(0).count == 0) {
      throw new ForbiddenException('You are not allowed.');
    }
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM users
                LEFT JOIN likes ON
                    users.id = likes.user_id
                WHERE
                    likes.tweet_id = ${targetTweetId}
                ORDER BY 
                    likes.created_at DESC
                `,
      );
    return count.at(0).count;
  }

  async getUserLikes(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Check request user can see likes of target user or not
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                    (
                      users.id IN (
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
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                      OR
                      users.id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              follow.user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                    )
                `,
      );
    if (acceptableTargetUser.at(0).count == 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    // Return tweets that user has liked
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                LEFT JOIN likes ON
                    tweets.id = likes.tweet_id
                WHERE
                    likes.user_id = ${targetUserId}
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
    // Check request user can see likes of target user or not
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                    (
                      users.id IN (
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
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                      OR
                      users.id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              follow.user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                    )
                `,
      );
    if (acceptableTargetUser.at(0).count == 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    // Return tweets that user has liked
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                LEFT JOIN likes ON
                    tweets.id = likes.tweet_id
                WHERE
                    likes.user_id = ${targetUserId}
                `,
      );
    return count.at(0).count;
  }

  async hasLiked(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: {
        userId: requestingUserId,
        tweetId: targetTweetId,
      },
    });
    return !!like;
  }

  async like(requestingUserId: number, tweetId: number): Promise<void> {
    // Check request user can like the tweet or not
    const acceptableCurrentTweet = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE
                    tweets.id = ${tweetId} AND
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
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                      OR
                      tweets.user_id IN (
                            SELECT users.id FROM users
                            LEFT JOIN follow ON
                              users.id = follow.target_user_id
                            WHERE
                              users.status = '${UserStatus.public}' AND
                              follow.user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                        )
                    )
                `,
      );
    if (acceptableCurrentTweet.at(0).count == 0) {
      throw new ForbiddenException('You are not allowed.');
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
                    tweets_id = ${tweetId}`,
      );
  }
}

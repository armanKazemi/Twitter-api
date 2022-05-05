import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import {
  Status as UserStatus,
  Status,
  UserEntity,
} from './entities/user.entity';
import { Status as FollowStatus } from '../follow/entities/follow.entity';
import { UserDto } from './dtos/user.dto';
import { TweetType } from '../tweet/entities/tweet.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getUserById(userId: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('There is no such user.');
    }
    return user;
  }

  // TODO ASK
  async getUserByUsername(targetUserUsername: string): Promise<UserEntity> {
    const targetUser = await this.userRepository.findOne({
      where: { username: targetUserUsername },
    });
    if (!targetUser) {
      throw new NotFoundException('There is no such user.');
    }
    return targetUser;
  }

  async updateUser(userId: number, userDto: UserDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    // Check and change fields
    user.name = userDto.name || user.name;
    user.bio = userDto.bio || user.bio;
    user.location = userDto.location || user.location;
    user.link = userDto.link || user.link;
    user.birthDay = userDto.birthDay || user.birthDay;
    // Save user
    await this.userRepository.save(user);
  }

  async publicToPrivate(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    // Check user status be public
    if (user.status === Status.public) {
      // Change user status to private
      user.status = Status.private;
      // Save user
      await this.userRepository.save(user);
    }
  }

  async privateToPublic(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    // Check user status be private
    if (user.status === Status.private) {
      // Change user status to public
      user.status = Status.public;
      // Save user
      await this.userRepository.save(user);
      // Convert all pending users of user to follower
      await UserService.acceptAllPendingUsers(userId);
    }
  }

  async setLastSeenOfTimeline(userId: number, lastSeen: Date): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE users 
                SET 
                    last_seen_of_timeline = '${lastSeen}'
                WHERE
                    users.id = ${userId}`,
      );
  }

  async getTimelinePageBaseLastSeen(
    requestingUserId: number,
    lastSeen: Date,
  ): Promise<number> {
    const numOfTweetsBeforeLastSeenDate = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE
                  tweets.id IN (SELECT id FROM tweets
                    LEFT JOIN follow ON
                      tweets.user_id = follow.user_id
                    WHERE
                    // normal tweets of requesting user
                      tweets.user_id = ${requestingUserId}
                    OR
                    // normal tweets of followings of requesting user
                      follow.target_user_id = ${requestingUserId} AND
                      follow.status = '${FollowStatus.follower}' AND
                      (
                        tweets.status = '${TweetType.normal}'
                      OR
                      // comments/retweets/quotes of followings of requesting user that owner of reference tweet is requesting user / private account that is following of requesting user / public account that did not block requesting account and reverse
                        tweets.status <> '${TweetType.normal}' AND
                        tweets.reference_tweet_id IN (SELECT id FROM tweets
                            LEFT JOIN users ON
                                tweets.user_id = users.id
                            LEFT JOIN follow ON
                                users.id = follow.user_id
                            WHERE
                                tweets.user_id = ${requestingUserId}
                            OR
                                users.status = '${UserStatus.private}' AND
                                follow.status = '${FollowStatus.follower}' AND
                                follow.target_user_id = ${requestingUserId}
                            OR
                                users.status = '${UserStatus.public}' AND
                                follow.status <> '${FollowStatus.block}' AND
                                (
                                    follow.target_user_id = ${requestingUserId}
                                OR
                                    follow.user_id = ${requestingUserId}
                                )
                        )
                      )
                    )
                OR
                // tweets that liked by requesting user or followings of requesting user that have good situation
                  tweets.id IN (SELECT tweet_id FROM likes
                            LEFT JOIN users ON
                                likes.user_id = users.id
                            LEFT JOIN follow ON
                                users.id = follow.user_id
                            WHERE
                                likes.user_id = ${requestingUserId}
                            OR
                                users.status = '${UserStatus.private}' AND
                                follow.status = '${FollowStatus.follower}' AND
                                follow.target_user_id = ${requestingUserId}
                            OR
                                users.status = '${UserStatus.public}' AND
                                follow.status <> '${FollowStatus.block}' AND
                                (
                                    follow.target_user_id = ${requestingUserId}
                                OR
                                    follow.user_id = ${requestingUserId}
                                )
                        )
                  tweets.created_at < '${lastSeen}'
                ORDER BY 
                    tweets.created_at DESC
                `,
      );
    return Math.floor(numOfTweetsBeforeLastSeenDate / 10);
  }

  private static async acceptAllPendingUsers(userId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE follow SET status = '${FollowStatus.follower}' WHERE user_id = ${userId} AND status = '${FollowStatus.pending}'`,
      );
  }
}

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
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE users
                SET
                    status = '${Status.private}'
                WHERE
                    id = ${userId} AND
                    status = '${Status.public}'`,
      );
  }

  async privateToPublic(userId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE users
                SET
                    status = '${Status.public}'
                WHERE
                    id = ${userId} AND
                    status = '${Status.private}'`,
      );
    await UserService.acceptAllPendingUsers(userId);
  }

  async setLastSeenOfTimeline(userId: number, lastSeen: string): Promise<void> {
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

  async getTimelinePageBaseLastSeen(requestingUserId: number): Promise<number> {
    const user = await this.getUserById(requestingUserId);
    const lastSeen = user.lastSeenOfTimeline.toLocaleString();
    const dateAndTime = lastSeen.split(', ');
    const date = dateAndTime.at(0).split('/');
    const year = date.at(2);
    const day = date.at(1).length === 1 ? `0${date.at(1)}` : date.at(1);
    const month = date.at(0).length === 1 ? `0${date.at(0)}` : date.at(0);
    const time = dateAndTime.at(1).split(':');
    const hour = time.at(0).length === 1 ? `0${time.at(0)}` : time.at(0);
    const minute = time.at(1).length === 1 ? `0${time.at(1)}` : time.at(1);
    const seconds = time.at(2).split(' ').at(0);
    const lastTime = `${year}-${month}-${day} ${hour}:${minute}:${seconds}`;

    const numOfTweetsBeforeLastSeenDate = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE
                  tweets.created_at < '${lastTime}' AND
                  (
                    tweets.id IN (
                          SELECT tweets.id FROM tweets
                          WHERE
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
                                          OR
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
                              AND
                              (
                                tweets.tweet_type = '${TweetType.normal}'
                                OR
                                tweets.tweet_type <> '${TweetType.normal}' AND
                                (
                                  tweets.reference_tweet_id IN (
                                        SELECT tweets.id FROM tweets
                                        LEFT JOIN users ON
                                          tweets.user_id = users.id
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
                                  tweets.reference_tweet_id IN (
                                      SELECT tweets.id FROM tweets
                                      LEFT JOIN users ON
                                        tweets.user_id = users.id
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
                              )
                      )
                  OR
                    tweets.id IN (SELECT tweet_id FROM likes
                              LEFT JOIN users ON
                                  likes.user_id = users.id
                              LEFT JOIN follow ON
                                  users.id = follow.user_id
                              WHERE
                                  users.status = '${UserStatus.private}' AND
                                  follow.status = '${FollowStatus.follower}' AND
                                  follow.target_user_id = ${requestingUserId}
                              OR
                                  users.status = '${UserStatus.public}' AND
                                  (
                                    follow.status <> '${FollowStatus.block}' AND
                                    (
                                      follow.target_user_id = ${requestingUserId}
                                      OR
                                      follow.user_id = ${requestingUserId}
                                    )
                                    OR
                                    (
                                      follow.target_user_id <> ${requestingUserId}
                                      OR
                                      follow.user_id <> ${requestingUserId}
                                    )
                                  )
                          )
                  )
                GROUP BY
                    tweets.id
                `,
      );
    return Math.floor(numOfTweetsBeforeLastSeenDate.length / 10);
  }

  private static async acceptAllPendingUsers(userId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE follow 
                SET 
                    status = '${FollowStatus.follower}' 
                WHERE 
                    user_id = ${userId} AND 
                    status = '${FollowStatus.pending}'`,
      );
  }
}

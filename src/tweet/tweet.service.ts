import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TweetEntity, TweetType } from './entities/tweet.entity';
import { getConnection, Repository } from 'typeorm';
import { TweetDto } from './dtos/tweet.dto';
import { UserService } from '../user/user.service';
import { Status as UserStatus, UserEntity } from '../user/entities/user.entity';
import { Status as FollowStatus } from '../follow/entities/follow.entity';

@Injectable()
export class TweetService {
  constructor(
    @InjectRepository(TweetEntity)
    private readonly tweetRepository: Repository<TweetEntity>,
    private readonly userService: UserService,
  ) {}
  async getTweet(tweetId: number): Promise<TweetEntity> {
    const tweet = this.tweetRepository
      .createQueryBuilder('tweets')
      .where({ id: tweetId })
      .getOne();
    if (!tweet) {
      throw new NotFoundException('There is no such user');
    }
    return tweet;
  }

  async getTweetById(
    requestingUserId: number,
    tweetId: number,
  ): Promise<TweetEntity> {
    // check owner of tweet and reference tweet (if tweet be retweet of another) be
    //      requesting user OR
    //      private user who is following of the requesting user OR
    //      public user who not blocked by requesting user OR
    //      public user who hasn't blocked the requesting user
    const tweets = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
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
                    AND
                    (
                      tweets.tweet_type <> '${TweetType.retweet}'
                      OR
                      tweets.tweet_type = '${TweetType.retweet}' AND
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
                                follow.target_user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
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
                              follow.user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                          )
                      )
                    )
                `,
      );
    if (!tweets.at(0)) {
      throw new ForbiddenException('You are not allowed.');
    }
    const tweet = new TweetEntity();
    tweet.id = tweets.at(0).id;
    tweet.text = tweets.at(0).text;
    tweet.tweetType = tweets.at(0).tweet_type;
    tweet.referenceTweetId = tweets.at(0).reference_tweet_id;
    tweet.userId = tweets.at(0).user_id;
    tweet.createdAt = tweets.at(0).created_at;
    return tweet;
  }

  async getTimelineTweets(
    requestingUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    const tweets = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE
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
                                        users.status = '${
                                          UserStatus.private
                                        }' AND
                                        follow.target_user_id = ${requestingUserId} AND
                                        follow.status = '${
                                          FollowStatus.follower
                                        }'
                                        OR
                                        users.status = '${
                                          UserStatus.public
                                        }' AND
                                        follow.target_user_id = ${requestingUserId} AND
                                        follow.status <> '${FollowStatus.block}'
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
                                      follow.user_id = ${requestingUserId} AND
                                      follow.status <> '${FollowStatus.block}'
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
                                follow.status <> '${FollowStatus.block}' AND
                                (
                                    follow.target_user_id = ${requestingUserId}
                                OR
                                    follow.user_id = ${requestingUserId}
                                )
                        )
                ORDER BY 
                    tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
    // Save date of last tweet that user saw in his timeline
    const lastTweet = tweets.at(0);
    const d = new Date(Date.parse(lastTweet.created_at));

    await this.userService.setLastSeenOfTimeline(
      requestingUserId,
      d.toLocaleString(),
    );
    return tweets;
  }

  async getTweetRetweets(
    tweetId: number,
    page: number,
  ): Promise<Array<UserEntity>> {
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT users.id, username, name, bio, status FROM users
                LEFT JOIN tweets ON
                    users.id = tweets.user_id
                WHERE
                    tweets.reference_tweet_id = ${tweetId} AND
                    tweets.tweet_type = '${TweetType.retweet}'
                ORDER BY 
                    tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  // Get tweets with comment/quote type
  async getTargetTweets(
    requestingUserId: number,
    tweetId: number,
    page: number,
    targetTweetType: TweetType,
  ): Promise<Array<TweetEntity>> {
    // Check request user can see current tweet and its target tweets
    const acceptableCurrentTweet = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
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
    // Get Target tweets of
    //                      (requesting user) /
    //                      (private users that are following of requesting user) /
    //                      (public users that haven't blocked the requesting user) /
    //                      (public users that aren't blocked by requesting user)
    return getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT targetTweet.id, text, tweet_type, reference_tweet_id, user_id, targetTweet.created_at FROM tweets as targetTweet
                LEFT JOIN users ON
                  targetTweet.user_id = users.id
                WHERE
                  targetTweet.reference_tweet_id = ${tweetId} AND
                  targetTweet.tweet_type = '${targetTweetType}' AND
                  (
                    targetTweet.user_id IN (
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
                    targetTweet.user_id IN (
                          SELECT users.id FROM users
                          LEFT JOIN follow ON
                            users.id = follow.target_user_id
                          WHERE
                            users.status = '${UserStatus.public}' AND
                            follow.user_id = ${requestingUserId} AND
                            follow.status <> '${FollowStatus.block}'
                      )
                  )
                ORDER BY 
                  targetTweet.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  // Get count of tweets with comment/retweet/quote type
  async getTargetTweetsCount(
    requestingUserId: number,
    tweetId: number,
    targetTweetType: TweetType,
  ): Promise<number> {
    // Check request user can see count of current tweet and its target tweets
    const acceptableCurrentTweet = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
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
    // Get count of target tweets of tweet
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE
                    tweets.reference_tweet_id = ${tweetId} AND
                    tweets.tweet_type = '${targetTweetType}'
                `,
      );
    return count.at(0).count;
  }

  async getUserTweets(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Check request user can see tweets of target user or not
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
    // Return tweets of user (except replies)
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE
                    user_id = ${targetUserId} AND 
                    tweet_type <> '${TweetType.comment}'
                ORDER BY 
                    tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  async getUserTweetsCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see count of tweets of target user or not
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
    // Get and return count of user tweets
    return await this.tweetRepository.count({
      where: { userId: targetUserId },
    });
  }

  async getUserReplies(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Check request user can see comments of target user or not
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
    // Return comments that user has tweeted
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE
                    user_id = ${targetUserId} AND 
                    tweet_type = '${TweetType.comment}'
                ORDER BY 
                    tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  async getUserRepliesCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see count of comments of target user or not
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
    // Get and return count of user replies
    return await this.tweetRepository.count({
      where: { userId: targetUserId, tweetType: TweetType.comment },
    });
  }

  async getUserRelationWithTweet(
    requestingUserId: number,
    tweetId: number,
  ): Promise<string> {
    const relation = await this.tweetRepository.findOne({
      where: {
        userId: requestingUserId,
        referenceTweetId: tweetId,
      },
    });
    return relation ? relation.tweetType : 'NONE';
  }

  async create(
    requestingUserId: number,
    tweetDto: TweetDto,
  ): Promise<TweetEntity> {
    const user = await this.userService.getUserById(requestingUserId);
    // Create tweet entity
    const tweet = new TweetEntity();
    tweet.text = tweetDto.text;
    tweet.tweetType = tweetDto.tweetType;

    if (tweetDto.tweetType !== TweetType.normal) {
      // Check request user can tweet from target tweet or not
      const acceptableCurrentTweet = await getConnection()
        .createQueryRunner()
        .manager.query(
          `SELECT COUNT(*) FROM tweets
                WHERE
                    tweets.id = ${tweetDto.referenceTweetId} AND
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

      // Get reference tweet
      const referenceTweet = await this.getTweet(tweetDto.referenceTweetId);
      tweet.referenceTweetId = tweetDto.referenceTweetId;
      tweet.referenceTweet = referenceTweet;
    }
    tweet.userId = requestingUserId;
    tweet.user = user;
    // Save tweet and return it
    return this.tweetRepository.save(tweet);
  }

  async delete(requestingUserId: number, tweetId: number): Promise<void> {
    const tweet = await this.getTweet(tweetId);
    // Check ownership of tweet
    if (requestingUserId !== tweet.userId) {
      throw new ForbiddenException('You are not allowed.');
    }
    // Delete tweet and retweets of tweet
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM tweets 
              WHERE 
                  tweet_type = '${TweetType.retweet}' AND 
                  reference_tweet_id = ${tweetId}
                  OR
                  id = ${tweetId}`,
      );
  }
}

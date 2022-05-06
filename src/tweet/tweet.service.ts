import { ForbiddenException, Injectable } from '@nestjs/common';
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
                                        (
                                          follow.target_user_id = ${requestingUserId} AND
                                          follow.status <> '${
                                            FollowStatus.block
                                          }'
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
                GROUP BY
                    tweets.id
                ORDER BY 
                    tweets.created_at ASC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
    // Save date of last tweet that user saw in his timeline
    const lastTweet = tweets.at(0);
    if (lastTweet) {
      const d = new Date(Date.parse(lastTweet.created_at));

      await this.userService.setLastSeenOfTimeline(
        requestingUserId,
        d.toLocaleString(),
      );
    }
    return tweets;
  }

  async getTweetRetweets(
    requestingUserId: number,
    tweetId: number,
    page: number,
  ): Promise<Array<UserEntity>> {
    // Check request user can see current tweet and its target tweets
    const acceptableCurrentTweet =
      await this.requestingUserIsAcceptableForTargetTweet(
        requestingUserId,
        tweetId,
      );
    if (!acceptableCurrentTweet) {
      throw new ForbiddenException('You are not allowed.');
    }
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
    const acceptableCurrentTweet =
      await this.requestingUserIsAcceptableForTargetTweet(
        requestingUserId,
        tweetId,
      );
    if (!acceptableCurrentTweet) {
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
                            (
                              follow.target_user_id = ${requestingUserId} AND
                              follow.status <> '${FollowStatus.block}'
                              OR
                              follow.target_user_id <> ${requestingUserId}
                            )

                      )
                    OR
                    targetTweet.user_id IN (
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
    const acceptableCurrentTweet =
      await this.requestingUserIsAcceptableForTargetTweet(
        requestingUserId,
        tweetId,
      );
    if (!acceptableCurrentTweet) {
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
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE 
                    tweets.user_id = ${targetUserId} AND
                    (
                      (
                        (
                          tweets.tweet_type = '${TweetType.normal}'
                          OR
                          tweets.tweet_type = '${TweetType.quote}'
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
                      )
                      OR
                      (
                        tweets.tweet_type = '${TweetType.retweet}' AND
                        (
                          tweets.reference_tweet_id IN (
                                  SELECT tweets.id FROM tweets
                                      WHERE
                                  tweets.user_id IN (
                                        SELECT users.id FROM users
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
                                          (
                                            follow.target_user_id = ${requestingUserId} AND
                                            follow.status <> '${
                                              FollowStatus.block
                                            }'
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
                                          users.status = '${
                                            UserStatus.public
                                          }' AND
                                          (
                                            follow.user_id = ${requestingUserId} AND
                                            follow.status <> '${
                                              FollowStatus.block
                                            }'
                                            OR
                                            follow.user_id <> ${requestingUserId}
                                          )
                                    )
                          )
                        )
                      )
                    )
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
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE 
                    tweets.user_id = ${targetUserId} AND
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
                `,
      );
  }

  async getUserReplies(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Return comments that user has tweeted
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                WHERE 
                    tweets.user_id = ${targetUserId} AND
                    tweets.tweet_type = '${TweetType.comment}' AND
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
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE 
                    tweets.user_id = ${targetUserId} AND
                    tweets.tweet_type = '${TweetType.comment}' AND
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
                `,
      );
  }

  async getUserRelationWithTweet(
    requestingUserId: number,
    tweetId: number,
  ): Promise<Array<string>> {
    const relation = await this.tweetRepository
      .createQueryBuilder('tweets')
      .where({
        userId: requestingUserId,
        referenceTweetId: tweetId,
      })
      .getMany();
    const result = [];
    for (const r of relation) {
      result.push(r.tweetType);
    }
    return result.length !== 0 ? result : ['NONE'];
  }

  async create(
    requestingUserId: number,
    tweetDto: TweetDto,
  ): Promise<TweetEntity> {
    // Create tweet entity
    const tweet = new TweetEntity();
    tweet.text = tweetDto.text;
    tweet.tweetType = tweetDto.tweetType;

    if (tweetDto.tweetType !== TweetType.normal) {
      // Check request user can tweet from target tweet or not
      const acceptableCurrentTweet =
        await this.requestingUserIsAcceptableForTargetTweet(
          requestingUserId,
          tweetDto.referenceTweetId,
        );
      if (!acceptableCurrentTweet) {
        throw new ForbiddenException('You are not allowed.');
      }
      if (tweetDto.tweetType === TweetType.retweet) {
        const thereIsRetweet = await this.tweetRepository.findOne({
          where: {
            tweetType: TweetType.retweet,
            userId: requestingUserId,
            referenceTweetId: tweetDto.referenceTweetId,
          },
        });
        if (thereIsRetweet) {
          throw new ForbiddenException('You can not retweet again');
        }
      }
      // Get reference tweet
      tweet.referenceTweetId = tweetDto.referenceTweetId;
    }
    tweet.userId = requestingUserId;
    // Save tweet and return it
    return this.tweetRepository.save(tweet);
  }

  async delete(requestingUserId: number, tweetId: number): Promise<void> {
    // Delete tweet and retweets of tweet
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM tweets 
              WHERE
                user_id = ${requestingUserId} AND
                (
                  tweet_type = '${TweetType.retweet}' AND 
                  reference_tweet_id = ${tweetId}
                  OR
                  id = ${tweetId}
                )
              `,
      );
  }

  async requestingUserIsAcceptableForTargetUser(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<boolean> {
    const thereIsAnyAcceptableRelation = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
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
                              (
                                follow.target_user_id = ${requestingUserId} AND
                                follow.status <> '${FollowStatus.block}'
                                OR
                                follow.target_user_id <> ${requestingUserId}
                              )
                        )
                      OR
                      users.id IN (
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
    return thereIsAnyAcceptableRelation.length !== 0;
  }

  async requestingUserIsAcceptableForTargetTweet(
    requestingUserId: number,
    targetTweetId: number,
  ): Promise<boolean> {
    const thereIsAnyAcceptableRelation = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
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
                `,
      );
    return thereIsAnyAcceptableRelation.length !== 0;
  }
}

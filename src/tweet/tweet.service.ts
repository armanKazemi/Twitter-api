import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TweetEntity, TweetType } from './entities/tweet.entity';
import { Connection, getConnection, Not, Repository } from 'typeorm';
import { TweetDto } from './dtos/tweet.dto';
import { UserService } from '../user/user.service';
import { Status as UserStatus, UserEntity } from '../user/entities/user.entity';
import { FollowService } from '../follow/follow.service';
import { Status as FollowStatus } from '../follow/entities/follow.entity';

@Injectable()
export class TweetService {
  constructor(
    @InjectRepository(TweetEntity)
    private readonly tweetRepository: Repository<TweetEntity>,
    private readonly userService: UserService,
    private readonly followService: FollowService,
    private readonly connection: Connection,
  ) {}
  async getTweet(tweetId: number): Promise<TweetEntity> {
    const tweet = this.tweetRepository
      .createQueryBuilder('tweets')
      .where({ id: tweetId })
      .getOne();
    // const tweet = await getConnection()
    //   .createQueryRunner()
    //   .manager.query(`SELECT * FROM tweets WHERE id = ${tweetId} LIMIT 1`);
    if (!tweet) {
      throw new NotFoundException('There is no such user');
    }
    return tweet;
  }

  // TODO can't get retweets that reference user is private
  async getTweetById(
    requestingUserId: number,
    tweetId: number,
  ): Promise<TweetEntity> {
    const tweet = await this.getTweet(tweetId);
    // Check request user can see target user or not
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
                WHERE 
                    users.id = ${tweet.userId} AND
                (
                    users.id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                    users.id NOT IN (SELECT user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          target_user_id = ${requestingUserId}
                                    )
                    OR
                    users.id NOT IN (SELECT target_user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          user_id = ${requestingUserId}
                                    )                    
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    users.id IN (SELECT user_id FROM follow
                                 WHERE
                                    status = '${FollowStatus.follower}' AND
                                    target_user_id = ${requestingUserId}
                                )
                )`,
      );
    if (acceptableTargetUser.length === 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
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
                ORDER BY 
                    tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
    // Save date of last tweet that user saw in his timeline
    const lastTweet = tweets.at(-1);
    const lastTweetE = await this.getTweet(lastTweet.id);
    await this.userService.setLastSeenOfTimeline(
      requestingUserId,
      lastTweetE.createdAt,
    );
    return tweets;
  }

  async getTweetRetweets(
    requestingUserId: number,
    tweetId: number,
    page: number,
  ): Promise<Array<UserEntity>> {
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
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
        `SELECT * FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
                WHERE 
                    tweets.id = ${tweetId} AND
                (
                    tweets.user_id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${requestingUserId}
                                                )
                    OR
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${requestingUserId}
                                                )
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    tweets.user_id IN (SELECT user_id FROM follow
                                        WHERE
                                            status = '${FollowStatus.follower}' AND
                                            target_user_id = ${requestingUserId}
                                        )
                )`,
      );
    if (acceptableCurrentTweet.length === 0) {
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
        `SELECT * FROM tweets as targetTweet
                LEFT JOIN users ON
                    tweets.user_id = users.id
                WHERE
                    targetTweet.reference_tweet_id = ${tweetId} AND
                    targetTweet.tweet_type = '${targetTweetType}' AND
                    (
                        targetTweet.user_id = ${requestingUserId}
                    OR
                        users.status = '${UserStatus.private}' AND
                        targetTweet.user_id IN (SELECT user_id FROM follow
                                                WHERE                                                    
                                                    follow.status = '${
                                                      FollowStatus.follower
                                                    }' AND
                                                    follow.target_user_id = ${requestingUserId}
                                                )
                    OR
                        users.status = '${UserStatus.public}'
                        (
                            targetTweet.user_id NOT IN (SELECT user_id FROM follow
                                                        WHERE                                                    
                                                            follow.status = '${
                                                              FollowStatus.block
                                                            }' AND
                                                            follow.target_user_id = ${requestingUserId}
                                                        )
                        OR
                            targetTweet.user_id NOT IN (SELECT target_user_id FROM follow
                                                        WHERE                                                    
                                                            follow.status = '${
                                                              FollowStatus.block
                                                            }' AND
                                                            follow.user_id = ${requestingUserId}
                                                        )
                        )
                    )
                ORDER BY 
                    tweets.created_at DESC
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
    // Check request user can see current tweet and its target tweets count
    const acceptableCurrentTweet = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
                WHERE 
                    tweets.id = ${tweetId} AND
                (
                    tweets.user_id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${requestingUserId}
                                                )
                    OR
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${requestingUserId}
                                                )
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    tweets.user_id IN (SELECT user_id FROM follow
                                        WHERE
                                            status = '${FollowStatus.follower}' AND
                                            target_user_id = ${requestingUserId}
                                        )
                )`,
      );
    if (acceptableCurrentTweet.length === 0) {
      throw new ForbiddenException('You are not allowed.');
    }
    // Get count of target tweets of tweet
    return getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                WHERE
                    tweets.reference_tweet_id = ${tweetId} AND
                    tweets.tweet_type = '${targetTweetType}' AND
                `,
      );
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
        `SELECT * FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                (
                    users.id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                    users.id NOT IN (SELECT user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          target_user_id = ${requestingUserId}
                                    )
                    OR
                    users.id NOT IN (SELECT target_user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          user_id = ${requestingUserId}
                                    )                    
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    users.id IN (SELECT user_id FROM follow
                                 WHERE
                                    status = '${FollowStatus.follower}' AND
                                    target_user_id = ${requestingUserId}
                                )
                )`,
      );
    if (acceptableTargetUser.length === 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    // Return user tweets that they are not comment
    return await this.tweetRepository.find({
      take: 10,
      skip: page * 10,
      where: { userId: targetUserId, tweetType: Not(TweetType.comment) },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserTweetsCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see count of tweets of target user or not
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                (
                    users.id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                    users.id NOT IN (SELECT user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          target_user_id = ${requestingUserId}
                                    )
                    OR
                    users.id NOT IN (SELECT target_user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          user_id = ${requestingUserId}
                                    )                    
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    users.id IN (SELECT user_id FROM follow
                                 WHERE
                                    status = '${FollowStatus.follower}' AND
                                    target_user_id = ${requestingUserId}
                                )
                )`,
      );
    if (acceptableTargetUser.length === 0) {
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
        `SELECT * FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                (
                    users.id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                    users.id NOT IN (SELECT user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          target_user_id = ${requestingUserId}
                                    )
                    OR
                    users.id NOT IN (SELECT target_user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          user_id = ${requestingUserId}
                                    )                    
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    users.id IN (SELECT user_id FROM follow
                                 WHERE
                                    status = '${FollowStatus.follower}' AND
                                    target_user_id = ${requestingUserId}
                                )
                )`,
      );
    if (acceptableTargetUser.length === 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    // Return comments that user has tweeted
    return await this.tweetRepository.find({
      take: 10,
      skip: page * 10,
      where: { userId: targetUserId, tweetType: TweetType.comment },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserRepliesCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see count of comments of target user or not
    const acceptableTargetUser = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM users
                WHERE 
                    users.id = ${targetUserId} AND
                (
                    users.id = ${requestingUserId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                    users.id NOT IN (SELECT user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          target_user_id = ${requestingUserId}
                                    )
                    OR
                    users.id NOT IN (SELECT target_user_id FROM follow
                                      WHERE 
                                          status = '${FollowStatus.block}' AND
                                          user_id = ${requestingUserId}
                                    )                    
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    users.id IN (SELECT user_id FROM follow
                                 WHERE
                                    status = '${FollowStatus.follower}' AND
                                    target_user_id = ${requestingUserId}
                                )
                )`,
      );
    if (acceptableTargetUser.length === 0) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    // Get and return count of user replies
    return await this.tweetRepository.count({
      where: { userId: targetUserId, tweetType: TweetType.comment },
    });
  }

  async create(userId: number, tweetDto: TweetDto): Promise<TweetEntity> {
    const user = await this.userService.getUserById(userId);
    // Create tweet entity
    const tweet = new TweetEntity();
    tweet.text = tweetDto.text;
    tweet.tweetType = tweetDto.tweetType;
    if (tweetDto.tweetType !== TweetType.normal) {
      // Check request user can tweet from target tweet or not
      const acceptableCurrentTweet = await getConnection()
        .createQueryRunner()
        .manager.query(
          `SELECT * FROM tweets
                LEFT JOIN users ON 
                    tweets.user_id = users.id
                WHERE 
                    tweets.id = ${tweetDto.referenceTweetId} AND
                (
                    tweets.user_id = ${userId}
                OR
                    users.status = '${UserStatus.public}' AND
                    (
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${userId}
                                                )
                    OR
                        tweets.user_id NOT IN (SELECT user_id FROM follow
                                                WHERE
                                                    status = '${FollowStatus.block}' AND
                                                    target_user_id = ${userId}
                                                )
                    )
                OR
                    users.status = '${UserStatus.private}' AND
                    tweets.user_id IN (SELECT user_id FROM follow
                                        WHERE
                                            status = '${FollowStatus.follower}' AND
                                            target_user_id = ${userId}
                                        )
                )`,
        );
      if (acceptableCurrentTweet.length === 0) {
        throw new ForbiddenException('You are not allowed.');
      }
      // Get reference tweet
      const referenceTweet = await this.getTweet(tweetDto.referenceTweetId);
      tweet.referenceTweetId = tweetDto.referenceTweetId;
      tweet.referenceTweet = referenceTweet;
    }
    tweet.userId = userId;
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

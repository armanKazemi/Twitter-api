import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaEntity, MediaPosition } from './entities/media.entity';
import { getConnection, Repository } from 'typeorm';
import { Status as UserStatus } from '../user/entities/user.entity';
import { MediaDto } from './dtos/media.dto';
import { Status as FollowStatus } from '../follow/entities/follow.entity';
import { TweetEntity } from '../tweet/entities/tweet.entity';
import { TweetService } from '../tweet/tweet.service';
import { unlink } from 'fs';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
    private readonly tweetService: TweetService,
  ) {}

  async getProfileMedias(userId: number): Promise<Array<MediaEntity>> {
    return await this.mediaRepository.find({
      where: [
        {
          userId: userId,
          mediaPosition: MediaPosition.avatar,
        },
        {
          userId: userId,
          mediaPosition: MediaPosition.profileImg,
        },
      ],
    });
  }

  async getTweetMedias(
    requestingUserId: number,
    tweetId: number,
  ): Promise<Array<MediaEntity>> {
    // Return tweet medias metadata
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT * FROM media
                WHERE
                    media_position = '${MediaPosition.tweetMedia}' AND
                    tweet_id = ${tweetId} AND
                    (
                      user_id IN (
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
                      user_id IN (
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
                ORDER BY media.created_at ASC
                `,
      );
  }

  async getUserMedias(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<TweetEntity>> {
    // Return tweets of user that have media
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT 
                    tweets.id, 
                    text, 
                    tweet_type, 
                    reference_tweet_id, 
                    tweets.user_id 
                FROM tweets
                LEFT JOIN media ON
                    tweets.id = media.tweet_id
                WHERE
                    media_position = '${MediaPosition.tweetMedia}' AND
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
                GROUP BY tweets.id
                ORDER BY tweets.created_at DESC
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY
                `,
      );
  }

  async getUserMediasCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see medias count of target user or not
    const count = await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*) FROM tweets
                LEFT JOIN media ON
                    tweets.id = media.tweet_id
                WHERE
                    media_position = '${MediaPosition.tweetMedia}' AND
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
                GROUP BY tweets.id
                `,
      );
    return count.length;
  }

  async uploadMedia(
    userId: number,
    tweetId: number,
    mediaDto: MediaDto,
  ): Promise<void> {
    if (
      mediaDto.mediaPosition === MediaPosition.avatar ||
      mediaDto.mediaPosition === MediaPosition.profileImg
    ) {
      const oldOne = await this.mediaRepository.findOne({
        where: {
          mediaPosition: mediaDto.mediaPosition,
          userId: userId,
        },
      });
      if (oldOne) {
        await this.mediaRepository.remove(oldOne);
        this.unlinkFunction(oldOne.path);
      }
    }
    const mediaMetadata = new MediaEntity();
    mediaMetadata.fileName = mediaDto.fileName;
    mediaMetadata.path = mediaDto.path;
    mediaMetadata.mimetype = mediaDto.mimetype;
    mediaMetadata.mediaPosition = mediaDto.mediaPosition;
    mediaMetadata.userId = userId;
    // If media be for a tweet
    if (mediaDto.mediaPosition === MediaPosition.tweetMedia) {
      mediaMetadata.tweetId = tweetId;
    }
    // Save media metadata
    await this.mediaRepository.save(mediaMetadata);
  }

  async getMediaMetadata(
    requestingUserId: number,
    mediaId: number,
  ): Promise<MediaEntity> {
    // Check existence of media
    const mediaMetadata = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });
    if (!mediaMetadata) {
      throw new NotFoundException('There is no such media.');
    }
    // If media is being for a tweet, must check its owner is private or public
    if (mediaMetadata.mediaPosition === MediaPosition.tweetMedia) {
      const acceptableTargetUser =
        await this.tweetService.requestingUserIsAcceptableForTargetUser(
          requestingUserId,
          mediaMetadata.userId,
        );
      if (!acceptableTargetUser) {
        throw new ForbiddenException(`You are not allowed.`);
      }
    }
    return mediaMetadata;
  }

  async deleteMedia(requestingUserId: number, mediaId: number): Promise<void> {
    const media = await this.mediaRepository.findOne({
      where: [
        {
          id: mediaId,
          // Check ownership of media
          userId: requestingUserId,
          // Check position of media (Just avatar or profileImg can be deleted)
          mediaPosition: MediaPosition.avatar,
        },
        {
          id: mediaId,
          // Check ownership of media
          userId: requestingUserId,
          // Check position of media (Just avatar or profileImg can be deleted)
          mediaPosition: MediaPosition.profileImg,
        },
      ],
    });
    if (!media) {
      throw new ForbiddenException('You are not allowed.');
    }
    // Remove media
    await this.mediaRepository.remove(media);
    this.unlinkFunction(media.path);
  }

  unlinkFunction(path: string): void {
    unlink(path, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}

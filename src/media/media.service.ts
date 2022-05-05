import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaEntity, MediaPosition } from './entities/media.entity';
import { getConnection, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { Status as UserStatus } from '../user/entities/user.entity';
import { FollowService } from '../follow/follow.service';
import { MediaDto } from './dtos/media.dto';
import { TweetService } from '../tweet/tweet.service';
import { Status as FollowStatus } from '../follow/entities/follow.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
    private readonly userService: UserService,
    private readonly followService: FollowService,
    private readonly tweetService: TweetService,
  ) {}
  async getUserMediasCount(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<number> {
    // Check request user can see medias count of target user or not
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
    // Return count of tweets of user that have media
    return await getConnection()
      .createQueryRunner()
      .manager.query(
        `SELECT COUNT(*)
                FROM media
                WHERE
                    media_position = '${MediaPosition.tweetMedia}' AND
                    user_id = ${targetUserId}
                GROUP BY tweet_id`,
      );
  }

  async uploadMedia(
    userId: number,
    tweetId: number,
    mediaDto: MediaDto,
  ): Promise<void> {
    const user = await this.userService.getUserById(userId);
    const mediaMetadata = new MediaEntity();
    mediaMetadata.fileName = mediaDto.fileName;
    mediaMetadata.path = mediaDto.path;
    mediaMetadata.mimetype = mediaDto.mimetype;
    mediaMetadata.mediaPosition = mediaDto.mediaPosition;
    mediaMetadata.userId = user.id;
    mediaMetadata.user = user;
    // If media be for a tweet
    if (mediaDto.mediaPosition === MediaPosition.tweetMedia) {
      const tweet = await this.tweetService.getTweet(tweetId);
      mediaMetadata.tweetId = tweet.id;
      mediaMetadata.tweet = tweet;
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
      const mediaOwner = await this.userService.getUserById(
        mediaMetadata.userId,
      );
      if (mediaOwner.status === UserStatus.private) {
        // Check requesting user is follower of owner media or not
        const followRelation = await this.followService.isFollower(
          requestingUserId,
          mediaOwner.id,
        );
        if (!followRelation) {
          throw new ForbiddenException('You are not allowed.');
        }
      }
    }
    return mediaMetadata;
  }

  async deleteMediaMetadata(
    requestingUserId: number,
    mediaId: number,
  ): Promise<MediaEntity> {
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
    return media;
  }
}

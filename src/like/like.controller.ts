import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCurrentUser } from '../user/decorator/getCurrentUser.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { TweetEntity } from '../tweet/entities/tweet.entity';
import { LikeEntity } from './entities/like.entity';

@ApiTags('Like Management')
@Controller('like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Get('/:likeId')
  @ApiOperation({ summary: 'Get like by id' })
  getLikeById(
    @Param('tweetId', ParseIntPipe) likeId: number,
  ): Promise<LikeEntity> {
    return this.likeService.getLikeById(likeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetTweetId/tweetLikes')
  @ApiOperation({
    summary: 'Get users that have liked  the tweet. (by id)',
  })
  getTweetLikes(
    @Param('targetTweetId', ParseIntPipe) targetTweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<UserEntity>> {
    return this.likeService.getTweetLikes(requestingUser.id, targetTweetId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetTweetId/TweetsLikesCount')
  @ApiOperation({
    summary: 'Get count of users that have liked the tweet. (by id)',
  })
  getTweetLikesCount(
    @Param('targetTweetId', ParseIntPipe) targetTweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.likeService.getTweetLikesCount(
      requestingUser.id,
      targetTweetId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/userLikes')
  @ApiOperation({
    summary: 'Get tweets that user has liked. (by id)',
  })
  getUserLikes(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.likeService.getUserLikes(requestingUser.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/userLikesCount')
  @ApiOperation({
    summary: 'Get count of tweets that user has liked. (by id)',
  })
  getUserLikesCount(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.likeService.getUserLikesCount(requestingUser.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetTweetId/like')
  @ApiOperation({
    summary: 'Like tweet.',
  })
  like(
    @Param('targetTweetId', ParseIntPipe) targetTweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<void> {
    return this.likeService.like(requestingUser.id, targetTweetId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetTweetId/unlike')
  @ApiOperation({
    summary: 'Unlike tweet.',
  })
  unlike(
    @Param('targetTweetId', ParseIntPipe) targetTweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<void> {
    return this.likeService.unlike(requestingUser.id, targetTweetId);
  }
}

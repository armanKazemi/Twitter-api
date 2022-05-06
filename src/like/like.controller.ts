import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
    @Param('likeId', ParseIntPipe) likeId: number,
  ): Promise<LikeEntity> {
    return this.likeService.getLikeById(likeId);
  }

  @Get('/:targetTweetId/tweetLikes')
  @ApiOperation({
    summary: 'Get users that have liked  the tweet. (by id)',
  })
  getTweetLikes(
    @Query('page') page = '0',
    @Param('targetTweetId', ParseIntPipe) targetTweetId: number,
  ): Promise<Array<UserEntity>> {
    return this.likeService.getTweetLikes(targetTweetId, +page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetTweetId/tweetLikesCount')
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
    @Query('page') page = '0',
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.likeService.getUserLikes(
      requestingUser.id,
      targetUserId,
      +page,
    );
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
  @Get('/:tweetId/hasLiked')
  @ApiOperation({ summary: 'If user has liked the tweet?' })
  hasLiked(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<boolean> {
    return this.likeService.hasLiked(requestingUser.id, tweetId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:targetTweetId')
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
  @Delete('/:targetTweetId')
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

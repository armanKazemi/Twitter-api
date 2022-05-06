import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TweetService } from './tweet.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCurrentUser } from '../user/decorator/getCurrentUser.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { TweetEntity, TweetType } from './entities/tweet.entity';
import { TweetDto } from './dtos/tweet.dto';

@ApiTags('Tweet management')
@Controller('tweet')
export class TweetController {
  constructor(private readonly tweetService: TweetService) {}

  // TWEETS
  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId')
  @ApiOperation({ summary: 'Get tweet by id.' })
  getTweetById(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<TweetEntity> {
    return this.tweetService.getTweetById(requestingUser.id, tweetId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/timeline/:page')
  @ApiOperation({ summary: 'Get timeline tweets.' })
  getTimelineTweets(
    // @Query('page') page = '0',
    @Param('page') page = '0',
    @GetCurrentUser() user: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.tweetService.getTimelineTweets(user.id, +page);
  }

  // COMMENTS
  @UseGuards(JwtAuthGuard)
  @Get(':tweetId/comments')
  @ApiOperation({ summary: 'Get comments of tweet. (by id)' })
  getTweetComments(
    @Query('page') page = '0',
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.tweetService.getTargetTweets(
      requestingUser.id,
      tweetId,
      +page,
      TweetType.comment,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId/commentsCount')
  @ApiOperation({
    summary: `Get count of tweet's comments. (by id)`,
  })
  getTweetCommentsCount(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.tweetService.getTargetTweetsCount(
      requestingUser.id,
      tweetId,
      TweetType.comment,
    );
  }

  // RETWEETS
  @UseGuards(JwtAuthGuard)
  @Get(':tweetId/retweets')
  @ApiOperation({ summary: 'Get users who retweet the tweet. (by tweet id)' })
  getTweetRetweets(
    @Query('page') page = '0',
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<UserEntity>> {
    return this.tweetService.getTweetRetweets(
      requestingUser.id,
      tweetId,
      +page,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId/retweetsCount')
  @ApiOperation({
    summary: `Get count of tweet's retweets. (by id)`,
  })
  getTweetRetweetsCount(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.tweetService.getTargetTweetsCount(
      requestingUser.id,
      tweetId,
      TweetType.retweet,
    );
  }

  // QUOTES
  @UseGuards(JwtAuthGuard)
  @Get(':tweetId/quotes')
  @ApiOperation({ summary: 'Get quotes of tweet. (by id)' })
  getTweetQuotes(
    @Query('page') page = '0',
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.tweetService.getTargetTweets(
      requestingUser.id,
      tweetId,
      +page,
      TweetType.quote,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId/quotesCount')
  @ApiOperation({
    summary: `Get count of tweet's quotes. (by id)`,
  })
  getTweetQuotesCount(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.tweetService.getTargetTweetsCount(
      requestingUser.id,
      tweetId,
      TweetType.quote,
    );
  }

  // USER TWEETS
  @UseGuards(JwtAuthGuard)
  @Get(':targetUserId/tweets')
  @ApiOperation({ summary: 'Get tweets of target user. (by id)' })
  getUserTweets(
    @Query('page') page = '0',
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.tweetService.getUserTweets(
      requestingUser.id,
      targetUserId,
      +page,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/tweetsCount')
  @ApiOperation({
    summary: 'Get count of tweets that user created. (by id)',
  })
  getUserTweetsCount(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.tweetService.getUserTweetsCount(
      requestingUser.id,
      targetUserId,
    );
  }

  // USER REPLIES
  @UseGuards(JwtAuthGuard)
  @Get(':targetUserId/replies')
  @ApiOperation({
    summary: 'Get comments that target user has posted. (by id)',
  })
  getUserReplies(
    @Query('page') page = '0',
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<TweetEntity>> {
    return this.tweetService.getUserReplies(
      requestingUser.id,
      targetUserId,
      +page,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/repliesCount')
  @ApiOperation({
    summary: 'Get count of comments that user has posted. (by id)',
  })
  getUserRepliesCount(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<number> {
    return this.tweetService.getUserRepliesCount(
      requestingUser.id,
      targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId/userRelationTweet')
  @ApiOperation({ summary: 'Get relation of user and tweet.' })
  getUserRelationWithTweet(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<string>> {
    return this.tweetService.getUserRelationWithTweet(
      requestingUser.id,
      tweetId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/')
  @ApiOperation({ summary: 'Create new tweet.' })
  create(
    @Body() tweetDto: TweetDto,
    @GetCurrentUser() user: UserEntity,
  ): Promise<TweetEntity> {
    return this.tweetService.create(user.id, tweetDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:tweetId')
  @ApiOperation({ summary: 'Delete tweet. (by id)' })
  delete(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<void> {
    return this.tweetService.delete(requestingUser.id, tweetId);
  }
}

import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Response,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCurrentUser } from '../user/decorator/getCurrentUser.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { createReadStream, unlink } from 'fs';
import { join } from 'path';
import { Express } from 'express';
import { MediaEntity, MediaPosition } from './entities/media.entity';
import { MediaDto } from './dtos/media.dto';
import MediaInterceptor from './media.interceptor';
import { TweetEntity } from '../tweet/entities/tweet.entity';

@ApiTags('Media management')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('/:userId/profileMedias')
  @ApiOperation({ summary: 'Get metadata of avatar and profileImg.' })
  getProfileMedias(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<Array<MediaEntity>> {
    return this.mediaService.getProfileMedias(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:tweetId/tweetMedias')
  @ApiOperation({ summary: 'Get metadata of tweet.' })
  getTweetMedias(
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @GetCurrentUser() requestingUser: UserEntity,
  ): Promise<Array<MediaEntity>> {
    return this.mediaService.getTweetMedias(requestingUser.id, tweetId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId/medias')
  @ApiOperation({
    summary: 'Get user tweets including media. (by id)',
  })
  getUserMedias(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page = '0',
  ): Promise<Array<TweetEntity>> {
    return this.mediaService.getUserMedias(requestingUser.id, userId, +page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId/mediasCount')
  @ApiOperation({
    summary: 'Get count of user tweets including media. (by id)',
  })
  getUserMediasCount(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<number> {
    return this.mediaService.getUserMediasCount(requestingUser.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/upload/avatar')
  @UseInterceptors(
    MediaInterceptor({
      fieldName: 'file',
      path: '/avatars',
    }),
  )
  @ApiOperation({ summary: 'Upload your avatar.' })
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @GetCurrentUser() requestingUser: UserEntity,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    const mediaDto = new MediaDto();
    mediaDto.fileName = file.originalname;
    mediaDto.path = file.path;
    mediaDto.mimetype = file.mimetype;
    mediaDto.mediaPosition = MediaPosition.avatar;
    await this.mediaService.uploadMedia(requestingUser.id, 0, mediaDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/upload/profileImg')
  @UseInterceptors(
    MediaInterceptor({
      fieldName: 'file',
      path: '/profileImages',
    }),
  )
  @ApiOperation({ summary: 'Upload your profile image.' })
  @ApiConsumes('multipart/form-data')
  async uploadProfileImg(
    @GetCurrentUser() requestingUser: UserEntity,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    const mediaDto = new MediaDto();
    mediaDto.fileName = file.originalname;
    mediaDto.path = file.path;
    mediaDto.mimetype = file.mimetype;
    mediaDto.mediaPosition = MediaPosition.profileImg;
    await this.mediaService.uploadMedia(requestingUser.id, 0, mediaDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/upload/:tweetId/tweetMedia')
  @UseInterceptors(
    MediaInterceptor({
      fieldName: 'file',
      path: '/tweetsMedias',
    }),
  )
  @ApiOperation({ summary: `Upload your tweet's media.` })
  @ApiConsumes('multipart/form-data')
  async uploadTweetMedia(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('tweetId', ParseIntPipe) tweetId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    const mediaDto = new MediaDto();
    mediaDto.fileName = file.originalname;
    mediaDto.path = file.path;
    mediaDto.mimetype = file.mimetype;
    mediaDto.mediaPosition = MediaPosition.tweetMedia;
    await this.mediaService.uploadMedia(requestingUser.id, tweetId, mediaDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:mediaId/download')
  @ApiOperation({ summary: 'Download media.' })
  async downloadMedia(
    @GetCurrentUser() requestedUser: UserEntity,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Response({ passthrough: true }) response,
  ): Promise<StreamableFile> {
    const mediaMetadata = await this.mediaService.getMediaMetadata(
      requestedUser.id,
      mediaId,
    );
    const stream = createReadStream(join(process.cwd(), mediaMetadata.path));
    response.set({
      'Content-Type': mediaMetadata.mimetype,
      'Content-Disposition': `inline; filename="${mediaMetadata.fileName}"`,
    });
    return new StreamableFile(stream);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:mediaId/delete')
  @ApiOperation({ summary: 'Delete media. (Just for avatar or profileImg)' })
  async deleteMedia(
    @GetCurrentUser() requestedUser: UserEntity,
    @Param('mediaId', ParseIntPipe) mediaId: number,
  ): Promise<void> {
    const mediaMetaData = await this.mediaService.deleteMediaMetadata(
      requestedUser.id,
      mediaId,
    );
    unlink(mediaMetaData.path, (err) => {
      if (err) {
        console.log(err);
      }
    });
    return;
  }
}

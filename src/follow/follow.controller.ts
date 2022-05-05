import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FollowEntity } from './entities/follow.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCurrentUser } from '../user/decorator/getCurrentUser.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { FollowDto } from './dtos/follow.dto';

@ApiTags('Relation management')
@Controller('follow')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/relationStatus')
  @ApiOperation({
    summary: 'Get Relation status of requesting user and target user.',
  })
  getRelationStatus(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ): Promise<string> {
    return this.followService.getRelationStatus(
      requestingUser.id,
      targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/followers')
  @ApiOperation({
    summary: 'Get followers of user. (by id)',
  })
  getUserFollowers(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Query('page') page = '0',
  ): Promise<Array<UserEntity>> {
    return this.followService.getUserFollowers(
      requestingUser.id,
      targetUserId,
      +page,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:targetUserId/followings')
  @ApiOperation({
    summary: 'Get followings of user. (by id)',
  })
  getUserFollowings(
    @GetCurrentUser() requestingUser: UserEntity,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Query('page') page = '0',
  ): Promise<Array<FollowEntity>> {
    return this.followService.getUserFollowings(
      requestingUser.id,
      targetUserId,
      +page,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/pendingFollowers')
  @ApiOperation({
    summary: 'Get pending users of user. (by id)',
  })
  getUserPendingFollowers(
    @GetCurrentUser() requestingUser: UserEntity,
    @Query('page') page = '0',
  ): Promise<Array<FollowEntity>> {
    return this.followService.getUserPendingFollowers(requestingUser.id, +page);
  }

  @Get('/:targetUserId/followersCount')
  @ApiOperation({
    summary: 'Get count of followers of user. (by id)',
  })
  getUserFollowersCount(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ): Promise<number> {
    return this.followService.getUserFollowersCount(targetUserId);
  }

  @Get('/:targetUserId/followingsCount')
  @ApiOperation({
    summary: 'Get count of followings user. (by id)',
  })
  getUserFollowingsCount(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ): Promise<number> {
    return this.followService.getUserFollowingsCount(targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/')
  @ApiOperation({ summary: 'Follow new user. (by id)' })
  follow(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.follow(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/unfollow')
  @ApiOperation({ summary: 'Unfollow user. (by id)' })
  unfollow(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.unfollow(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/unPending')
  @ApiOperation({ summary: 'UnPending user. (by id)' })
  unPending(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.unPending(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('/accept')
  @ApiOperation({ summary: 'Accept pending user. (by id)' })
  accept(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.accept(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/refuse')
  @ApiOperation({ summary: 'Refuse pending user. (by id)' })
  refuse(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.refuse(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('/block')
  @ApiOperation({ summary: 'Block an user. (by id)' })
  block(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.block(+requestingUser.id, followDto.targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/unblock')
  @ApiOperation({ summary: 'Unblock an user. (by id)' })
  unblock(
    @GetCurrentUser() requestingUser: UserEntity,
    @Body() followDto: FollowDto,
  ): Promise<void> {
    return this.followService.unblock(
      +requestingUser.id,
      followDto.targetUserId,
    );
  }
}

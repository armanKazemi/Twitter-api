import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserDto } from './dtos/user.dto';
import { GetCurrentUser } from './decorator/getCurrentUser.decorator';

@ApiTags('User Management')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/:targetUserId')
  @ApiOperation({ summary: 'Get user. (by id)' })
  async getUserById(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ): Promise<UserEntity> {
    return this.userService.getUserById(targetUserId);
  }

  @Get('/@:username')
  @ApiOperation({ summary: 'Get user. (by username)' })
  getUserByUsername(
    @Param('username') targetUserUsername: string,
  ): Promise<UserEntity> {
    return this.userService.getUserByUsername(targetUserUsername);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/update')
  @ApiOperation({ summary: 'Update user details.' })
  updateUser(
    @Body() userDto: UserDto,
    @GetCurrentUser() user: UserEntity,
  ): Promise<void> {
    return this.userService.updateUser(user.id, userDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('/private')
  @ApiOperation({ summary: 'Change user status to private page.' })
  publicToPrivate(@GetCurrentUser() user: UserEntity): Promise<void> {
    return this.userService.publicToPrivate(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('/public')
  @ApiOperation({ summary: 'Change user status to public page.' })
  privateToPublic(@GetCurrentUser() user: UserEntity): Promise<void> {
    return this.userService.privateToPublic(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/timelinePage/:a')
  @ApiOperation({
    summary:
      'Get last page (pagination) that user seen his tweets in timeline.',
  })
  getTimelinePageBaseLastSeen(
    @Param('a') a = '0',
    @GetCurrentUser() user: UserEntity,
  ): Promise<number> {
    return this.userService.getTimelinePageBaseLastSeen(user.id);
  }
}

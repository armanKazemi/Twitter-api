import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowEntity } from './entities/follow.entity';
import { UserModule } from '../user/user.module';
import { TweetModule } from '../tweet/tweet.module';

@Module({
  imports: [TypeOrmModule.forFeature([FollowEntity]), UserModule, TweetModule],
  providers: [FollowService],
  controllers: [FollowController],
})
export class FollowModule {}

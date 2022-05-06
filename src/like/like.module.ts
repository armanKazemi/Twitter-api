import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikeEntity } from './entities/like.entity';
import { TweetModule } from '../tweet/tweet.module';

@Module({
  imports: [TypeOrmModule.forFeature([LikeEntity]), TweetModule],
  providers: [LikeService],
  controllers: [LikeController],
})
export class LikeModule {}

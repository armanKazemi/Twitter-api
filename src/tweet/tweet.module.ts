import { Module } from '@nestjs/common';
import { TweetService } from './tweet.service';
import { TweetController } from './tweet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetEntity } from './entities/tweet.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([TweetEntity]), UserModule],
  providers: [TweetService],
  controllers: [TweetController],
  exports: [TweetService],
})
export class TweetModule {}

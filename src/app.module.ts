import { Module } from '@nestjs/common';
import { typeOrmConfig } from './config/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetModule } from './tweet/tweet.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { FollowModule } from './follow/follow.module';
import { LikeModule } from './like/like.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TweetModule,
    UserModule,
    AuthModule,
    FollowModule,
    LikeModule,
  ],
})
export class AppModule {}

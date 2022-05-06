import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaEntity } from './entities/media.entity';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { TweetModule } from '../tweet/tweet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: './.env',
      validationSchema: Joi.object({
        UPLOAD_FILE_DESTINATION: Joi.toString(),
        PORT: Joi.number().default(3000),
      }),
    }),
    TypeOrmModule.forFeature([MediaEntity]),
    TweetModule,
  ],
  providers: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}

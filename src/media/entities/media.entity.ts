import { Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PhotoType {
  avatar = 'AVATAR',
  profileImg = 'PROFILE_IMG',
  tweetMedia = 'TWEET_MEDIA',
}

@Entity('photo')
export class PhotoEntity {
  @PrimaryGeneratedColumn()
  id: number;
}

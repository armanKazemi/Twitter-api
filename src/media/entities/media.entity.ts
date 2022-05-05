import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { TweetEntity } from '../../tweet/entities/tweet.entity';

export enum MediaPosition {
  avatar = 'AVATAR',
  profileImg = 'PROFILE_IMG',
  tweetMedia = 'TWEET_MEDIA',
}

@Entity('media')
export class MediaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'file_name', nullable: false })
  fileName: string;

  @Column({ nullable: false })
  path: string;

  @Column({ nullable: false })
  mimetype: string;

  @Column({
    name: 'media_position',
    enum: MediaPosition,
    type: 'enum',
    default: MediaPosition.tweetMedia,
  })
  mediaPosition: MediaPosition;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'tweet_id', nullable: true })
  tweetId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (userEntity) => userEntity.profileMedias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TweetEntity, (tweetEntity) => tweetEntity.medias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tweet_id' })
  tweet: TweetEntity;
}

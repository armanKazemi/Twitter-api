import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { MediaEntity } from '../../media/entities/media.entity';
import { LikeEntity } from '../../like/entities/like.entity';

export enum TweetType {
  normal = 'NORMAL',
  comment = 'COMMENT',
  retweet = 'RETWEET',
  quote = 'QUOTE',
}

@Entity('tweets')
export class TweetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 280 })
  text: string;

  @Column({
    name: 'tweet_type',
    enum: TweetType,
    type: 'enum',
    default: TweetType.normal,
  })
  tweetType: TweetType;

  @Column({ name: 'reference_tweet_id', nullable: true })
  referenceTweetId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @OneToMany(() => MediaEntity, (mediaEntity) => mediaEntity.tweet, {
    eager: true,
    cascade: true,
  })
  medias: Promise<Array<MediaEntity>>;

  @OneToMany(() => TweetEntity, (tweetEntity) => tweetEntity.referenceTweet)
  targetTweets: Promise<Array<TweetEntity>>;

  @ManyToOne(() => TweetEntity, (tweetEntity) => tweetEntity.targetTweets, {
    eager: true,
  })
  @JoinColumn({ name: 'reference_tweet_id' })
  referenceTweet: TweetEntity;

  @OneToMany(() => LikeEntity, (likeEntity) => likeEntity.tweet, {
    cascade: true,
  })
  likes: Promise<Array<LikeEntity>>;

  @ManyToOne(() => UserEntity, (user) => user.tweets, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

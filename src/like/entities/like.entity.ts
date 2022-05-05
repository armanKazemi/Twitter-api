import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TweetEntity } from '../../tweet/entities/tweet.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('likes')
export class LikeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tweet_id' })
  tweetId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @ManyToOne(() => TweetEntity, (tweetEntity) => tweetEntity.likes, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tweet_id' })
  tweet: TweetEntity;

  @ManyToOne(() => UserEntity, (user) => user.likes, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

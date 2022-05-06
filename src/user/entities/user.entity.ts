import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuthEntity } from '../../auth/entities/auth.entity';
import { MediaEntity } from '../../media/entities/media.entity';
import { FollowEntity } from '../../follow/entities/follow.entity';
import { TweetEntity } from '../../tweet/entities/tweet.entity';
import { LikeEntity } from '../../like/entities/like.entity';
import { Exclude } from 'class-transformer';

export enum Status {
  private = 'PRIVATE',
  public = 'PUBLIC',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  username: string;

  @Column()
  name: string;

  @Column()
  bio: string;

  @Column()
  location: string;

  @Column()
  link: string;

  @Column({ name: 'birth_day' })
  birthDay: Date;

  @Column({ enum: Status, type: 'enum', default: Status.public })
  status: Status;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Exclude()
  @Column({
    name: 'last_seen_of_timeline',
    comment: 'use for knowing start showing timeline tweets from what date.',
    nullable: true,
  })
  lastSeenOfTimeline: Date;

  @OneToOne(() => AuthEntity, (authEntity) => authEntity.userInfo, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'username', referencedColumnName: 'username' })
  authInfo: AuthEntity;

  @OneToMany(() => MediaEntity, (mediaEntity) => mediaEntity.user, {
    cascade: true,
  })
  medias: Promise<Array<MediaEntity>>;

  // user in followers / followings / pending users / blocked users list of other
  @OneToMany(() => FollowEntity, (followEntity) => followEntity.targetUser, {
    eager: false,
    cascade: true,
  })
  userLists: Promise<Array<FollowEntity>>;

  // followers / followings / pending users / blocked users list of user
  @OneToMany(() => FollowEntity, (followEntity) => followEntity.user, {
    eager: false,
    cascade: true,
  })
  targetList: Promise<Array<FollowEntity>>;

  @OneToMany(() => TweetEntity, (tweetEntity) => tweetEntity.user, {
    eager: false,
    cascade: true,
  })
  tweets: Promise<Array<FollowEntity>>;

  @OneToMany(() => LikeEntity, (likeEntity) => likeEntity.user, {
    eager: false,
    cascade: true,
  })
  likes: Promise<Array<LikeEntity>>;
}

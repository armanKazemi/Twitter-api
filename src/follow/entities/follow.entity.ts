import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum Status {
  follower = 'FOLLOWER',
  pending = 'PENDING',
  block = 'BLOCK',
}

@Entity('follow')
export class FollowEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ enum: Status, type: 'enum' })
  status: Status;

  @Column({ name: 'target_user_id' })
  targetUserId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  // Followers / Followings / pending users / block users of user
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.userLists, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: UserEntity;

  @ManyToOne(() => UserEntity, (userEntity) => userEntity.targetList, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

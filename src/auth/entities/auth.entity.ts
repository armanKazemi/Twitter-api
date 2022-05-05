import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'auth-table' })
export class AuthEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  username: string;

  @Index()
  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Index()
  @Column()
  email: string;

  @Exclude()
  @Column({ nullable: false })
  password: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (userEntity) => userEntity.authInfo, {
    eager: true,
    cascade: true,
  })
  userInfo: UserEntity;
}

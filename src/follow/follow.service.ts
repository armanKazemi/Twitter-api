import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FollowEntity,
  Status,
  Status as FollowStatus,
} from './entities/follow.entity';
import { getConnection, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { Status as UserStatus, UserEntity } from '../user/entities/user.entity';
import { TweetService } from '../tweet/tweet.service';

export enum RelationStatus {
  followFollow = 'FOLLOW_FOLLOW',
  followPending = 'FOLLOW_PENDING',
  followNone = 'FOLLOW_NONE',
  pendingFollow = 'PENDING_FOLLOW',
  pendingPending = 'PENDING_PENDING',
  pendingNone = 'PENDING_NONE',
  noneFollow = 'NONE_FOLLOW',
  nonePending = 'NONE_PENDING',
  noneNone = 'NONE_NONE',
  blockBlock = 'BLOCK_BLOCK',
  blockNone = 'BLOCK_NONE',
  noneBlock = 'NONE_BLOCK',
}

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>,
    private readonly userService: UserService,
    private readonly tweetService: TweetService,
  ) {}

  async getRelationStatus(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<string> {
    const requestingToTarget = await this.followRepository.findOne({
      where: {
        targetUserId: requestingUserId,
        userId: targetUserId,
      },
    });
    const targetToRequesting = await this.followRepository.findOne({
      where: {
        targetUserId: targetUserId,
        userId: requestingUserId,
      },
    });
    // noneNone
    if (
      // Relation requesting user to target user: none
      !requestingToTarget &&
      // Relation target user to requesting user: none
      !targetToRequesting
    ) {
      return RelationStatus.noneNone;
    } else if (!requestingToTarget && targetToRequesting) {
      // noneFollow
      if (
        // Relation requesting user to target user: none
        !requestingToTarget &&
        // Relation target user to requesting user: follow
        targetToRequesting.status === Status.follower
      ) {
        return RelationStatus.noneFollow;
      }
      // nonePending
      else if (
        // Relation requesting user to target user: none
        !requestingToTarget &&
        // Relation target user to requesting user: pending
        targetToRequesting.status === Status.pending
      ) {
        return RelationStatus.nonePending;
      }
      // blockNone
      else if (
        // Relation requesting user to target user: block
        targetToRequesting.status === Status.block &&
        // Relation target user to requesting user: none
        !requestingToTarget
      ) {
        return RelationStatus.blockNone;
      }
    } else if (requestingToTarget && !targetToRequesting) {
      // followNone
      if (
        // Relation requesting user to target user: follower
        requestingToTarget.status === Status.follower &&
        // Relation target user to requesting user: none
        !targetToRequesting
      ) {
        return RelationStatus.followNone;
      }
      // pendingNone
      else if (
        // Relation requesting user to target user: pending
        requestingToTarget.status === Status.pending &&
        // Relation target user to requesting user: none
        !targetToRequesting
      ) {
        return RelationStatus.pendingNone;
      }
      // noneBlock
      else if (
        // Relation requesting user to target user: none
        !targetToRequesting &&
        // Relation target user to requesting user: block
        requestingToTarget.status === Status.block
      ) {
        return RelationStatus.noneBlock;
      }
    } else {
      // followFollow
      if (
        // Relation requesting user to target user: follower
        requestingToTarget.status === Status.follower &&
        // Relation target user to requesting user: follower
        targetToRequesting.status === Status.follower
      ) {
        return RelationStatus.followFollow;
      }
      // followPending
      else if (
        // Relation requesting user to target user: follower
        requestingToTarget.status === Status.follower &&
        // Relation target user to requesting user: pending
        targetToRequesting.status === Status.pending
      ) {
        return RelationStatus.followPending;
      }
      // pendingFollow
      else if (
        // Relation requesting user to target user: pending
        requestingToTarget.status === Status.pending &&
        // Relation target user to requesting user: follow
        targetToRequesting.status === Status.follower
      ) {
        return RelationStatus.pendingFollow;
      }
      // pendingPending
      else if (
        // Relation requesting user to target user: pending
        requestingToTarget.status === Status.pending &&
        // Relation target user to requesting user: pending
        targetToRequesting.status === Status.pending
      ) {
        return RelationStatus.pendingPending;
      }
      // blockBlock
      else if (
        // Relation requesting user to target user: block
        targetToRequesting.status === Status.block &&
        // Relation target user to requesting user: block
        requestingToTarget.status === Status.block
      ) {
        return RelationStatus.blockBlock;
      }
    }
  }

  async getUserFollowers(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<UserEntity>> {
    // Check request user can see followers of target user or not
    const acceptableTargetUser =
      await this.tweetService.requestingUserIsAcceptableForTargetUser(
        requestingUserId,
        targetUserId,
      );
    if (!acceptableTargetUser) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    return getConnection()
      .createQueryRunner()
      .query(
        `SELECT users.id, username, name, bio FROM users 
                INNER JOIN follow ON 
                    users.id = follow.target_user_id 
                WHERE 
                    follow.status = '${FollowStatus.follower}' AND 
                    follow.user_id = ${targetUserId} 
                ORDER BY 
                    follow.created_at DESC 
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY `,
      );
  }

  async getUserFollowings(
    requestingUserId: number,
    targetUserId: number,
    page: number,
  ): Promise<Array<FollowEntity>> {
    // Check request user can see following of target user or not
    const acceptableTargetUser =
      await this.tweetService.requestingUserIsAcceptableForTargetUser(
        requestingUserId,
        targetUserId,
      );
    if (!acceptableTargetUser) {
      throw new ForbiddenException(`You are not allowed.`);
    }
    return getConnection()
      .createQueryRunner()
      .query(
        `SELECT user_id, username, name, bio FROM users 
                INNER JOIN follow ON 
                    users.id = follow.user_id 
                WHERE 
                    follow.status = '${FollowStatus.follower}' AND 
                    follow.target_user_id = ${targetUserId}
                ORDER BY 
                    follow.created_at DESC 
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY `,
      );
  }

  async getUserPendingFollowers(
    userId: number,
    page: number,
  ): Promise<Array<FollowEntity>> {
    return getConnection()
      .createQueryRunner()
      .query(
        `SELECT target_user_id, username, name, bio FROM users 
                INNER JOIN follow ON 
                    users.id = follow.target_user_id 
                WHERE 
                    follow.status = '${FollowStatus.pending}' AND 
                    follow.user_id = ${userId} 
                ORDER BY 
                    follow.created_at DESC 
                OFFSET ${page * 10} ROWS FETCH NEXT 10 ROWS ONLY `,
      );
  }

  async getUserFollowersCount(userId: number): Promise<number> {
    return this.followRepository.count({
      // User in following role (User)
      where: { userId: userId, status: FollowStatus.follower },
    });
  }

  async getUserFollowingsCount(userId: number): Promise<number> {
    return this.followRepository.count({
      // User in follower role (Target)
      where: { targetUserId: userId, status: FollowStatus.follower },
    });
  }

  async follow(requestingUserId: number, targetUserId: number): Promise<void> {
    // Check user don't follow himself/herself
    if (requestingUserId === targetUserId) {
      throw new BadRequestException(`You can't follow yourself.`);
    }
    const targetUser = await this.userService.getUserById(targetUserId);
    const notAllowed = await this.followRepository.find({
      where: [
        {
          // Check the user is not follower of target user
          status: FollowStatus.follower,
          targetUserId: requestingUserId,
          userId: targetUserId,
        },
        {
          // Check the user is not block (by target user)
          status: FollowStatus.block,
          targetUserId: requestingUserId,
          userId: targetUserId,
        },
        {
          // Check the target user is not block (by user)
          status: FollowStatus.block,
          targetUserId: targetUserId,
          userId: requestingUserId,
        },
        {
          // Check the user is not pending to accept
          status: FollowStatus.pending,
          targetUserId: requestingUserId,
          userId: targetUserId,
        },
      ],
    });
    if (notAllowed.length !== 0) {
      throw new BadRequestException('You are not allowed.');
    }
    // Create new follow entity
    const follow = new FollowEntity();
    // Current user is 'follower' / 'pending user' of 'target user'
    follow.userId = targetUserId;
    follow.targetUserId = requestingUserId;
    if (targetUser.status === UserStatus.public) {
      follow.status = FollowStatus.follower;
    } else {
      follow.status = FollowStatus.pending;
    }
    // Save relation
    await this.followRepository.save(follow);
  }

  async unfollow(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM follow
                WHERE
                    status = '${FollowStatus.follower}' AND
                    user_id = ${targetUserId} AND
                    target_user_id = ${requestingUserId}
                `,
      );
  }

  async unPending(
    requestingUserId: number,
    targetUserId: number,
  ): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM follow
                WHERE
                    status = '${FollowStatus.pending}' AND
                    user_id = ${targetUserId} AND
                    target_user_id = ${requestingUserId}
                `,
      );
  }

  async accept(requestingUserId: number, targetUserId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `UPDATE follow
                SET
                    status = '${FollowStatus.follower}'
                WHERE
                    status = '${FollowStatus.pending}' AND
                    user_id = ${requestingUserId} AND
                    target_user_id = ${targetUserId}
                `,
      );
  }

  async refuse(requestingUserId: number, targetUserId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM follow
                WHERE
                    status = '${FollowStatus.pending}' AND
                    user_id = ${requestingUserId} AND
                    target_user_id = ${targetUserId}
                `,
      );
  }

  async block(requestingUserId: number, targetUserId: number): Promise<void> {
    // Check user don't block himself
    if (requestingUserId === targetUserId) {
      throw new BadRequestException(`You can't block yourself.`);
    }
    const notAllowed = await this.followRepository.find({
      where: [
        {
          // Check the user is not block (by target user)
          status: FollowStatus.block,
          targetUserId: requestingUserId,
          userId: targetUserId,
        },
        {
          // Check the target user is not block (by user)
          status: FollowStatus.block,
          targetUserId: targetUserId,
          userId: requestingUserId,
        },
      ],
    });

    if (notAllowed.length !== 0) {
      throw new BadRequestException('You are not allowed.');
    }
    // Delete some relation
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM follow WHERE 
                    status = '${FollowStatus.follower}' AND 
                    target_user_id = ${requestingUserId} AND 
                    user_id = ${targetUserId} 
               OR 
                    status = '${FollowStatus.pending}' AND 
                    target_user_id = ${requestingUserId} AND 
                    user_id = ${targetUserId} 
               OR 
                    status = '${FollowStatus.follower}' AND 
                    target_user_id = ${targetUserId} AND 
                    user_id = ${requestingUserId} 
               OR 
                    status = '${FollowStatus.pending}' AND 
                    target_user_id = ${targetUserId} AND 
                    user_id = ${requestingUserId}`,
      );
    // Create block relation
    const relation = new FollowEntity();
    relation.status = FollowStatus.block;
    relation.userId = requestingUserId;
    relation.targetUserId = targetUserId;
    // Save relation
    await this.followRepository.save(relation);
  }

  async unblock(requestingUserId: number, targetUserId: number): Promise<void> {
    await getConnection()
      .createQueryRunner()
      .manager.query(
        `DELETE FROM follow
                WHERE
                    status = '${FollowStatus.block}' AND
                    user_id = ${requestingUserId} AND
                    target_user_id = ${targetUserId}
                `,
      );
  }
}

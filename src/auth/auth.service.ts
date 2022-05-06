import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthEntity } from './entities/auth.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthDto, SignUpMethod } from './dtos/auth.dto';
import { SignInDto, SignInMethod } from './dtos/signIn.dto';
import { UpdatePasswordDto } from './dtos/updatePassword.dto';
import { AccountDto } from './dtos/account.dto';
import { DeleteAccountDto } from './dtos/deleteAccount.dto';
import * as argon2 from 'argon2';
import { UserEntity } from '../user/entities/user.entity';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async getAuthInfoById(authId: number): Promise<AuthEntity> {
    const authInfo = this.authRepository.findOne({ where: { id: authId } });
    if (!authInfo) {
      throw new NotFoundException('There is no any info about current id.');
    }
    return authInfo;
  }

  async getAuthInfoByUsername(username: string): Promise<AuthEntity> {
    const authInfo = this.authRepository.findOne({
      where: { username: username },
    });
    if (!authInfo) {
      throw new NotFoundException(
        'There is no any info about current username.',
      );
    }
    return authInfo;
  }

  async signUp(authDto: AuthDto): Promise<void> {
    const {
      username,
      signUpMethod,
      phoneNumber,
      email,
      password,
      name,
      birthDay,
    } = authDto;

    // Check sign up method be correct
    if (
      (signUpMethod === SignUpMethod.phoneNumber && !phoneNumber) ||
      (signUpMethod === SignUpMethod.email && !email)
    ) {
      throw new BadRequestException(`${signUpMethod} can't be empty.`);
    }

    if (signUpMethod === SignUpMethod.phoneNumber) {
      // Check duplication of username/phoneNumber
      const alreadyExistPhoneNumber = await this.authRepository.findOne({
        where: [{ username: username }, { phoneNumber: phoneNumber }],
      });
      if (alreadyExistPhoneNumber) {
        throw new ConflictException('Username or PhoneNumber already exist.');
      }
    } else if (signUpMethod === SignUpMethod.email) {
      // Check duplication of username/email
      const alreadyExistEmail = await this.authRepository.findOne({
        where: [{ username: username }, { email: email }],
      });

      if (alreadyExistEmail) {
        throw new ConflictException('Username or Email already exist.');
      }
    }

    // Create new userEntity
    const newUserInfo = new UserEntity();
    newUserInfo.name = name;
    newUserInfo.birthDay = birthDay;
    newUserInfo.bio = '';
    newUserInfo.link = '';
    newUserInfo.location = '';

    // Create new authEntity
    const newAuthInfo = new AuthEntity();
    newAuthInfo.username = username;
    newAuthInfo.phoneNumber = phoneNumber || '';
    newAuthInfo.email = email || '';
    newAuthInfo.password = await argon2.hash(password);
    newAuthInfo.userInfo = newUserInfo;

    // Save authInfo
    await this.authRepository.save(newAuthInfo);
  }

  async signIn(signInDto: SignInDto): Promise<string> {
    const { signInMethod, username, phoneNumber, email, password } = signInDto;

    // Check sign in method be correct
    if (
      (signInMethod === SignInMethod.username && !username) ||
      (signInMethod === SignInMethod.phoneNumber && !phoneNumber) ||
      (signInMethod === SignInMethod.email && !email)
    ) {
      throw new BadRequestException(`${signInMethod} can't be empty.`);
    }

    // Check username/phoneNumber/email exists.
    const auth = await this.authRepository.findOne({
      where: [
        { username: username },
        { phoneNumber: phoneNumber },
        { email: email },
      ],
    });
    if (!auth) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    // Check password validation
    const passwordIsValid = await argon2.verify(auth.password, password);
    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Create token (expired: 1 hour)
    const payload: JwtPayload = { username: auth.username };
    return this.jwtService.sign(payload);
  }

  async updateAccountInfo(
    usernameFromJwt: string,
    accountDto: AccountDto,
  ): Promise<void> {
    const { username, phoneNumber, email } = accountDto;

    // Get current authInfo
    const authInfo = await this.authRepository.findOne({
      where: { username: usernameFromJwt },
    });

    // Check username difference and not duplicated
    if (username && username !== authInfo.username) {
      const alreadyExistsUsername = await this.authRepository.findOne({
        where: { username: username },
      });
      if (alreadyExistsUsername) {
        throw new BadRequestException('Username already exists.');
      }
    }

    // Check phoneNumber/email difference and not duplicated
    if (!phoneNumber && !email) {
      throw new BadRequestException('PhoneNumber or Email can not be empty.');
    } else if (email && email !== authInfo.email) {
      const alreadyExistsEmail = await this.authRepository.findOne({
        where: { email: email },
      });
      if (alreadyExistsEmail) {
        throw new BadRequestException('Email already exists.');
      }
    } else if (phoneNumber && phoneNumber !== authInfo.phoneNumber) {
      const alreadyExistsPhoneNumber = await this.authRepository.findOne({
        where: { phoneNumber: phoneNumber },
      });
      if (alreadyExistsPhoneNumber) {
        throw new BadRequestException('PhoneNumber already exists.');
      }
    } else {
      if (username && username === authInfo.username) {
        // There is nothing to change
        return;
      }
    }

    // Update fields
    authInfo.username = username;
    authInfo.phoneNumber = phoneNumber || '';
    authInfo.email = email || '';

    // Save changes
    await this.authRepository.save(authInfo);
  }

  async updatePassword(
    username: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<string> {
    const { currentPassword, newPassword } = updatePasswordDto;

    // Get authInfo
    const authInfo = await this.authRepository.findOne({
      where: { username: username },
    });

    // Check current password validation
    const passwordIsValid = await argon2.verify(
      authInfo.password,
      currentPassword,
    );
    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Change password
    authInfo.password = await argon2.hash(newPassword);

    // Save authInfo
    await this.authRepository.save(authInfo);

    // Create new token
    const payload: JwtPayload = { username: authInfo.username };
    return this.jwtService.sign(payload);
  }

  async deleteAccount(
    usernameFromJwt: string,
    deleteAccountDto: DeleteAccountDto,
  ): Promise<void> {
    const { username, currentPassword } = deleteAccountDto;

    // Check username validation
    if (usernameFromJwt !== username) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Get authInfo
    const authInfo = await this.authRepository.findOne({
      where: { username: username },
    });

    // Check current password validation
    const passwordIsValid = await argon2.verify(
      authInfo.password,
      currentPassword,
    );
    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Delete account (user entity will be deleted cascade)
    await this.authRepository.remove(authInfo);
  }
}

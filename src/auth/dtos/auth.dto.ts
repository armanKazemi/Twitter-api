import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../decorators/match.decorator';

export enum SignUpMethod {
  phoneNumber = 'PHONE_NUMBER',
  email = 'EMAIL',
}

export class AuthDto {
  @IsString()
  @Matches(/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z\d._]+(?<![_.])$/, {
    message: 'username is invalid',
  })
  username: string;

  @IsEnum(SignUpMethod)
  signUpMethod: SignUpMethod;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Match('password', {
    message: 'Confirm password is different.',
  })
  confirmPassword: string;

  @IsString()
  name: string;

  @IsDateString()
  birthDay: Date;
}

import {
  IsDateString,
  IsEmail,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class SignUpDto {
  @IsString()
  @Matches(/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z\d._]+(?<![_.])$/, {
    message: 'username is invalid',
  })
  username: string;

  @IsPhoneNumber()
  phoneNumber: string;

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

import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class PasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Match('currentPassword', {
    message: 'Confirm password is different.',
  })
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Match('currentPassword', {
    message: 'Confirm password is different.',
  })
  confirmNewPassword: string;
}

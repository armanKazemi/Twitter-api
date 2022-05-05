import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match, UnMatch } from '../decorators/match.decorator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Invalid credentials.',
  })
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Invalid credentials.',
  })
  @UnMatch('currentPassword', {
    message: `New password can't be same as current.`,
  })
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Match('newPassword', {
    message: 'Confirm password is different.',
  })
  confirmNewPassword: string;
}

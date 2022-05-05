import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Matches(/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z\d._]+(?<![_.])$/, {
    message: 'Invalid credentials.',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Invalid credentials.',
  })
  currentPassword: string;
}

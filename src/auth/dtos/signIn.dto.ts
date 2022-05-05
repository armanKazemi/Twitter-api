import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum SignInMethod {
  username = 'USERNAME',
  phoneNumber = 'PHONE_NUMBER',
  email = 'EMAIL',
}

export class SignInDto {
  @IsEnum(SignInMethod)
  signInMethod: SignInMethod;

  @IsOptional()
  @IsString()
  @Matches(/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z\d._]+(?<![_.])$/, {
    message: 'Invalid credentials.',
  })
  username: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Invalid credentials.',
  })
  password: string;
}

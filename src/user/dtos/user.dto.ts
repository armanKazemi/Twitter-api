import { IsDateString, IsString } from 'class-validator';

export class UserDto {
  @IsString()
  name: string;

  @IsString()
  bio: string;

  @IsString()
  location: string;

  @IsString()
  link: string;

  @IsDateString()
  birthDay: Date;
}

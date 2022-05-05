import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthDto } from './dtos/auth.dto';
import { SignInDto } from './dtos/signIn.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UpdatePasswordDto } from './dtos/updatePassword.dto';
import { GetCurrentUser } from '../user/decorator/getCurrentUser.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { AccountDto } from './dtos/account.dto';
import { DeleteAccountDto } from './dtos/deleteAccount.dto';
import { AuthEntity } from './entities/auth.entity';

@ApiBearerAuth()
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/:id')
  @ApiOperation({ summary: 'Get authentication info of user. (by id)' })
  getAuthInfoById(@Param('id') id: string): Promise<AuthEntity> {
    return this.authService.getAuthInfoById(+id);
  }

  // TODO ask
  @Get('/@:username')
  @ApiOperation({ summary: 'Get authentication info of user. (by username)' })
  getAuthInfoByUsername(
    @Param('username') username: string,
  ): Promise<AuthEntity> {
    return this.authService.getAuthInfoByUsername(username);
  }

  @Post('/signup')
  @ApiOperation({ summary: 'Sign up as a new user.' })
  signUp(@Body() authDto: AuthDto): Promise<void> {
    return this.authService.signUp(authDto);
  }

  @Post('/signIn')
  @ApiOperation({ summary: 'SignIn' })
  signIn(@Body() signInDto: SignInDto): Promise<string> {
    return this.authService.signIn(signInDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('/update')
  @ApiOperation({ summary: 'Update password.' })
  updateAccountInfo(
    @Body() accountDto: AccountDto,
    @GetCurrentUser() user: UserEntity,
  ): Promise<void> {
    return this.authService.updateAccountInfo(user.username, accountDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/updatePassword')
  @ApiOperation({ summary: 'Update password.' })
  updatePassword(
    @Body() passwordDto: UpdatePasswordDto,
    @GetCurrentUser() user: UserEntity,
  ): Promise<string> {
    return this.authService.updatePassword(user.username, passwordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/delete')
  @ApiOperation({ summary: 'Delete account.' })
  deleteAccount(
    @Body() deleteAccountDto: DeleteAccountDto,
    @GetCurrentUser() user: UserEntity,
  ): Promise<void> {
    return this.authService.deleteAccount(user.username, deleteAccountDto);
  }
}

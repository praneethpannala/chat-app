import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('save')
  async saveUser(
    @Body() body: {
      uid: string;
      name: string;
      email: string;
      photoURL: string;
    },
  ) {
    return this.usersService.saveUser(
      body.uid,
      body.name,
      body.email,
      body.photoURL,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllUsers(@Req() req: any) {
    return this.usersService.getAllUsers(req.user.uid);
  }
}
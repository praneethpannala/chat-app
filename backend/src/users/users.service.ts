import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async saveUser(uid: string, name: string, email: string, photoURL: string) {
    return this.userModel.findOneAndUpdate(
      { uid },
      { uid, name, email, photoURL },
      { upsert: true, new: true },
    );
  }

  async getAllUsers(currentUid: string) {
    return this.userModel.find({ uid: { $ne: currentUid } });
  }

  async getUserByUid(uid: string) {
    return this.userModel.findOne({ uid });
  }
}
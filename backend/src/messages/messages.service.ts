import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  async saveMessage(senderId: string, receiverId: string, text: string) {
    const message = new this.messageModel({ senderId, receiverId, text });
    return message.save();
  }

  async getMessages(senderId: string, receiverId: string) {
    return this.messageModel
      .find({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      })
      .sort({ createdAt: 1 });
  }

  async clearChat(senderId: string, receiverId: string): Promise<any> {
    return this.messageModel.deleteMany({ senderId, receiverId });
  }

  async updateStatus(messageId: string, status: string): Promise<any> {
    return this.messageModel.findByIdAndUpdate(messageId, { status });
  }
}
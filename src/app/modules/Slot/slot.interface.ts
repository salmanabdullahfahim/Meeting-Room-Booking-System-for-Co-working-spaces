import { Types } from 'mongoose';

export type TSlot = {
  room: Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

export type TSlotQuery = {
  date?: string;
  roomId?: string;
};

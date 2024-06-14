import { startSession } from 'mongoose';
import { TBooking } from './booking.interface';
import { Booking } from './booking.model';
import { Room } from '../Room/room.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { User } from '../User/user.model';
import { Slot } from '../Slot/slot..model';

const createBookingIntoDB = async (
  payload: Omit<TBooking, 'totalAmount'>,
): Promise<TBooking> => {
  const { room, slots, user, isConfirmed, date } = payload;

  const session = await startSession();
  session.startTransaction();

  try {
    const roomInfo = await Room.findById(room).session(session);
    if (!roomInfo) {
      throw new Error('Room not found');
    }

    const isRoomDeleted = roomInfo?.isDeleted;

    if (isRoomDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, 'Room is deleted!');
    }

    const userInfo = await User.findOne({ _id: user, role: 'user' }).session(
      session,
    );
    if (!userInfo) {
      throw new Error('User not found');
    }

    // Check if slots array is null or empty
    if (!(slots?.length ?? false)) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Slots cannot be empty');
    }

    const slotDocuments = await Slot.find({
      _id: { $in: slots },
      room,
      isBooked: false,
    });
    if (slotDocuments.length !== slots.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'One or more slots are already booked or do not exist',
      );
    }

    const pricePerSlot = roomInfo.pricePerSlot;
    const totalAmount = slots.length * pricePerSlot;

    const booking = await Booking.create(
      [
        {
          room,
          date,
          slots,
          user,
          totalAmount,
          isConfirmed,
        },
      ],
      { session },
    );

    if (!booking.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create booking');
    }

    const slotUpdate = await Slot.updateMany(
      { _id: { $in: slots } },
      { isBooked: true },
      { session },
    );

    if (!slotUpdate) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create update slot',
      );
    }

    await session.commitTransaction();
    await session.endSession();

    const slotsDetail = await Promise.all(
      [...slots].map((slot) => Slot.findById(slot).exec()),
    );

    const populatedBooking = await Booking.findById(booking[0]._id)
      .populate('room')
      .populate({
        path: 'user',
        select: '-password -__v',
      })
      .exec();

    // @ts-ignore
    populatedBooking.slots = slotsDetail;

    return populatedBooking as TBooking;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create booking');
  }
};

export const bookingService = {
  createBookingIntoDB,
};

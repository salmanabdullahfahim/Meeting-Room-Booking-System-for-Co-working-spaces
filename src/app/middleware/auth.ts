import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import { TUserRole } from '../modules/User/user.interface';
import { User } from '../modules/User/user.model';

const auth = (...RequiredRole: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers.authorization;
    // check if the token is provided by the client
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You Are Not Authorized');
    }

    // Extract the token from the "Bearer <token>" format
    const token = authorizationHeader.split(' ')[1];

    // check if the token is valid
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload;
    } catch (error) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Token');
    }

    const { email, role } = decoded;

    // checking if the user exists
    const user = await User.isUserExistsByEmail(email);
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
    }

    // checking if the user has the required role
    if (RequiredRole && !RequiredRole.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You Are Not Authorized');
    }

    // attaching the decoded token to the request object
    req.user = decoded;
    next();
  });
};

export default auth;

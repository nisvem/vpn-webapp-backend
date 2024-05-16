import { Request, Response, NextFunction } from 'express';
import { OutlineVPN } from 'outlinevpn-api';

import User, { IUser } from '../models/user';
import Key, { IKey } from '../models/key';
import { IServer } from '../models/server';
import { HydratedDocument } from 'mongoose';

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const checkAccessAdmin: Middleware = async (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'];
  const user = await User.findOne({ telegramId: telegramId }, 'isAdmin');

  if (!user) throw new Error("The user doesn't exist.");

  if (user.isAdmin) {
    next();
  } else {
    res.status(403).json({
      error: 'Access is denied!',
    });
  }
};

export const checkAccess: Middleware = async (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'];

  if (telegramId) {
    next();
  } else {
    res.status(403).json({
      error: {
        message: 'Access is denied without telegramId!',
      },
    });
  }
};

export const checkLimitedToCreate: Middleware = async (req, res, next) => {
  try {
    const user = await User.findOne(
      {
        telegramId: req.headers['x-telegram-id'],
      },
      'isLimitedToCreate'
    );

    if (!user) throw new Error("The user doesn't exist.");

    if (!user.isLimitedToCreate) {
      next();
    } else {
      res.status(403).json({
        error: 'Access is denied!',
      });
    }
  } catch {
    res.status(403).json({
      error: 'Something wrong!',
    });
  }
};

export async function isHaveAccess(
  telegramId: string,
  key: HydratedDocument<IKey>
) {
  const user = await User.findOne({ telegramId: telegramId });
  if (!user) throw new Error("The user doesn't exist.");

  return user.isAdmin || key.user.telegramId === telegramId;
}

export async function checkOpenToRegister(
  user: HydratedDocument<IUser>,
  server: HydratedDocument<IServer>
) {
  const outlinevpn = new OutlineVPN({
    apiUrl: server.URL,
    fingerprint: server.FINGERPRINT,
  });

  const usersInOutlineServer = await outlinevpn.getUsers();

  server.nowUsers = usersInOutlineServer.length;
  server.isOpenToRegister = !!(usersInOutlineServer.length < server.limitUsers);
  user.isLimitedToCreate = !!(user.keys.length >= user.maxKeyAvalible);

  await user.save();
  await server.save();
}

export async function disableKey(id: string) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  await outlinevpn.disableUser(key.id);
  key.isOpen = false;

  await key.save();

  return key;
}

export async function enableKey(id: string) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  await outlinevpn.enableUser(key.id);
  key.isOpen = true;

  await key.save();

  return key;
}

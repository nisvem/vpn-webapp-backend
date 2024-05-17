import { Request, Response, NextFunction } from 'express';
import { OutlineVPN } from 'outlinevpn-api';
import { bot } from '../bot';
import User, { IUser } from '../models/user';
import Key, { IKey } from '../models/key';
import { IServer } from '../models/server';
import { HydratedDocument } from 'mongoose';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import { ObjectId } from 'mongodb';
import date from 'date-and-time';

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const checkAccessApp: Middleware = async (req, res, next) => {
  const key = req.headers['x-access-code'];
  if (key && key === process.env.ACCESS_KEY) {
    next();
  } else {
    console.log('Access is denied!');
    res.status(403).json({
      error: 'Access is denied!',
    });
  }
};
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

export async function disableKey(id: ObjectId) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  try {
    await outlinevpn.addDataLimit(key.id, 0);
    await bot.api.sendMessage(
      key.user.telegramId,
      `Your key <b>"${key.name}"</b> 🗝️ for server <b>"${key.server.name} (${
        key.server.country
      } ${getUnicodeFlagIcon(
        key.server.abbreviatedCountry
      )})"</b> has been deactivated ⛔️.`,
      {
        parse_mode: 'HTML',
      }
    );
  } catch (e) {
    console.log(e);
  }

  key.isOpen = false;
  await key.save();

  return key;
}

export async function enableKey(id: ObjectId) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  try {
    await bot.api.sendMessage(
      key.user.telegramId,
      `Your key <b>"${key.name}"</b> 🗝️ for server <b>"${key.server.name} (${
        key.server.country
      } ${getUnicodeFlagIcon(
        key.server.abbreviatedCountry
      )})"</b> has been activated ✅.`,
      {
        parse_mode: 'HTML',
      }
    );
  } catch (e) {
    console.log(e);
  }

  await outlinevpn.enableUser(key.id);
  key.isOpen = true;

  await key.save();

  return key;
}

import { Request, Response, NextFunction } from 'express';
import { OutlineVPN } from 'outlinevpn-api';
import { bot } from '../bot/bot';
import User, { IUser } from '../models/user';
import Key, { IKey } from '../models/key';
import { IServer } from '../models/server';
import { HydratedDocument } from 'mongoose';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import { ObjectId } from 'mongodb';
import net from 'net';
import i18next from '../lang';

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
}

export const dataLimitWhenDisable = 1;

export const checkAccessApp: Middleware = async (req, res, next) => {
  const key = req.headers['x-access-code'];
  if (key && key === process.env.ACCESS_KEY) {
    next();
  } else {
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
  try {
    const outlinevpn = new OutlineVPN({
      apiUrl: server.URL,
      fingerprint: server.FINGERPRINT,
    });

    const usersInOutlineServer = await outlinevpn.getUsers();

    server.nowUsers = usersInOutlineServer.length;
    server.isOpenToRegister = !!(
      usersInOutlineServer.length < server.limitUsers
    );
    user.isLimitedToCreate = !!(user.keys.length >= user.maxKeyAvalible);

    if (!server.isOpenToRegister) {
      const userAdmin = await User.find({ isAdmin: true });
      userAdmin.forEach((user) => {
        bot.api.sendMessage(user.id, `Server ${server.name} is full!`);
      });
    }

    await user.save();
    await server.save();
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function disableKey(id: ObjectId) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  i18next.changeLanguage(key.user?.lang || 'en');

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  try {
    await outlinevpn.addDataLimit(key.id, dataLimitWhenDisable);
    await bot.api.sendMessage(
      key.user.telegramId,
      i18next.t('key_deactivated', {
        name: key.name,
        server: `"${key.server.name} (${
          key.server.country
        } ${getUnicodeFlagIcon(key.server.abbreviatedCountry)})"`,
      }),
      {
        parse_mode: 'HTML',
      }
    );
  } catch (e) {
    console.error(e);
  }

  key.isOpen = false;
  await key.save();

  return key;
}

export async function enableKey(id: ObjectId) {
  const key = await Key.findById(id).populate('user server').exec();

  if (!key) throw new Error("The key doesn't exist.");

  i18next.changeLanguage(key.user?.lang || 'en');

  const outlinevpn = new OutlineVPN({
    apiUrl: key.server.URL,
    fingerprint: key.server.FINGERPRINT,
  });

  try {
    await bot.api.sendMessage(
      key.user.telegramId,
      i18next.t('key_activated', {
        name: key.name,
        server: `"${key.server.name} (${
          key.server.country
        } ${getUnicodeFlagIcon(key.server.abbreviatedCountry)})"`,
      }),
      {
        parse_mode: 'HTML',
      }
    );
  } catch (e) {
    console.error(e);
  }

  await outlinevpn.enableUser(key.id);
  key.isOpen = true;

  await key.save();

  return key;
}

async function isPortAvailable(remoteHost: string, port: number) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(100);

    socket.on('connect', () => {
      socket.destroy();
      resolve(false); // Open port
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(true); // Сlosed port
    });

    socket.on('error', (err: ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(true); //  Open port
      } else {
        resolve(false); // Сlosed port
      }
    });

    socket.connect(port, remoteHost);
  });
}

export async function findAvailablePort(
  remoteHost: string,
  startPort: number,
  endPort: number
) {
  for (let port = startPort; port <= endPort; port++) {
    const available = await isPortAvailable(remoteHost, port);
    if (available) {
      return port;
    }
  }
  throw new Error('Available port for creating Key not found.');
}

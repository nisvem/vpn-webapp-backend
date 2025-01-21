import * as cron from 'cron';
import date from 'date-and-time';

import {
  checkOpenToRegister,
  dataLimitWhenDisable,
  sendMessage,
} from './helpers';

import { OutlineVPN } from 'outlinevpn-api';
import User from '../models/user';
import Key, { IKey } from '../models/key';
import Server from '../models/server';
import { HydratedDocument } from 'mongoose';
import i18next from '../lang';
import { logger } from './logger';
import { keysKeyboard } from './keyboards';

async function disableKey(key: HydratedDocument<IKey>) {
  try {
    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    await outlinevpn.addDataLimit(key.id, dataLimitWhenDisable);
    key.isOpen = false;

    logger.info(`Key ${key.name} of ${key.user.telegramId} disabled`);
    await key.save();
  } catch (error: any) {
    logger.error(
      `KeyID: ${key.id}, Function: disableKey(), Error: ${error.message} `
    );
    throw new Error(error.message);
  }
}

async function deleteKey(key: HydratedDocument<IKey>) {
  try {
    const user = await User.findById(key.user._id).populate('keys').exec();
    const server = await Server.findById(key.server._id)
      .populate('keys')
      .exec();

    if (!server) throw new Error("The server doesn't exist.");
    if (!user) throw new Error("The user doesn't exist.");

    try {
      const outlinevpn = new OutlineVPN({
        apiUrl: server.URL,
        fingerprint: server.FINGERPRINT,
      });
      await outlinevpn.deleteUser(key.id);
    } catch {
      logger.error(`The server doesn't exist -> ${server.URL}`);
    }

    user.keys = user.keys.filter((item) => key._id != item._id);
    server.keys = server.keys.filter((item) => key._id != item._id);

    await Key.findByIdAndDelete(key._id);
    await user.save();
    await server.save();

    await checkOpenToRegister(user, server);

    logger.info(`Key ${key.name} of ${key.user.telegramId} deleted`);
  } catch (error: any) {
    logger.error(
      `KeyID: ${key.id}, Function: deleteKey(), Error: ${error.message} `
    );
    throw new Error(error.message);
  }
}

async function startCron() {
  new cron.CronJob(
    '*/10 * * * *',
    async () => {
      try {
        logger.debug(`Cron started`);
        const keys = await Key.find()
          .populate({
            path: 'server',
            model: 'server',
          })
          .populate({
            path: 'user',
            model: 'user',
          })
          .exec();
        if (!keys) {
          logger.error(`Cron have started and something wrong with KEYS!`);
          throw new Error('Something wrong with KEYS!');
        }
        keys.forEach(async (key) => {
          try {
            await checkExpiredKeys(key);
          } catch (error: any) {
            logger.error(
              `KeyID: ${key.id}, Function: checkExpiredKeys(), Error: ${error.message} `
            );
          }
        });
        logger.debug(`Cron finished successful`);
      } catch (error: any) {
        logger.error(`Cron finished unsuccessful, error: ${error.message}`);
      }
    },
    null,
    true
  );
}

async function checkExpiredKeys(key: HydratedDocument<IKey>) {
  i18next.changeLanguage(key.user?.lang || 'en');

  if (!key.status) {
    if (key.isOpen && key.nextPayment > new Date()) {
      key.status = 'active';
      await key.save();
    } else {
      key.status = 'expired';
      await key.save();
    }
  }

  const daysUntilExpiration = Number(
    date.subtract(key.nextPayment, new Date()).toDays().toFixed(0)
  );

  if (daysUntilExpiration > 1 && key.status === 'active') return;

  // Проверка, было ли уже отправлено уведомление сегодня
  const alreadyNotifiedToday = key.lastNotification
    ? date.isSameDay(key.lastNotification, new Date())
    : false;

  // Уведомление: ключ истекает завтра
  if (
    daysUntilExpiration === 1 &&
    key.status === 'active' &&
    !alreadyNotifiedToday
  ) {
    await sendMessage(
      key.user.telegramId,
      i18next.t('key_will_expired_and_deactivated', {
        name: key.name,
        date: date.format(key.nextPayment, 'DD/MM/YYYY'),
      }),
      keysKeyboard
    );

    key.status = 'expiresTomorrow';
    key.lastNotification = new Date();

    await key.save();
    return;
  }

  // Удаление ключа: истек 3 дня назад или ранее
  if (
    daysUntilExpiration < -3 &&
    key.status === 'willBeDeletedTomorrow' &&
    !alreadyNotifiedToday
  ) {
    await deleteKey(key);
    await sendMessage(
      key.user.telegramId,
      i18next.t('key_expired_and_delete', {
        name: key.name,
        date: date.format(key.nextPayment, 'DD/MM/YYYY'),
      }),
      keysKeyboard
    );

    return;
  }

  // Уведомление: ключ истек и будет удален завтра
  if (
    daysUntilExpiration <= -2 &&
    key.status === 'expired' &&
    !alreadyNotifiedToday
  ) {
    await sendMessage(
      key.user.telegramId,
      i18next.t('key_expired_and_will_be_deleted', {
        name: key.name,
        date: date.format(key.nextPayment, 'DD/MM/YYYY'),
      }),
      keysKeyboard
    );

    key.status = 'willBeDeletedTomorrow';
    key.lastNotification = new Date();

    await key.save();
    return;
  }

  // Деактивация ключа: истек
  if (daysUntilExpiration <= 0 && (!key.status || key.status === 'expiresTomorrow' || key.status==='active') && !alreadyNotifiedToday) {
    await disableKey(key);
    await sendMessage(
      key.user.telegramId,
      i18next.t('key_expired', {
        name: key.name,
        date: date.format(key.nextPayment, 'DD/MM/YYYY'),
      }),
      keysKeyboard
    );

    key.status = 'expired';
    key.lastNotification = new Date();

    await key.save();
  }
}

// active
// expiresTomorrow
// expired
// willBeDeletedTomorrow

// none -

export default startCron;

import * as cron from 'cron';
import date from 'date-and-time';

import { checkOpenToRegister, dataLimitWhenDisable } from './helpers';

import { OutlineVPN } from 'outlinevpn-api';
import { bot } from '../bot';
import User from '../models/user';
import Key, { IKey } from '../models/key';
import Server from '../models/server';
import { HydratedDocument } from 'mongoose';

async function checkExpiredKeys(key: HydratedDocument<IKey>) {
  if (key.nextPayment < new Date()) {
    console.log(
      `- Key "${key.name}" (${key._id}) of @${key.user.name} (${
        key.user.telegramId
      }) is expired (${date.format(key.nextPayment, 'DD/MM/YYYY HH:mm:ss')})`
    );

    if (key.isOpen) {
      await disableKey(key);

      await bot.api.sendMessage(
        key.user.telegramId,
        `Your Key "${key.name}"\xA0🔑 is expired (${date.format(
          key.nextPayment,
          'DD/MM/YYYY'
        )}). To reactivate Key, please make a payment.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Keys 🔑',
                  web_app: {
                    url: process.env.URL_WEBAPP || '',
                  },
                },
              ],
            ],
          },
        }
      );

      console.log(`Key ${key._id} has disabled!`);
    }

    const week = 1000 * 60 * 60 * 24 * 7;

    if (new Date().getTime() - key.nextPayment.getTime() > week) {
      await daleteKey(key);

      await bot.api.sendMessage(
        key.user.telegramId,
        `Your Key "${key.name}"\xA0🔑 has expired (${date.format(
          key.nextPayment,
          'DD/MM/YYYY'
        )}) and has been deleted\xA0🗑️. To create new Key click on the menu on the sidebar\xA0🔑, or click here to access the web app\xA0👇.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔑 Keys',
                  web_app: {
                    url: process.env.URL_WEBAPP || '',
                  },
                },
              ],
            ],
          },
        }
      );

      console.log(`Key ${key._id} has deleted!`);
    }
  } else {
    console.log(
      `- Key "${key.name}" (${key._id}) of @${key.user.name} (${
        key.user.telegramId
      }) is not expired (${date.format(
        key.nextPayment,
        'YYYY/MM/DD HH:mm:ss'
      )})`
    );
  }
}

async function disableKey(key: HydratedDocument<IKey>) {
  try {
    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    await outlinevpn.addDataLimit(key.id, dataLimitWhenDisable);
    key.isOpen = false;

    await key.save();
  } catch (error: any) {
    throw new Error(error);
  }
}

async function daleteKey(key: HydratedDocument<IKey>) {
  try {
    const user = await User.findById(key.user._id).populate('keys').exec();
    const server = await Server.findById(key.server._id)
      .populate('keys')
      .exec();

    if (!server) throw new Error("The server doesn't exist.");
    if (!user) throw new Error("The user doesn't exist.");

    const outlinevpn = new OutlineVPN({
      apiUrl: server.URL,
      fingerprint: server.FINGERPRINT,
    });

    user.keys = user.keys.filter((item) => key._id != item._id);
    server.keys = server.keys.filter((item) => key._id != item._id);

    await outlinevpn.deleteUser(key.id);
    await checkOpenToRegister(user, server);
    await Key.findByIdAndDelete(key._id);
  } catch (error: any) {
    throw new Error(error);
  }
}

async function startCron() {
  new cron.CronJob(
    '0 * * * *',
    async () => {
      console.log(
        `Cron started at ${date.format(new Date(), 'DD/MM/YYYY HH:mm:ss')}`
      );

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

      if (!keys) throw new Error('Something wrong with KEYS!');

      keys.forEach(async (key) => {
        try {
          await checkExpiredKeys(key);
        } catch (error: any) {
          throw new Error(error);
        }
      });

      console.log(
        `Cron finished at ${date.format(new Date(), 'DD/MM/YYYY HH:mm:ss')}`
      );
    },
    null,
    true
  );
}

export default startCron;

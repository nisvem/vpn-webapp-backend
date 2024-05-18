import { Router } from 'express';
import { OutlineVPN } from 'outlinevpn-api';
import {
  isHaveAccess,
  checkOpenToRegister,
  checkLimitedToCreate,
  checkAccess,
  checkAccessAdmin,
  disableKey,
  enableKey,
  checkAccessApp,
} from './helpers/helpers.js';
import { bot } from './bot.js';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

import date from 'date-and-time';

import User from './models/user';
import Key from './models/key';
import Server from './models/server';
import Tariff from './models/tariff';
import mongoose, { Error } from 'mongoose';
import { createPayment } from './helpers/payment';

const routerApp = Router();
routerApp.use(checkAccessApp);
//  GET

routerApp.get('/getTariffs', checkAccess, async (req, res) => {
  try {
    const tariffs = await Tariff.find();
    res.json(tariffs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getUsers', checkAccessAdmin, async (req, res) => {
  try {
    const users = await User.find();

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getUser/:id', checkAccess, async (req, res) => {
  try {
    const actualUser = await User.findOne({
      telegramId: req.headers['x-telegram-id'],
    });

    if (actualUser) {
      let user;

      if (actualUser?.isAdmin || actualUser?.telegramId == req.params.id) {
        user = await User.findOne({ telegramId: req.params.id })
          .populate('keys')
          .populate({
            path: 'keys',
            populate: [
              {
                path: 'server',
                select: 'name country abbreviatedCountry',
                model: 'server',
              },
              {
                path: 'user',
                model: 'user',
              },
            ],
          })
          .exec();

        res.json(user);
      } else {
        throw new Error('Access is denied!');
      }
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getAllKeys', checkAccessAdmin, async (req, res) => {
  try {
    const keys = await Key.find()
      .populate('user')
      .populate('server', 'name country abbreviatedCountry')
      .exec();
    res.json(keys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getKeys', checkAccess, async (req, res) => {
  try {
    const telegramId = req.headers['x-telegram-id'];

    const user = await User.findOne({ telegramId: telegramId })
      .populate('keys')
      .populate({
        path: 'keys',
        populate: [
          {
            path: 'server',
            select: 'name country abbreviatedCountry',
            model: 'server',
          },
          {
            path: 'user',
            model: 'user',
          },
        ],
      })
      .exec();

    res.json(user?.keys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getServers', checkAccess, async (req, res) => {
  try {
    const servers = await Server.find(
      { isOpenToRegister: true },
      'name country price abbreviatedCountry'
    ).exec();

    if (servers.length > 0) {
      res.json(servers);
    } else {
      res.status(500).json({ error: 'No free servers available' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getKey/:id', checkAccess, async (req, res) => {
  try {
    const telegramId = req.headers['x-telegram-id'] as string;

    const key = await Key.findById(req.params.id)
      .populate('user')
      .populate('server', 'name country price abbreviatedCountry')
      .exec();

    if (!key) throw new Error("The key doesn't exist.");

    if (
      (key && key.user.telegramId == telegramId) ||
      (await isHaveAccess(telegramId, key))
    ) {
      res.status(200).json(key);
    } else {
      throw new Error('Access is denied!');
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.get('/getDataUsage/:id', checkAccess, async (req, res) => {
  try {
    const key = await Key.findById(req.params.id).populate('server').exec();

    if (!key) throw new Error("The key doesn't exist.");

    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    try {
      const dataUsage = await outlinevpn.getDataUserUsage(key.id);
      res.json({ bytes: dataUsage });
    } catch {
      res.json({ bytes: 0 });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST

routerApp.post('/disableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await disableKey(req.body.id);

    res.json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/enableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await enableKey(req.body.id);

    res.json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/createUser', checkAccess, async (req, res) => {
  try {
    const telegramId = req.body.telegramId;

    const data = req.body,
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        username: data?.username || '',
        telegramId: telegramId,
        phoneNumber: data?.phoneNumber || '',
        name: data?.name || '',
        surname: data?.surname || '',
        dateOfCreateUser: new Date(),
        lastViewedApp: new Date(),
      });

    await user.save();

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/updateUser', checkAccess, async (req, res) => {
  try {
    const data = req.body;
    const user = await User.findOne(
      { telegramId: data.telegramId },
      'telegramId name username phoneNumber surname keys isAdmin isLimitedToCreate maxKeyAvalible'
    );
    if (!user) throw new Error("The user doesn't exist.");

    await User.updateOne(
      { telegramId: data.telegramId },
      {
        username: data?.username || '',
        name: data?.name || '',
        phoneNumber: data?.phoneNumber || user?.phoneNumber || '',
        surname: data?.surname || '',
        lastViewedApp: new Date(),
      }
    );

    user.save();

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/editUser', checkAccessAdmin, async (req, res) => {
  try {
    const data = req.body;

    await User.updateOne(
      { telegramId: data.telegramId },
      {
        isAdmin: data.isAdmin,
        isLimitedToCreate: data.isLimitedToCreate,
        maxKeyAvalible: data.maxKeyAvalible,
      }
    );

    const user = await User.findOne(
      { telegramId: data.telegramId },
      'telegramId name username surname keys isAdmin isLimitedToCreate maxKeyAvalible'
    );

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/editKey', checkAccessAdmin, async (req, res) => {
  try {
    const data = req.body;

    const key = await Key.findByIdAndUpdate(data.id, {
      name: data.name,
      currentPrice: data.currentPrice,
      lastPayment: data?.lastPayment ? new Date(data?.lastPayment) : undefined,
      nextPayment: data?.nextPayment ? new Date(data?.nextPayment) : undefined,
    }).exec();

    res.status(200).json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post(
  '/createKey',
  checkAccess,
  checkLimitedToCreate,
  async (req, res) => {
    try {
      const telegramId = req.headers['x-telegram-id'];

      const userActual = await User.findOne({ telegramId: telegramId });
      if (!userActual) throw new Error("The user doesn't exist.");

      const server = await Server.findOne({ name: req.body.server });
      if (!server) throw new Error("The server doesn't exist.");

      let user = userActual?.isAdmin
        ? await User.findOne({ telegramId: req.body.user })
        : userActual;
      if (!user) throw new Error("The user doesn't exist.");

      const outlinevpn = new OutlineVPN({
        apiUrl: server.URL,
        fingerprint: server.FINGERPRINT,
      });

      const newKey = await outlinevpn.createUser();
      await outlinevpn.renameUser(
        newKey.id,
        `${req.body.name} (${
          user.username ? '@' + user.username : user.telegramId
        })`
      );
      await outlinevpn.addDataLimit(newKey.id, 0);

      const key = new Key({
        _id: new mongoose.Types.ObjectId(),
        accessUrl: newKey.accessUrl,
        id: newKey.id,
        name: `${req.body.name} (${
          user.username ? '@' + user.username : user.telegramId
        })`,
        user: user._id,
        isOpen: false,
        server: server._id,
        currentPrice: server.price,
        nextPayment: new Date(),
      });

      user.keys.push(key);
      server.keys.push(key);

      await key.save();
      await checkOpenToRegister(user, server);

      await bot.api.sendMessage(
        user.telegramId,
        `Your Key "${key.name}" 🗝️  for server "${server.name} (${
          server.country
        } ${getUnicodeFlagIcon(
          server.abbreviatedCountry
        )})" has been created ✅.\nTo get started, choose a suitable plan and make the payment.`
      );

      res.status(200).json({ user, key });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

routerApp.post('/deleteKey', checkAccess, async (req, res) => {
  try {
    const keyId = req.body.id;

    const key = await Key.findById(keyId).populate('user server').exec();

    if (!key) throw new Error("The key doesn't exist.");

    const user = await User.findById(key.user).populate('keys').exec();
    const server = await Server.findById(key.server).populate('keys').exec();

    if (!server) throw new Error("The server doesn't exist.");
    if (!user) throw new Error("The user doesn't exist.");

    const outlinevpn = new OutlineVPN({
      apiUrl: server.URL,
      fingerprint: server.FINGERPRINT,
    });

    user.keys = user.keys.filter((key) => key._id != keyId);
    server.keys = server.keys.filter((key) => key._id != keyId);

    await outlinevpn.deleteUser(key.id);
    await Key.findByIdAndDelete(keyId);
    await checkOpenToRegister(user, server);

    await bot.api.sendMessage(
      key.user.telegramId,
      `Your Key "${key.name}" 🗝️  for server "${key.server.name} (${
        key.server.country
      } ${getUnicodeFlagIcon(
        key.server.abbreviatedCountry
      )})" has been deleted 🗑️.`
    );

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routerApp.post('/getUrlPaymentToChat', checkAccess, async (req, res) => {
  const telegramId = req.body.telegramId;
  const keyId = req.body.keyId;
  const tariffId = req.body.tariffId;

  try {
    const key = await Key.findById(keyId).populate('server').exec();
    const tariff = await Tariff.findById(tariffId).exec();

    if (!key) throw new Error("The key doesn't exist.");
    if (!tariff) throw new Error("The tariff doesn't exist.");

    const total = !tariff.discountPercentage
      ? ((key.currentPrice * tariff.days) / 30).toFixed(2)
      : (
          (((key.currentPrice * tariff.days) / 30) *
            tariff.discountPercentage) /
          100
        ).toFixed(2);

    const url = await createPayment(telegramId, key, tariff, total);

    if (url)
      await bot.api.sendMessage(
        telegramId,
        `<b>Key name</b>: ${key.name}\n<b>Server</b>: ${key.server.name} (${
          key.server.country
        } ${getUnicodeFlagIcon(
          key.server.abbreviatedCountry
        )})\n<b>Payment period</b>: ${
          tariff.days
        } days\n<b>Next payment</b>:${date.format(
          date.addDays(new Date(), Number(tariff.days)),
          'D MMMM YYYY'
        )}\n<b>Amount</b>: ${total} rub.\n\nTo make a payment, please use the following link 👇`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Pay',
                  url: url,
                },
              ],
            ],
          },
          parse_mode: 'HTML',
        }
      );

    res.status(200).json();
  } catch (error: any) {
    await bot.api.sendMessage(
      telegramId,
      'Something went wrong! Text me @nisvem for fix it!'
    );
    res.status(500).json({ error: error.message });
  }
});

export default routerApp;

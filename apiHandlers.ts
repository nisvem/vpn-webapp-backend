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
} from './helpers/helpers.js';
import { bot } from './bot';

import date from 'date-and-time';

import User, { IUser } from './models/user';
import Key, { IKey } from './models/key';
import Server, { IServer } from './models/server';
import mongoose, { Error } from 'mongoose';
import { createPayment } from './helpers/payment';

const router = Router();

//  GET
router.get('/getUsers', checkAccessAdmin, async (req, res) => {
  try {
    const users = await User.find();

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/getUser/:id', checkAccess, async (req, res) => {
  try {
    const actualUser = await User.findOne({
      telegramId: req.headers['x-telegram-id'],
    });

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
      res.status(403).json({
        error: {
          message: 'Access is denied!',
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/getAllKeys', checkAccessAdmin, async (req, res) => {
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

router.get('/getKeys', checkAccess, async (req, res) => {
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

router.get('/getServers', checkAccess, async (req, res) => {
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

router.get('/getKey/:id', checkAccess, async (req, res) => {
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
      res.status(403).json({
        error: 'Access is denied!',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/getDataUsage/:id', checkAccess, async (req, res) => {
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

router.post('/disableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await disableKey(req.body.id);

    res.json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/enableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await enableKey(req.body.id);

    res.json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/createUser', checkAccess, async (req, res) => {
  try {
    const telegramId = req.body.telegramId;

    const data = req.body,
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        username: data.username + '',
        telegramId: telegramId,
        name: data.name + '',
        surname: data.surname + '',
        avatar: data.photoUrl + '',
        dateOfCreateUser: new Date(),
        lastViewedApp: new Date(),
      });

    await user.save();

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/updateUser', checkAccess, async (req, res) => {
  try {
    const data = req.body;

    await User.updateOne(
      { telegramId: data.telegramId },
      {
        username: data.username + '',
        name: data.name + '',
        surname: data.surname + '',
        lastViewedApp: new Date(),
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

router.post('/editUser', checkAccessAdmin, async (req, res) => {
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

router.post('/editKey', checkAccessAdmin, async (req, res) => {
  try {
    const data = req.body;
    console.log(data);

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

router.post(
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
      await outlinevpn.renameUser(newKey.id, req.body.name);
      await outlinevpn.disableUser(newKey.id);

      const key = new Key({
        _id: new mongoose.Types.ObjectId(),
        accessUrl: newKey.accessUrl,
        id: newKey.id,
        name: req.body.name,
        user: user._id,
        isOpen: false,
        server: server._id,
        currentPrice: server.price,
        nextPayment: date.addMonths(new Date(), 1),
      });

      user.keys.push(key);
      server.keys.push(key);

      await key.save();
      await checkOpenToRegister(user, server);

      res.status(200).json({ user, key });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/deleteKey', checkAccess, async (req, res) => {
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
    await checkOpenToRegister(user, server);
    await Key.findByIdAndDelete(keyId);

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/getUrlToChat', checkAccess, async (req, res) => {
  try {
    const telegramId = req.body.telegramId;
    const keyId = req.body.keyId;
    const key = await Key.findById(keyId).populate('server').exec();

    if (!key) throw new Error("The key doesn't exist.");

    const url = await createPayment(keyId, telegramId);
    await bot.api.sendMessage(telegramId, url || 'Ошибка');

    res.status(200).json();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/callbackPayment', async (req, res) => {
  console.log(req);

  try {
    await bot.api.sendMessage(req.metadata.telegramId, 'Ключ активирован!');
    await enableKey(req.metadata.id_key);

    res.status(200).json();
  } catch (error: any) {
    await bot.api.sendMessage(
      req.metadata.telegramId,
      'Something wrong! Text me @nisvem for fix it!'
    );
    res.status(500).json({ error: error.message });
  }
});

export default router;

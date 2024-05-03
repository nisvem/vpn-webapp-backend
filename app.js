import { config } from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import https from 'https';
import cors from 'cors';
import date from 'date-and-time';

import User from './models/user.js';
import Key from './models/key.js';
import Server from './models/server.js';

import { OutlineVPN } from 'outlinevpn-api';

config();

const app = express();
app.use(cors());
app.use(express.json());

const localServer = https.createServer(
  { key: fs.readFileSync('./key.pem'), cert: fs.readFileSync('./cert.pem') },
  app
);

const start = async () => {
  try {
    await mongoose.connect(process.env.MODGO_URL, { dbName: 'vpn' });

    localServer.listen(process.env.PORT, () => {
      console.log('Server started!');
    });
  } catch (error) {
    console.log('Something wrong!', error.message);
    process.exit(1);
  }
};

const checkAccessAdmin = async (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'];
  const user = await User.findOne({ telegramId: telegramId });

  if (user.isAdmin) {
    next();
  } else {
    res.status(403).json({
      error: 'Access is denied!',
    });
  }
};

const checkAccess = async (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'];

  if (telegramId) {
    next();
  } else {
    res.status(403).json({
      error: 'Access is denied without telegramId!',
    });
  }
};

const checkLimitedToCreate = async (req, res, next) => {
  try {
    const user = await User.findOne({
      telegramId: req.headers['x-telegram-id'],
    });

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

app.get('/api/getUser/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.id });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/createUser', checkAccess, async (req, res) => {
  try {
    const data = req.body,
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        username: data.username + '',
        telegramId: data.telegramId,

        name: data.name + '',
        surname: data.surname + '',
        phone: data.phone + '',
      });

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getUsers', checkAccessAdmin, async (req, res) => {
  try {
    const users = await User.find();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  '/api/createKey',
  checkAccess,
  checkLimitedToCreate,
  async (req, res) => {
    try {
      const telegramId = req.headers['x-telegram-id'];
      const user = await User.findOne({ telegramId: telegramId });
      const server = await Server.findOne({ name: req.body.server });

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
        nextPayment: date.addMonths(new Date(), 0),
      });

      user.keys.push(key._id);
      server.keys.push(key._id);

      await key.save();
      await checkOpenToRegister(user, server);

      res.status(200).json({ user, key });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post('/api/deleteKey', checkAccess, async (req, res) => {
  try {
    const keyId = req.body.id;

    const key = await Key.findOne({ id: keyId }).populate('user server').exec();
    const user = await User.findById(key.user).populate('keys').exec();
    const server = await Server.findById(key.server).populate('keys').exec();

    const outlinevpn = new OutlineVPN({
      apiUrl: server.URL,
      fingerprint: server.FINGERPRINT,
    });

    user.keys = user.keys.filter((key) => key.id != keyId);
    server.keys = server.keys.filter((key) => key.id != keyId);

    await outlinevpn.deleteUser(keyId);
    await checkOpenToRegister(user, server);
    await Key.deleteOne({ id: keyId });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getAllKeys', checkAccessAdmin, async (req, res) => {
  try {
    const keys = await Key.find()
      .populate('user')
      .populate('server', 'name country abbreviatedCountry')
      .exec();
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getKeys', checkAccess, async (req, res) => {
  try {
    const telegramId = req.headers['x-telegram-id'];

    const user = await User.findOne({ telegramId: telegramId })
      .populate('keys')
      .populate({
        path: 'keys',
        populate: {
          path: 'server',
          select: 'name country abbreviatedCountry',
          model: 'server',
        },
      })
      .exec();

    res.json(user.keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getServers', checkAccess, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getKey/:id', checkAccess, async (req, res) => {
  try {
    const telegramId = req.headers['x-telegram-id'];
    const key = await Key.findOne({ id: req.params.id })
      .populate('user')
      .populate('server', 'name country price abbreviatedCountry')
      .exec();

    if (
      key.user.telegramId == telegramId ||
      (await isHaveAccess(telegramId, key))
    ) {
      res.status(200).json(key);
    } else {
      res.status(403).json({
        error: 'Access is denied!',
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/disableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await Key.findOne({ id: req.body.id })
      .populate('user server')
      .exec();

    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    await outlinevpn.disableUser(req.body.id);
    key.isOpen = false;

    await key.save();

    res.json(key);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/enableKey', checkAccessAdmin, async (req, res) => {
  try {
    const key = await Key.findOne({ id: req.body.id })
      .populate('user server')
      .exec();

    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    await outlinevpn.enableUser(req.body.id);
    key.isOpen = true;

    await key.save();

    res.json(key);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getDataUsage/:id', checkAccess, async (req, res) => {
  try {
    const key = await Key.findOne({ id: req.params.id })
      .populate('server')
      .exec();

    const outlinevpn = new OutlineVPN({
      apiUrl: key.server.URL,
      fingerprint: key.server.FINGERPRINT,
    });

    try {
      const dataUsage = await outlinevpn.getDataUserUsage(req.params.id);
      res.json({ bytes: dataUsage });
    } catch {
      res.json({ bytes: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function isHaveAccess(telegramId, key) {
  const user = await User.findOne({ telegramId: telegramId });
  return user.isAdmin || key.user.telegramId === telegramId;
}

async function checkOpenToRegister(user, server) {
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

start();

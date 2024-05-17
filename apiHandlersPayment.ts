import { Router } from 'express';
import { enableKey } from './helpers/helpers.js';
import { bot } from './bot.js';

const routerPayment = Router();

routerPayment.post('/callbackPayment/', async (req, res) => {
  console.log('req:', req);
  console.log('res:', res);

  try {
    await bot.api.sendMessage(
      req.body.object.metadata.telegramId,
      'Ключ активирован!'
    );
    await enableKey(req.body.object.metadata.id_key);

    res.status(200).json();
  } catch (error: any) {
    await bot.api.sendMessage(
      req.body.object.metadata.telegramId,
      'Something wrong! Text me @nisvem for fix it!'
    );
    res.status(500).json({ error: error.message });
  }
});

export default routerPayment;

import { Router } from 'express';
import date from 'date-and-time';
import { enableKey } from './helpers/helpers.js';
import { bot } from './bot.js';

import Key from './models/key';

const routerPayment = Router();

routerPayment.post('/callbackPayment', async (req, res) => {
  console.log('Received request:', req.body);

  const { object } = req.body;
  const { keyId, days, telegramId } = object.metadata;
  const key = await Key.findById(keyId)
    .populate('user')
    .populate('server')
    .exec();

  if (!keyId || !days || !telegramId || !key) {
    console.error('Invalid request body in /callbackPayment:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    key.lastPayment = new Date();
    key.nextPayment = date.addDays(new Date(), days);

    await enableKey(key._id);
    await bot.api.sendMessage(
      telegramId,
      `The next payment date is ${date.format(key.nextPayment, 'D MMMM YYYY')}.`
    );

    res.status(200).json({ message: 'Success' });
  } catch (error: any) {
    console.error('Error processing payment callback:', error);

    await bot.api.sendMessage(
      telegramId,
      'Something went wrong! Text me @nisvem for fix it!'
    );
    res.status(500).json({ error: error.message });
  }
});

export default routerPayment;

import { Router } from 'express';
import { enableKey } from './helpers/helpers.js';
import { bot } from './bot.js';

const routerPayment = Router();

routerPayment.post('/callbackPayment', async (req, res) => {
  console.log('Received request:', req.body);

  const { object } = req.body;
  const { metadata } = object;

  if (!metadata || !metadata.telegramId || !metadata.id_key) {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    await bot.api.sendMessage(metadata.telegramId, 'Ключ активирован!');
    await enableKey(metadata.id_key);

    res.status(200).json({ message: 'Success' });
  } catch (error: any) {
    console.error('Error processing payment callback:', error);
    await bot.api.sendMessage(
      metadata.telegramId,
      'Something went wrong! Text me @nisvem for fix it!'
    );
    res.status(500).json({ error: error.message });
  }
});

export default routerPayment;

import { Router } from 'express';
import date from 'date-and-time';
import { enableKey } from './helpers/helpers.js';
import { bot } from './bot/bot.js';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

import Key from './models/key';
import i18next from './lang/';

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

  i18next.changeLanguage(key.user?.lang || 'en');

  try {
    const newDate = key.nextPayment > new Date() ? key.nextPayment : new Date();
    key.lastPayment = new Date();
    key.nextPayment = date.addDays(newDate, days);
    key.save();

    !key.isOpen && (await enableKey(key._id));
    await bot.api.sendMessage(
      key.user.telegramId,
      i18next.t('payment_successful', {
        name: key.name,
        server: `"${key.server.name} (${
          key.server.country
        } ${getUnicodeFlagIcon(key.server.abbreviatedCountry)})"`,
        days: days,
        nextPayment: `${date.format(key.nextPayment, 'D MMMM YYYY')}`,
      })
    );

    res.status(200).json({ message: 'Success' });
  } catch (error: any) {
    console.error('Error processing payment callback:', error);

    await bot.api.sendMessage(telegramId, i18next.t('error'));
    res.status(500).json({ error: error.message });
  }
});

export default routerPayment;

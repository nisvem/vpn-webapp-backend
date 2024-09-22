import { Router } from 'express';
import date from 'date-and-time';
import { enableKey, sendMessage } from './helpers/helpers';
import {logger} from './helpers/logger';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

import Key from './models/key';
import i18next from './lang/';

const routerPayment = Router();

routerPayment.post('/callbackPayment', async (req, res) => {
  logger.debug(`Received request:`, req.body);

  const { object } = req.body;
  const { keyId, days, telegramId } = object.metadata;
  const key = await Key.findById(keyId)
    .populate('user')
    .populate('server')
    .exec();

  if (!keyId || !days || !telegramId || !key) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  i18next.changeLanguage(key.user?.lang || 'en');

  try {
    const newDate = key.nextPayment > new Date() ? key.nextPayment : new Date();
    key.lastPayment = new Date();
    key.nextPayment = date.addDays(newDate, days);
    key.save();

    !key.isOpen && (await enableKey(key._id));
    await sendMessage(
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
    logger.info(`New payment from ${key.user.telegramId} for '${key.name}'`)
  } catch (error: any) {
    logger.error('Error processing payment callback:', error);

    await sendMessage(telegramId, i18next.t('error'));
    res.status(500).json({ error: error.message });
    logger.error('apiHandlersPayment -> /callbackPayment', error.message);
  }
});

export default routerPayment;

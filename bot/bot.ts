import { config } from 'dotenv';
import { Bot, Context, session, SessionFlavor } from 'grammy';
import date from 'date-and-time';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import i18next from '../lang';
import { logger } from '../helpers/logger';
import User from '../models/user';
import Key from '../models/key';
import Tariff from '../models/tariff';
import { enableKey } from '../helpers/helpers';

config();
interface SessionData {
  lang: 'en' | 'ru';
}

type MyContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<MyContext>(process.env.BOT_TOKEN + '');

function initial(): SessionData {
  return { lang: 'en' };
}

bot.use(session({ initial }));

bot.command('start', async (ctx) => {
  const message = await ctx.reply(
    'Select a language to continue / Выберите язык для продолжения:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'English',
              callback_data: 'change_eng',
            },
            {
              text: 'Русский',
              callback_data: 'change_ru',
            },
          ],
        ],
      },
    }
  );
});

bot.callbackQuery('change_eng', async (ctx) => {
  ctx.session.lang = 'en';

  await startMessage(ctx);
});

bot.callbackQuery('change_ru', async (ctx) => {
  ctx.session.lang = 'ru';

  await startMessage(ctx);
});

async function startMessage(ctx: MyContext) {
  await ctx.deleteMessage();
  i18next.changeLanguage(ctx.session.lang);

  try {
    const user = await User.findOne({ telegramId: ctx.from?.id });

    if (user) {
      await User.updateOne(
        { telegramId: ctx.from?.id },
        {
          username: ctx.from?.username || '',
          name: ctx.from?.first_name || '',
          surname: ctx.from?.last_name || '',
          lang: ctx.session.lang,
        }
      );
    } else {
      const newUser = new User({
        username: ctx.from?.username || '',
        name: ctx.from?.first_name || '',
        telegramId: ctx.from?.id,
        surname: ctx.from?.last_name || '',
        lang: ctx.session.lang,
        dateOfCreateUser: new Date(),
      });

      await newUser.save();
      logger.info('New user -> ', newUser);
    }
  } catch {}

  await ctx.api.setChatMenuButton({
    chat_id: ctx.chat?.id,
    menu_button: {
      type: 'web_app',
      text: i18next.t('btn_menu'),
      web_app: {
        url: process.env.URL_WEBAPP || '',
      },
    },
  });
  console.log(process.env.URL_WEBAPP || 'asd');
  await ctx.reply(i18next.t('welcome'), {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: i18next.t('btn_menu'),
            web_app: {
              url: process.env.URL_WEBAPP || '',
            },
          },
        ],
      ],
    },
  });
}

bot.on('pre_checkout_query', async (ctx) => {
  try {
    return ctx.answerPreCheckoutQuery(true);
  } catch {
    console.error('answerPreCheckoutQuery failed');
  }
});

bot.on('message:successful_payment', async (ctx) => {
  try {
    console.log('message:successful_payment -> ', ctx);

    if (!ctx.message || !ctx.message.successful_payment || !ctx.from) {
      return;
    }

    const { telegramId, keyId, tariffId } = JSON.parse(
      ctx.message.successful_payment.invoice_payload
    ) as {
      telegramId?: string;
      keyId?: string;
      tariffId?: string;
    };

    if (!telegramId || !keyId || !tariffId) {
      throw new Error("There is't telegramId / keyId / tariffId");
    }

    console.log(
      'telegramId -> ',
      telegramId,
      'keyId -> ',
      keyId,
      'tariffId -> ',
      tariffId
    );

    const key = await Key.findById(keyId)
      .populate('user')
      .populate('server')
      .exec();

    const tariff = await Tariff.findById(tariffId).exec();

    if (!keyId || !tariff || !telegramId || !key) {
      throw new Error("There is't keyId / tariff / telegramId / key");
    }

    i18next.changeLanguage(key.user?.lang || 'en');

    const newDate = key.nextPayment > new Date() ? key.nextPayment : new Date();
    key.lastPayment = new Date();
    key.nextPayment = date.addDays(newDate, Number(tariff.days), true);
    key.save();

    !key.isOpen && (await enableKey(key._id));

    const user = await User.findById(key.user._id).exec();

    if (user) {
      user.paymentMessagesId.map((message_id) => {
        try {
          bot.api.deleteMessage(ctx.chatId, message_id);
        } catch {
          console.error("There isn't the message");
        }
      });

      user.paymentMessagesId = [];
      user.save();
    }

    await ctx.reply(
      i18next.t('payment_successful', {
        name: key.name,
        server: `"${key.server.name} (${
          key.server.country
        } ${getUnicodeFlagIcon(key.server.abbreviatedCountry)})"`,
        days: tariff.days,
        nextPayment: `${date.format(key.nextPayment, 'D MMMM YYYY')}`,
      })
    );

    logger.info(
      `New payment from ${key.user.username ? '@' + key.user.username : ''} ${
        key.user.phoneNumber ? key.user.phoneNumber : ''
      } (${key.user.telegramId}) for '${key.name} (${tariff.days} days${
        ctx.message.successful_payment.total_amount &&
        ctx.message.successful_payment.currency
          ? ' = ' +
            ctx.message.successful_payment.total_amount +
            ' ' +
            ctx.message.successful_payment.currency
          : ''
      })'`
    );
  } catch (error: any) {
    logger.error('Error processing payment callback:', error);
    await ctx.reply(i18next.t('error'));
    logger.error('Error: message:successful_payment ->', error.message);
  }

  console.log(ctx.message.successful_payment);
});

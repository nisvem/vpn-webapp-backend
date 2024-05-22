import { config } from 'dotenv';
import { Bot, Context, session, SessionFlavor } from 'grammy';
import i18next from '../lang';

import User from '../models/user';

config();
interface SessionData {
  lang: 'en' | 'ru';
  startMessage?: number;
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

  ctx.session.startMessage = message.message_id;
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
      });

      await newUser.save();
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

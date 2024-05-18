import { config } from 'dotenv';
import { text } from 'express';
import { Bot, InlineKeyboard } from 'grammy';
import user from './models/user';

config();

export const bot = new Bot(process.env.BOT_TOKEN + '');

const keyboard = new InlineKeyboard([
  [
    {
      text: '🔑 Keys',
      web_app: {
        url: process.env.URL_WEBAPP || '',
      },
    },
  ],
]);

bot.command('start', async (ctx) => {
  const message = await ctx.reply('Loading ...', {
    reply_markup: {
      remove_keyboard: true,
    },
  });

  await ctx.api.setChatMenuButton({
    chat_id: ctx.chat.id,
    menu_button: {
      type: 'web_app',
      text: 'Keys 🔑',
      web_app: {
        url: process.env.URL_WEBAPP || '',
      },
    },
  });

  await ctx.reply(
    `Hi!👋 \n\nTo get started and receive your server key or manage these please click on the menu on the sidebar 🔑, or click here to access the web app 👇`,
    {
      reply_markup: keyboard,
    }
  );

  await bot.api.deleteMessage(message.chat.id, message.message_id);
});

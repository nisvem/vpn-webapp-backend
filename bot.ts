import { config } from 'dotenv';
import { Bot, InlineKeyboard } from 'grammy';

config({ path: ['.env', '.env.local'] });

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

bot.command('start', (ctx) =>
  ctx.reply(
    `Hi!👋 \n\nTo get started and receive your server key or manage these please click on the menu on the sidebar 🔑, or click here to access the web app 👇`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        ...keyboard,
      },
    }
  )
);

bot.on('message', async (ctx) => {
  console.log(ctx.from);
});

import { config } from 'dotenv';
import { Bot, InlineKeyboard } from 'grammy';

config({ path: `.env.local` });

export const bot = new Bot(process.env.BOT_TOKEN + '');

const keyboard = new InlineKeyboard()
  .webApp('webapp', 'https://127.0.0.1:8080')
  .row();

bot.command('start', (ctx) =>
  ctx.reply('Welcome! Up and running.', {
    reply_markup: keyboard,
  })
);

bot.on('message', async (ctx) => {
  console.log(ctx.from);
});

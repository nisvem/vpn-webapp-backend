import { Bot, InlineKeyboard } from 'grammy';

export const bot = new Bot('6881075844:AAHRv5Bl8uPsu0p4mr3kkeMEoiNddMikGN4');

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

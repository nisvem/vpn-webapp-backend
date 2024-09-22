export const keysKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '🔑 Keys',
          web_app: {
            url: process.env.URL_WEBAPP || '',
          },
        },
      ],
    ],
  },
};
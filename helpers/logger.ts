import { bot } from '../bot/bot';
import User, { IUser } from '../models/user';
import { createLogger, transports, format, Logger } from 'winston';
import Transport, {TransportStreamOptions} from 'winston-transport';

class CustomTransport extends Transport {
  constructor(options: TransportStreamOptions) {
      super(options);
  }
    async log(info: { level: string; message: string }, callback: () => void): Promise<void> {
        setImmediate(() => this.emit('logged', info));

        if(info.level === 'info' || info.level === 'error') {
          const userAdmin = await User.find({ isAdmin: true });

          userAdmin.forEach((user) => {
            bot.api.sendMessage(user.telegramId, customFormatText(info));
          });
        }

        callback();
    }
}

const customFormat = format.printf((info) => {
  return customFormatText(info);
});

function customFormatText (info:any) {
  const message = typeof info.message === 'object' ? JSON.stringify(info.message, null, 2) : info.message;
  const meta = info[Symbol.for('splat')] ? JSON.stringify(info[Symbol.for('splat')], null, 2) : '';
  
  return `${info.timestamp} [${info.level.toUpperCase()}]: ${message} ${meta ? '\n'+ meta :''}`;
}

export const logger:Logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }), // Добавляем время
    format.prettyPrint(),
    customFormat
  ),
  transports: [
    new transports.Console(),  // Логирование в консоль
    new transports.File({ filename: 'errors.log', level: 'error'}),
    new transports.File({ filename: 'info.log', level: 'info'}),
    new transports.File({ filename: 'others.log'}),
    new CustomTransport({})
  ],
});


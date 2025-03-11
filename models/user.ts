import { Schema, model, Types } from 'mongoose';
import { IKey } from './key';

const user: Schema = new Schema({
  username: { type: String, required: false, default: '' },
  telegramId: { type: String, required: true, unique: true },
  lang: { type: String, required: false, default: 'en' },

  phoneNumber: { type: String, required: false },

  isAdmin: { type: Boolean, required: true, default: false },
  isLimitedToCreate: { type: Boolean, required: true, default: false },
  maxKeyAvalible: { type: Number, required: false, default: 2 },

  name: { type: String, required: false },
  surname: { type: String, required: false },

  lastViewedApp: { type: Date, required: false },
  dateOfCreateUser: { type: Date, required: false },

  keys: [{ type: Schema.Types.ObjectId, ref: 'key' }],
  paymentMessagesId: [{type: Number, required: false}]
});

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  telegramId: string;
  lang: string;

  phoneNumber: string;

  isAdmin: boolean;
  isLimitedToCreate: boolean;
  maxKeyAvalible: number;

  name: string;
  surname: string;

  lastViewedApp: Date;
  dateOfCreateUser: Date;

  keys: IKey[];
  paymentMessagesId: number[];
}

export default model<IUser>('user', user);

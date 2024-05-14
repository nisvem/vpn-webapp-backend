import { Schema, model, Types } from 'mongoose';
import { IUser } from './user';
import { IServer } from './server';

const key: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  accessUrl: { type: String, required: true },
  currentPrice: { type: Number, required: true },

  isOpen: { type: Boolean, required: true },
  user: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
  server: { type: Schema.Types.ObjectId, ref: 'server' },

  lastPayment: { type: Date, required: false },
  nextPayment: { type: Date, required: false },
});

export interface IKey {
  _id: Types.ObjectId;
  id: string;
  name: string;
  accessUrl: string;

  isOpen: boolean;
  user: IUser;
  server: IServer;

  lastPayment: Date;
  nextPayment: Date;
}

export default model<IKey>('key', key);

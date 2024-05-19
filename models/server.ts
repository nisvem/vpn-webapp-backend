import { Schema, Types, model } from 'mongoose';
import { IKey } from './key';

const server: Schema = new Schema({
  serverId: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  abbreviatedCountry: { type: String, required: true },

  limitUsers: { type: Number, required: true },
  nowUsers: { type: Number, required: true },
  isOpenToRegister: { type: Boolean, required: true },
  keys: [{ type: Schema.Types.ObjectId, ref: 'key' }],
  price: { type: Number, required: true },

  URL: { type: String, required: true },
  IP_SERVER: { type: String, required: true },
  PORT_FROM: { type: Number, required: true },
  PORT_TO: { type: Number, required: true },
  FINGERPRINT: { type: String, required: true },
});

export interface IServer {
  _id: Types.ObjectId;
  serverId: string;
  name: string;
  country: string;
  abbreviatedCountry: string;

  limitUsers: number;
  nowUsers: number;
  isOpenToRegister: boolean;
  keys: IKey[];
  price: number;

  URL: string;
  FINGERPRINT: string;
  IP_SERVER: string;
  PORT_FROM: number;
  PORT_TO: number;
}

export default model<IServer>('server', server);

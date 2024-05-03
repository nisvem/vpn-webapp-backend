import { Schema, model } from 'mongoose';

const key = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  accessUrl: { type: String, required: true },
  isOpen: { type: Boolean, required: true },

  user: { type: Schema.Types.ObjectId, ref: 'user' },
  server: { type: Schema.Types.ObjectId, ref: 'server' },

  lastPayment: { type: Date, required: false },
  nextPayment: { type: Date, required: false },
});

export default model('key', key);

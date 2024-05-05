import { MaxKey } from 'mongodb';
import { Schema, model } from 'mongoose';

const user = new Schema({
  username: { type: String, required: true },
  telegramId: { type: String, required: true, unique: true },

  isAdmin: { type: Boolean, required: true, default: false },
  isLimitedToCreate: { type: Boolean, required: true, default: false },
  maxKeyAvalible: { type: Number, required: true, default: 2 },

  name: { type: String, required: false },
  surname: { type: String, required: false },
  phone: { type: String, required: false },

  lastViewedApp: { type: Date, required: false },
  dateOfCreateUser: { type: Date, required: false },

  avatar: { type: String, required: false },

  keys: [{ type: Schema.Types.ObjectId, ref: 'key' }],
});

export default model('user', user);

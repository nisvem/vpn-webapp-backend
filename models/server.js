import { Schema, model } from 'mongoose';

const server = new Schema({
  name: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  abbreviatedCountry: { type: String, required: true },

  limitUsers: { type: Number, required: true },
  nowUsers: { type: Number, required: true },
  isOpenToRegister: { type: Boolean, required: true },
  keys: [{ type: Schema.Types.ObjectId, ref: 'key' }],
  price: { type: Number, required: true },

  URL: { type: String, required: true },
  FINGERPRINT: { type: String, required: true },
});

export default model('server', server);

import { Schema, model, Types } from 'mongoose';

const tariff: Schema = new Schema({
  name: { type: String, required: true },
  days: { type: Number, required: true },
  discountPercentage: { type: Number, required: true },
});

export interface ITariff {
  _id: Types.ObjectId;
  name: string;
  days: number;
  discountPercentage: number;
}

export default model<ITariff>('tariff', tariff);

import { config } from 'dotenv';
import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { IKey } from '../models/key';
import { ITariff } from '../models/tariff';

// config({ path: `.env.local` });
config();

const YooKassa = new YooCheckout({
  shopId: `${process.env.SHOP_ID_YOOKASSA}`,
  secretKey: `${process.env.SECRET_KEY_YOOKASSA}`,
});

export async function createPayment(
  telegramId: string,
  key: IKey,
  tariff: ITariff,
  total: string
) {
  const idempotence_key = uuidv4();
  const createPayload: ICreatePayment = {
    amount: {
      value: total,
      currency: 'RUB',
    },
    description: `Оплата ключа для сервера "${key.server.name}" на ${tariff.days} дней (${telegramId})`,
    confirmation: {
      type: 'redirect',
      return_url: 'https://t.me/test_for_develop_nisvem_bot',
    },
    metadata: {
      keyId: key._id,
      days: tariff.days,
      telegramId: telegramId,
    },
    capture: true,
  };

  try {
    const payment = await YooKassa.createPayment(
      createPayload,
      idempotence_key
    );
    console.log(payment);
    return payment.confirmation.confirmation_url;
  } catch (error) {
    console.error(error);
  }
}

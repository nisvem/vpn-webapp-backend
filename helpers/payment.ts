import { config } from 'dotenv';
import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';

// config({ path: `.env.local` });
config();

const YooKassa = new YooCheckout({
  shopId: `${process.env.SHOP_ID_YOOKASSA}`,
  secretKey: `${process.env.SECRET_KEY_YOOKASSA}`,
});

export async function createPayment(id: string, telegramId: string) {
  const idempotence_key = uuidv4();
  const createPayload: ICreatePayment = {
    amount: {
      value: '10.00',
      currency: 'RUB',
    },
    description: 'Оплата ключа на месяц',
    confirmation: {
      type: 'redirect',
      return_url: 'https://t.me/test_for_develop_nisvem_bot',
    },
    metadata: {
      id_key: id,
      telegramId: telegramId,
    },
    // capture: true,
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

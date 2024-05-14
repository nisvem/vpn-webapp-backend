import axios from 'axios';
import { createHash } from 'crypto';

const payment = axios.create();

payment.defaults.baseURL = process.env.API_PAYMENT_URL;

payment.defaults.headers.common['Content-Type'] =
  'application/x-www-form-urlencoded';
payment.defaults.headers.common['Origin'] = 'https://test-shop.ru';
payment.defaults.headers.common['Referer'] = 'test-shop.ru';

export async function createPayment(id: string) {
  // const response = await payment.post('/init', {
  //   order_id: id,
  //   amount: 100,
  //   info: [
  //     {
  //       name: 'Тест',
  //       quantity: 1,
  //       amount: 100,
  //     },
  //   ],
  //   signature: createHash('sha256')
  //     .update(`${id}100Тест1100${process.env.API_PAYMENT_KEY}`)
  //     .digest('hex'),
  // });
  // await new Promise((resolve) =>
  //   setTimeout(() => {
  //     resolve('');
  //   }, 5000)
  // );
  // console.log({
  //   order_id: id,
  //   amount: 100,
  //   info: [
  //     {
  //       name: 'Тест',
  //       quantity: 1,
  //       amount: 100,
  //     },
  //   ],
  //   signature: createHash('sha256')
  //     .update(`${id}100Тест1100${process.env.API_PAYMENT_KEY}`)
  //     .digest('hex'),
  // });
}

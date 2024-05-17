import { config } from 'dotenv';
import express from 'express';
import mongoose, { MongooseError } from 'mongoose';
import fs from 'fs';
import https from 'https';
import cors from 'cors';

import { bot } from './bot';

import apiHandlersApp from './apiHandlersApp';
import apiHandlersPayment from './apiHandlersPayment';

// config({ path: `.env.local` });

config();

const app = express();
app.use(cors());
app.use(express.json());

const payment = express();
payment.use(cors());
payment.use(express.json());

// const localServer = https.createServer(
//   { key: fs.readFileSync('./key.pem'), cert: fs.readFileSync('./cert.pem') },
//   app
// );

const start = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MODGO_URL as string, { dbName: 'vpn' });
    console.log('Connected to MongoDB');

    app.use('/api', apiHandlersApp);
    payment.use('/payment', apiHandlersPayment);

    app.listen(process.env.PORT || 3000, () => {
      console.log(`App server started on port ${process.env.PORT}`);
    });
    payment.listen(process.env.PORT_PAYMENT || 8443, () => {
      console.log(`Payment server started on port ${process.env.PORT_PAYMENT}`);
    });

    bot.start();
  } catch (error: any) {
    console.log('Something went wrong!', error.message);
    process.exit(1);
  }
};

start();

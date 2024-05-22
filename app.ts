import { config } from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import https from 'https';
import cors from 'cors';

import { bot } from './bot/bot';
import apiHandlersApp from './apiHandlersApp';
import apiHandlersPayment from './apiHandlersPayment';
import startCron from './helpers/crons';
import { findAvailablePort } from './helpers/helpers';

config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiHandlersApp);
app.use('/payment', apiHandlersPayment);

const start = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MODGO_URL as string, { dbName: 'vpn' });
    console.log('Connected to MongoDB');

    if (process.env.LOCAL_SERVER == 'true') {
      const localServer = https.createServer(
        {
          key: fs.readFileSync('./key.pem'),
          cert: fs.readFileSync('./cert.pem'),
        },
        app
      );

      localServer.listen(process.env.PORT || 3000, () => {
        console.log(`App server started on port ${process.env.PORT}`);
      });
      bot.start();
    } else {
      app.listen(process.env.PORT || 3000, () => {
        console.log(`App server started on port ${process.env.PORT}`);
      });

      bot.start();
      await startCron();
    }
  } catch (error: any) {
    console.error('Something went wrong!', error.message);
    process.exit(1);
  }
};

start();

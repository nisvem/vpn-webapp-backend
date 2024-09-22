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
import {logger} from './helpers/logger';

config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiHandlersApp);
app.use('/payment', apiHandlersPayment);

const start = async () => {
  try {
    logger.debug('Connecting to MongoDB...');
    await mongoose.connect(process.env.MODGO_URL as string, { dbName: 'vpn' });
    logger.debug('Connected to MongoDB');

    if (process.env.LOCAL_SERVER == 'true') {
      const localServer = https.createServer(
        {
          key: fs.readFileSync('./key.pem'),
          cert: fs.readFileSync('./cert.pem'),
        },
        app
      );

      localServer.listen(process.env.PORT || 3000, () => {
        logger.debug(`App server started on port ${process.env.PORT}`);
      });
      bot.start();
      await startCron();
    } else {
      app.listen(process.env.PORT || 3000, () => {
        logger.debug(`App server started on port ${process.env.PORT}`);
      });

      bot.start();
      await startCron();
    }
  } catch (error: any) {
    logger.error(`Something went wrong! Error: ${error.message}`);
    process.exit(1);
  }
};

start();

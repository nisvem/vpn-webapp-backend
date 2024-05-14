import { config } from 'dotenv';
import express from 'express';
import mongoose, { MongooseError } from 'mongoose';
import fs from 'fs';
import https from 'https';
import cors from 'cors';

import { bot } from './bot';

import apiHandlers from './apiHandlers';

// config({ path: `.env.local` });

config();

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const key = req.headers['x-access-code'];

  if (key && key === process.env.ACCESS_KEY) {
    next();
  } else {
    res.status(403).json({
      error: 'Access is denied!',
    });
  }
});

// const localServer = https.createServer(
//   { key: fs.readFileSync('./key.pem'), cert: fs.readFileSync('./cert.pem') },
//   app
// );

const start = async () => {
  try {
    await mongoose.connect(process.env.MODGO_URL as string, { dbName: 'vpn' });

    app.listen(process.env.PORT, () => {
      console.log('Server started!');
    });
  } catch (error: any) {
    console.log('Something wrong!', error.message);
    process.exit(1);
  }
};

app.use('/api', apiHandlers);

bot.start();
start();

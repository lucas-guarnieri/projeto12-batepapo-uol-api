import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const error = chalk.bold.red;
const allGood = chalk.bold.hex("#00FFFF");


server.listen(5000, () => {
    console.log(allGood(`Running on http://localhost:${process.env.PORTA}`));
});

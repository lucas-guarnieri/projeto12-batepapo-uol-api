import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import chalk from 'chalk';
import dotenv from 'dotenv';
dotenv.config();

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);
let promise = mongoClient.connect();
promise.then(() => {
  db = mongoClient.db((process.env.MONGO_DATABASE));
});

const server = express();
server.use(cors());
server.use(json());

const error = chalk.bold.red;
const allGood = chalk.bold.hex("#00FFFF");

server.get("/participants", async (req, res) => {
    try {
        const participants = await db.colletion("participants").find().toArray();
        res.send(participants);
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
})


server.listen(5000, () => {
    console.log(allGood(`Running on http://localhost:${process.env.PORTA}`));
});

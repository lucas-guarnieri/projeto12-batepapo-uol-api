import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi'
import chalk from 'chalk';

const server = express();
server.use(cors());
server.use(json());
dotenv.config();

const err = chalk.bold.red;
const allGood = chalk.bold.hex("#00FFFF");

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
let promise = mongoClient.connect();
promise.then(() => {
  db = mongoClient.db((process.env.MONGO_DATABASE));
});


server.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
});

server.post("/participants", async (req, res) => {
    const partipant = req.body;

    const participantSchema = joi.object({
        name: joi.string().required(),
    });

    const validation = participantSchema.validate(partipant);
    if (validation.error) {
        res.status(422).send(err(validation.error.details));
        return;
    }

    try {
        const finder = await db.collection("participants").findOne({name : partipant.name});
        if (finder === null){
            await db.collection("participants").insertOne({...partipant, lastStatus: Date.now()});
            res.sendStatus(201);
        }else {
            res.sendStatus(409).send(err("user already exist"));
        }
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
});


server.listen(5000, () => {
    console.log(allGood(`Running on http://localhost:${process.env.PORTA}`));
});

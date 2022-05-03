import express, {json} from "express";
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

// GET USERS LIST
server.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
});

// REGISTER NEW USER
server.post("/participants", async (req, res) => {
    const participant = req.body;

    const participantSchema = joi.object({
        name: joi.string().required(),
    });
    const validation = participantSchema.validate(participant);
    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        const findUser = await db.collection("participants").findOne({name : participant.name});
        if (findUser === null){
            await db.collection("participants").insertOne({...participant, lastStatus: Date.now()});
            res.sendStatus(201);
        }else {
            res.sendStatus(409);
        }
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
});

// USER STATUS UPDATE
server.post("/status", async (req, res) => {
    const user = req.headers.user;

    try {
        const findUser = await db.collection("participants").findOne({name : user});
        if (findUser === null){
            res.sendStatus(404);
        }else {
            await db.collection("participants").updateOne(
                { name: user },
                { $set: {
                    lastStatus: Date.now()
                }}
            );
            res.sendStatus(200);
        }
    } catch (error){
        console.log(error);
        res.sendStatus(500)
    }
})


server.listen(5000, () => {
    console.log(allGood(`Running on http://localhost:${process.env.PORTA}`));
});

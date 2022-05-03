import express, {json} from "express";
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi'
import dayjs from "dayjs";
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
        const findUser = await db.collection("participants").findOne({name: user});
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

// CLEAR INACTIVE PARTICIPANTS
 setInterval(async () => {
     try {
         const actualTime = Date.now();
         const participants = await db.collection("participants").find().toArray();
         const inactiveUsers = participants.filter(user => parseInt(actualTime) >= parseInt(user.lastStatus) + 10000)

         inactiveUsers.map(participant => {
                db.collection("participants").deleteOne({ name: participant.name });
                db.collection("messages").insertOne({
                from: participant.name, 
                to: 'Todos', 
                text: 'sai da sala...', 
                type: 'status', 
                time: dayjs(Date.now()).format("HH:mm:ss")
            });
             
         });
         } catch (error){
             console.error(error);
         }
 }, 15000); 

// GET MESSAGE LIST
server.get("/messages", async (req, res) => {
    const messageNumber = parseInt(req.query.limit);
    const user = req.headers.user;

    function userFilter(elem){
        return elem.type === "message" || elem.type === "status" || elem.to === user || elem.from === user;
    }

    try {
        const messages = await db.collection("messages").find().toArray();
        
            const filteredMessages = messages.filter(userFilter);
            if (!messageNumber){
                res.send(filteredMessages);
            }else {
                res.send(filteredMessages.slice(filteredMessages.length - messageNumber, filteredMessages.length));
            
        }
    } catch (error){
        console.error(error);
        res.sendStatus(500);
    }
});

// POST NEW MESSAGE
server.post("/messages", async (req, res) => {
    const user = req.headers.user;
    const message = req.body;

    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required().valid("message", "private_message")
    });
    const validation = messageSchema.validate(message);
    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        const findUser = await db.collection("participants").findOne({name : user});
        if (findUser === null){
            res.sendStatus(404);
        } else {
            await db.collection("messages").insertOne({...message, from: user, time: dayjs(Date.now()).format("HH:mm:ss")});
            res.sendStatus(201);
        }
    } catch (error){
        console.log(error);
        res.sendStatus(500)
    }
})

//DELETE MESSAGE
server.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const user = req.headers.user;
    const mensageID = req.params.ID_DA_MENSAGEM;
    try {
        const messageExists = await db.collection("messages").findOne({_id: new ObjectId(mensageID)});
        if (messageExists === null) {
            res.sendStatus(404);
            return;
        }
        if (messageExists.from !== user){
            res.sendStatus(401)
            return;
        }
        await db.collection("messages").deleteOne({_id: new ObjectId(mensageID)});
        res.sendStatus(200);
    } catch (error){
        console.log(error);
        res.sendStatus(500)
    }
});

//MODIFY MESSAGE
server.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const user = req.headers.user;
    const mensageID = req.params.ID_DA_MENSAGEM;
    const message = req.body;

    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required().valid("message", "private_message")
    });
    const validation = messageSchema.validate(message);
    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        const messageExists = await db.collection("messages").findOne({_id: new ObjectId(mensageID)});
        if (messageExists === null) {
            res.sendStatus(404);
            return;
        }
        if (messageExists.from !== user){
            res.sendStatus(401)
            console.log(user, messageExists.from)
            return;
        }
        await db.collection("messages").updateOne(
                { _id: new ObjectId(mensageID)},
                { $set: {to: message.to, text: message.text, type: message.type}}
            );
        res.sendStatus(200);
    } catch {

    }
});

server.listen(5000, () => {
    console.log(allGood(`Running on http://localhost:${process.env.PORTA}`));
});



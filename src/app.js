import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message));


    

app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`)
})
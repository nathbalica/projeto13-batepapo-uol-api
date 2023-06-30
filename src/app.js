import express from 'express'
import cors from 'cors'
import { connectToDatabase, getDatabase } from './db.js'
import dotenv from "dotenv";
import dayjs from 'dayjs';
import { nameSchema, messageSchema } from './validations.js'
import { stripHtml } from 'string-strip-html';
import { ObjectId } from 'mongodb';


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectToDatabase()


app.get('/participants', async (req, res) => {

    try {
        const db = getDatabase()
        const listParticipants = await db.collection("participants").find().toArray();

        if (listParticipants.length === 0) return res.send([]);

        res.send(listParticipants)
    } catch (err) {
        res.status(500).send(err.message);
    }
})


app.post('/participants', async (req, res) => {
    try {
        const { name } = req.body;
        const time = dayjs().format('HH:mm:ss')
        const db = getDatabase()
        
        const sanitizedName = typeof name === "string" && stripHtml(name).result.trim();
        const { error } = nameSchema.validate({ name: cleanName }, { abortEarly: false });
        if (error) {
            return res.status(422).json({ error: error.details.map(detail => detail.message) })
        }

        const existingParticipant = await db.collection("participants").findOne({ name: sanitizedName })

        if (existingParticipant) {
            return res.status(409).json({ error: 'O nome já está em uso.' })
        }

        await db.collection("participants").insertOne({
            name: sanitizedName,
            lastStatus: Date.now()
        })

        await db.collection("messages").insertOne({
            from: sanitizedName,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: time
        })

        res.sendStatus(201)

    } catch (err) {
        res.status(500).send(err.message);
    }

})

app.get('/messages', async (req, res) => {
    const user = req.headers.user;
    const { limit } = req.query
    const numberLimit = Number(limit)
    const db = getDatabase()

    if (!user) return res.status(400).json({ error: 'O cabeçalho "user" é obrigatório.' });
    if (limit !== undefined && (numberLimit <= 0 || isNaN(numberLimit))) return res.sendStatus(422)

    try {

        let query = {
            $or: [
                { to: { $in: ["Todos", user] } },
                { type: "message" },
                { from: user }
            ]
        };
        const messages = await db.collection("messages")
            .find(query)
            .sort(({ $natural: -1 }))
            .limit(limit === undefined ? 0 : Math.max(0, numberLimit))
            .toArray()

        res.send(messages)

    } catch (err) {
        res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }

})

app.post('/messages', async (req, res) => {
    try {
        const { to, text, type } = req.body;
        const from = req.headers.user;
        const time = dayjs().format('HH:mm:ss')
        const db = getDatabase()

        const sanitizedMessage = {
            to: typeof to === "string" && stripHtml(to).result.trim(),
            text: typeof text === "string" && stripHtml(text).result.trim(),
            type: typeof type === "string" && stripHtml(type).result.trim(),
            from: typeof from === "string" && stripHtml(from).result.trim()
        }

        const { error } = messageSchema.validate(sanitizedMessage, { abortEarly: false })
        if (error) {
            return res.status(422).json({ error: error.details.map(detail => detail.message) });
        }

        const participantExists = await db.collection("participants").findOne({ name: sanitizedMessage.from })
        if (!participantExists) {
            return res.status(422).json({ error: `O participante '${sanitizedMessage.from}' não é válido.` })
        }

        const message = { ...sanitizedMessage, time }
        await db.collection("messages").insertOne(message)
        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message);
    }

})

app.post('/status', async (req, res) => {
    const user = req.headers.user;
    const db = getDatabase()
    const sanitizedUser = stripHtml(user).result.trim();

    if (!user) {
        res.sendStatus(404)
    }

    try {
        const participantExists = await db.collection("participants").findOne({ name: sanitizedUser })
        if (!participantExists) {
            return res.status(404)
        }

        await db.collection("participants").updateOne(
            { name: sanitizedUser }, { $set: { lastStatus: Date.now() } }
        )

        res.sendStatus(200)
    } catch (err) {
        res.status(500).send(err.message);
    }

})

app.delete("/messages/:id", async (req, res) => {

    try {
        const { user } = req.headers;
        const { id } = req.params;
        const db = getDatabase()

        const message = await db.collection("messages").findOne({ _id: new ObjectId(id) })
        if (!message) {
            return res.status(404).json({ error: 'A mensagem não foi encontrada.' });
        }
        if (message.from !== user) {
            return res.status(401).json({ error: 'Usuário não autorizado para excluir a mensagem.' });
        }

        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
        res.sendStatus(204)

    } catch (err) {
        res.status(500).send(err.message);
    }

})

app.put("/messages/:id", async (req, res) => {
    const { user } = req.headers;
    const { id } = req.params;
    const { to, text, type } = req.body;
    const db = getDatabase()


    const { error } = messageSchema.validate({ to, text, type, from: user }, { abortEarly: false })
    if (error) {
        return res.status(422).json({ error: error.details.map(detail => detail.message) });
    }

    try {
        const participantExists = await db.collection("participants").findOne({ name: user })
        if (!participantExists) return res.status(422).json({ error: "Usuário  saiu da sala" })


        const message = await db.collection("messages").findOne({ _id: new ObjectId(id) })
        if (!message) return res.sendStatus(404)
        if (message.from !== user) return res.sendStatus(401)


        await db.collection("messages").updateOne({ _id: new ObjectId(id) }, { $set: { to, text, type }})
        res.sendStatus(200)
    } catch (err) {
        res.status(500).send(err.message);
    }

})


setInterval(async () => {
    try {
        const db = getDatabase()
        const tenSecondsAgo =  Date.now() - 10000
        const participants = await db.collection("participants").find({ lastStatus: { $lt: tenSecondsAgo } }).toArray();

        if (participants.length > 0){
            const statusMessage = participants.map(inative =>{
                return {
                    from: inative.from,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: time
                }
            })
            await db.collection("messages").insertMany(statusMessage)
            await db.collection("participants").deleteMany({ lastStatus: { $lt: tenSecondsAgo } })
        }


    } catch (err) {
        console.log(err.message);
    }

}, 15000);




app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`)
})
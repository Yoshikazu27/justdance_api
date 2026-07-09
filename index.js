import express from 'express';
import fs from 'fs/promises';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import { updateGithub } from './services/github.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

const baseImageUrl = 'https://cdn-jdnplus-global.ramaprojects.ru/cdn/songs/';
const basePreviewUrl = 'https://cdn-jdnplus-global.ramaprojects.ru/sneakpeak/';
const port = process.env.PORT || 3000;
const adminApiKey = process.env.ADMIN_API_KEY;

const requireApiKey = (req, res, next) => {
    if (!adminApiKey) {
        return res.status(500).json({ error: "API key not configured on server" });
    }
    const key = req.headers["x-api-key"];
    if (key !== adminApiKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

const readData = async () => {
    try {
        const data = await fs.readFile('./songs-list.json');
        return JSON.parse(data);
    } catch (error) {
        console.log(error);
        return null;
    }
}

const writeData = async (data, message) => {
    try {
        await fs.writeFile('./songs-list.json', JSON.stringify(data, null, 2));

        await updateGithub(data, message);

    } catch (error) {
        console.error(error);
    }
}

app.get('/api/', (req, res) => {
    res.send('Welcome to my Just Dance Now Plus Catalogue!');
});

app.get('/api/songs', async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    res.json(data.songs.filter(song => song.available));
});

app.get('/api/songs/:id', async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const id = parseInt(req.params.id);
    const song = data.songs.find((song) => song.id === id);
    if (!song) {
        return res.status(404).json({ error: "Song not found" });
    }
    res.json(song);
});

app.get('/api/songs/name/:name', async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const name = decodeURIComponent(req.params.name);
    const song = data.songs.find((song) => song.name === name);
    if (!song) {
        return res.status(404).json({ error: "Song not found" });
    }
    res.json(song);
});

app.get('/api/songs/filter/:text', async (req, res) => {
    const isAdmin = req.headers["x-api-key"] === adminApiKey;

    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const text = decodeURIComponent(req.params.text.toLowerCase());
    const songs = data.songs.filter((song) => {
        const matches = [song.name, song.artist]
            .some(y => y.toLowerCase().includes(text));
        return matches && (isAdmin || song.available);
    });
    res.json(songs);
});

app.get('/api/allsongs', requireApiKey, async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    res.json(data.songs);
});

app.get('/ping', (req, res) => {
    res.send('OK');
});

app.post('/api/songs', requireApiKey, async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const body = req.body;
    const requiredFields = ["name", "artist", "difficulty", "image", "preview"];
    const missingField = requiredFields.find(field => body[field] === undefined);
    if (missingField) {
        return res.status(400).json({ message: `Missing required field: ${missingField}` });
    }
    const newSong = {
        id: Math.max(...data.songs.map(s => s.id), 0) + 1,
        ...body,
        image: `${baseImageUrl}${body.image}`,
        preview: `${basePreviewUrl}${body.preview}`,
        available: true
    }
    data.songs.push(newSong);
    await writeData(data, `Added song: ${newSong.name}`);
    res.json(newSong);
});

app.put('/api/songs/:id', requireApiKey, async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const body = req.body;
    const id = parseInt(req.params.id);
    const songIndex = data.songs.findIndex((song) => song.id === id);

    if (songIndex === -1) {
        return res.status(404).json({ message: 'Song not found' });
    }

    const updatedFields = { ...body };

    if (body.image) {
        updatedFields.image = `${baseImageUrl}${body.image}`;
    }

    if (body.preview) {
        updatedFields.preview = `${basePreviewUrl}${body.preview}`;
    }

    data.songs[songIndex] = {
        ...data.songs[songIndex],
        ...updatedFields
    };
    await writeData(data, `Updated song: ${newSong.name}`);
    res.json(data.songs[songIndex]);
});

app.delete('/api/songs/:id', requireApiKey, async (req, res) => {
    const data = await readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const id = parseInt(req.params.id);
    const songIndex = data.songs.findIndex((song) => song.id === id);

    if (songIndex === -1) {
        return res.status(404).json({ message: 'Song not found' });
    }

    data.songs.splice(songIndex, 1);
    await writeData(data, `Deleted song: ${newSong.name}`);
    res.json({ message: 'Song deleted' });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
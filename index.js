import express from 'express';
import fs, { read } from 'fs';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
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
app.use((req, res, next) => {
    if (req.method !== "GET") {
        return requireApiKey(req, res, next);
    }
    next();
});

const readData = () => {
    try {
        const data = fs.readFileSync('./db.json');
        return JSON.parse(data);
    } catch (error) {
        console.log(error);
        return null;
    }
}

const writeData = (data) => {
    try {
        fs.writeFileSync('./db.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(error);
    }
}

app.get('/api/', (req, res) => {
    res.send('Welcome to my Just Dance Now Plus Catalogue!');
});

app.get('/api/songs', (req, res) => {
    const data = readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    res.json(data.songs.filter(song => song.available));
});
app.get('/api/songs/:id', (req, res) => {
    const data = readData();
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

app.get('/api/songs/filter/:text', (req, res) => {
    const data = readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const text = req.params.text.toLowerCase();
    const songs = data.songs.filter((song) => [song.name, song.artist].some(y => y.toLowerCase().includes(text)));
    res.json(songs);
});

app.get('/api/songs/all', (req, res) => {
    const data = readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    res.json(data.songs);
});


app.post('/api/songs', (req, res) => {
    const data = readData();
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
    writeData(data);
    res.json(newSong);
});

app.put('/api/songs/:id', (req, res) => {
    const data = readData();
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
    writeData(data);
    res.json(data.songs[songIndex]);
});

app.delete('/api/songs/:id', (req, res) => {
    const data = readData();
    if (!data) {
        return res.status(500).json({ message: 'Database error' });
    }
    const id = parseInt(req.params.id);
    const songIndex = data.songs.findIndex((song) => song.id === id);

    if (songIndex === -1) {
        return res.status(404).json({ message: 'Song not found' });
    }

    data.songs.splice(songIndex, 1);
    writeData(data);
    res.json({ message: 'Song deleted' });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
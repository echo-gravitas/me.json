import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jsonfile from 'jsonfile';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();
const PORT = process.env.PORT || 3000;
const JSON_FILE = './me.json';

app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET'],
  })
);

app.get('/:id/:key?', async (req, res) => {
  const { key } = req.params;

  try {
    const data = await jsonfile.readFile(JSON_FILE);
    if (!key) return res.json(data);
    return data[key] !== undefined
      ? res.json({ [key]: data[key] })
      : res.status(404).json({ error: 'Key not found' });
  } catch (err) {
    res.status(500).json({ error: 'Error reading JSON file' });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 API is running on http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

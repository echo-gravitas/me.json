import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pkg from 'pg';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const app = express();
const PORT = process.env.PORT;
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET'],
  })
);

// Root

app.get('/', async (_req, res) => {
  try {
    res.status(400).json({
      error: 'Bad Request',
      details: 'Please provide a user ID at least.',
    });
    console.log(`🔥 Bad request, no user ID provided.`);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Get the JSON file

app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT data FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: `A user with ID ${id} does not exist.` });
    }

    res.json(result.rows[0].data);
    console.log(`🔥 Data for user with ID ${id} requested.`);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Get specific value of a user JSON

app.get('/:id/:key', async (req, res) => {
  try {
    const { id, key } = req.params;
    const query = 'SELECT data->$1 AS value FROM users WHERE id = $2';
    const result = await pool.query(query, [key, id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: `A user with ID ${id} does not exist.` });
    }

    if (result.rows[0].value === null) {
      return res
        .status(404)
        .json({ error: `Key '${key}' not found for user ${id}.` });
    }

    res.json({ [key]: result.rows[0].value });
    console.log(`🔥 ${key} for user with ID ${id} requested.`);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 API is running on http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

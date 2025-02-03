import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pkg from 'pg';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();
const PORT = process.env.PORT || 3000;
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

// Get the JSON file

app.get('/:id', async (req, res) => {
  try {
    const query = 'SELECT data FROM users WHERE id = $1';
    const result = await pool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0].data);
  } catch {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get specific value of a user JSON

app.get('/:id/:key', async (req, res) => {
  try {
    const { id, key } = req.params;
    const query = 'SELECT data->$1 AS value FROM users WHERE id = $2';
    const result = await pool.query(query, [key, id]);

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.status(404).json({ error: 'Key not found' });
    }

    res.json({ [key]: result.rows[0].value });
  } catch {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 API is running on http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

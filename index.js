import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pkg from 'pg';
import schema from './schema.json' with { type: 'json' };
import { nanoid } from 'nanoid';

dotenv.config({ path: '.env' });

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
app.use(express.json());
app.use(
  cors({
    origin: '*',
    methods: ['GET'],
  })
);

/**
 * Root route
 */

app.get('/', async (req, res) => {
  try {
    console.log(`❌ ${req.ip} has not provided a user ID.`);
    res.status(400).json({
      error: 'Bad Request',
      details:
        'Please provide a user ID at least. Or request /users to get a list of all available user IDs.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Get the latest me.json schema
 */

app.get('/schema', async (req, res) => {
  try {
    console.log(`🔥 ${req.ip} requested the JSON schema.`);
    res.json(schema);
  } catch (error) {
    res.status(500).json({ error: 'Could not send JSON schema.' });
  }
});

/**
 * Get and display all user IDs in the database
 */

app.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT id
      FROM users
    `;
    const result = await pool.query(query);

    const userIDs = result.rows.map((row) => row.id);

    console.log(`🔥 ${req.ip} requested a list of all available user IDs.`);
    res.json({ userIDs });
  } catch {
    console.error(`❌ Database error: ${error.message}`);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Get JSON data for a specific user
 */

app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT data
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      console.log(
        `❌ ${req.ip}: requested data for a non-existing user with ID ${id}.`
      );
      return res
        .status(404)
        .json({ error: `The user with ID ${id} does not exist.` });
    }

    console.log(
      `🔥 ${req.ip} requested the dataset for the user with ID ${id}.`
    );
    res.json(result.rows[0].data);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Get a specific key/value pair for a given user ID
 */

app.get('/:id/:key', async (req, res) => {
  try {
    const { id, key } = req.params;

    const existsQuery = `
      SELECT jsonb_exists(data, $1)
      AS key_exists
      FROM users
      WHERE id = $2
    `;

    const existsResult = await pool.query(existsQuery, [key, id]);

    if (existsResult.rows.length === 0) {
      console.log(
        `❌ ${req.ip} requested data for a non-existing user with ID ${id}.`
      );
      return res
        .status(404)
        .json({ error: `The user with ID ${id} does not exist.` });
    }

    if (!existsResult.rows[0].key_exists) {
      console.log(
        `❌ ${req.ip} requested the non-existing key '${key}' for the user with ID ${id}.`
      );
      return res.status(404).json({
        error: `The key '${key}' doesn't exist in the dataset of user ${id}.`,
      });
    }

    const query = `
      SELECT data->$1
      AS value
      FROM users
      WHERE id = $2
    `;

    const result = await pool.query(query, [key, id]);

    res.json({ [key]: result.rows[0].value });
    console.log(`🔥 ${req.ip} requested '${key}' for user with ID ${id}.`);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Get JSON from form and save to database
 */

app.post('/users', async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'You have not provided any JSON payload.',
      });
    }

    const id = nanoid();

    const query = `
      INSERT INTO users (id, data)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await pool.query(query, [id, data]);

    console.log(`🔥 New entry with ID ${id} created successfully.`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Start server and listen to a port
 */

app.listen(PORT, () => {
  console.log(
    `🚀 API is running on http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

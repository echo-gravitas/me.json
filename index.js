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
 * Root route: No user ID provided.
 */
app.get('/', async (req, res) => {
  try {
    console.log(`❌ ${req.ip} did not provide a user ID.`);
    res.status(400).json({
      error: 'Bad Request',
      details:
        'Please provide at least a user ID, or request /users to get a list of available user IDs.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Returns the latest me.json schema.
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
 * Retrieves and displays all user IDs in the database.
 */
app.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT id
      FROM users
    `;
    const result = await pool.query(query);
    const userIDs = result.rows.map((row) => row.id);
    console.log(`🔥 ${req.ip} requested the list of all available user IDs.`);
    res.json({ userIDs });
  } catch (error) {
    console.error(`❌ Database error: ${error.message}`);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Retrieves JSON data for a specific user.
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
        `❌ ${req.ip} requested data for non-existent user with ID ${id}.`
      );
      return res
        .status(404)
        .json({ error: `User with ID ${id} does not exist.` });
    }

    console.log(`🔥 ${req.ip} requested the dataset for user with ID ${id}.`);
    res.json(result.rows[0].data);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Retrieves nested JSON data for a user based on a key path.
 * Examples:
 *   - GET /5Vv7P2q9ys8V_8iKrM1ir/career
 *       → returns { "career": { ... } }
 *   - GET /5Vv7P2q9ys8V_8iKrM1ir/career/current_positions
 *       → returns { "current_positions": [ ... ] }
 */
/**
 * Retrieves nested JSON data for a user based on a key path.
 * Examples:
 *   - GET /5Vv7P2q9ys8V_8iKrM1ir/career
 *       → returns { "career": { ... } }
 *   - GET /5Vv7P2q9ys8V_8iKrM1ir/career/current_positions
 *       → returns { "current_positions": [ ... ] }
 *
 * This version distinguishes between non-existent key paths and existing key paths with null values.
 */
app.get('/:id/*', async (req, res) => {
  try {
    const { id } = req.params;
    // The wildcard parameter (everything after "/:id/") is stored in "0".
    const keyPath = req.params['0'];
    const keys = keyPath.split('/');

    // Check if the user exists by fetching the entire JSON data.
    const userQuery = `SELECT data FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      console.log(
        `❌ ${req.ip} requested data for non-existent user with ID ${id}.`
      );
      return res
        .status(404)
        .json({ error: `User with ID ${id} does not exist.` });
    }

    // Get the complete JSON object.
    let value = userResult.rows[0].data;

    // Traverse the JSON object using the provided key path.
    for (const key of keys) {
      if (
        value !== null &&
        typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, key)
      ) {
        value = value[key];
      } else {
        console.log(
          `❌ ${req.ip} requested non-existent key path '${keyPath}' for user ${id}.`
        );
        return res.status(404).json({
          error: `The key path '${keyPath}' does not exist in user ${id}'s data.`,
        });
      }
    }

    // Even if 'value' is null, the key path exists.
    const lastKey = keys[keys.length - 1];
    const responseData = { [lastKey]: value };

    console.log(
      `🔥 ${req.ip} requested key path '${keyPath}' for user with ID ${id}.`
    );
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

/**
 * Receives JSON from a form and saves it to the database.
 */
app.post('/users', async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No JSON payload provided.',
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
 * Starts the server and listens on the specified port.
 */
app.listen(PORT, () => {
  console.log(
    `🚀 API is running on http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

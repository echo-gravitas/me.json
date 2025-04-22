import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pkg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import logger from "./logger.js";

// Dynamically select the correct .env file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "test"
      ? ".env.test"
      : ".env.development";

dotenv.config({ path: envFile });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 3001;
const SCHEMA_PATH = path.join(__dirname, "schema.json");
const ME_JSON_PATH = path.join(__dirname, "me.json");
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
    origin: "*",
    methods: ["GET"],
  }),
);

/**
 * Recursively sanitizes a JSON object by replacing all string values with empty strings,
 * all numbers with 0, and preserving the structure. Used to generate a schema template.
 * @param {any} data - The JSON data to sanitize.
 * @returns {any} The sanitized JSON object.
 */
const sanitizeJson = (data) => {
  if (Array.isArray(data)) {
    return data.length > 0 ? [sanitizeJson(data[0])] : [];
  } else if (typeof data === "object" && data !== null) {
    let sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeJson(data[key]);
    }
    return sanitized;
  } else if (typeof data === "string") {
    return "";
  } else if (typeof data === "number") {
    return 0;
  } else {
    return data;
  }
};

/**
 * Updates the schema.json file by sanitizing the me.json file.
 * If neither file exists, logs an error and exits the process.
 */
const updateSchema = () => {
  try {
    if (fs.existsSync(ME_JSON_PATH)) {
      const rawData = fs.readFileSync(ME_JSON_PATH, "utf-8");
      const parsedData = JSON.parse(rawData);
      const sanitizedData = sanitizeJson(parsedData);
      fs.writeFileSync(SCHEMA_PATH, JSON.stringify(sanitizedData, null, 2));
      logger.info("🔥 schema.json updated successfully");
    } else if (!fs.existsSync(SCHEMA_PATH)) {
      logger.error(
        "❌ Neither me.json nor schema.json exists. Server shutting down",
      );
      process.exit(1);
    }
  } catch (error) {
    logger.error("❌ Error updating schema.json: %s", error.message);
    process.exit(1);
  }
};

updateSchema(); // Initial check and update before starting the server

/**
 * Root route handler.
 * Returns a 400 error if no user ID is provided.
 * @route GET /
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.get("/", async (req, res) => {
  try {
    logger.warn(
      `❌ ${req.headers["x-forwarded-for"] || req.ip} did not provide a user ID`,
    );
    res.status(400).json({
      error: "Bad Request",
      details:
        "Please provide at least a user ID, or request /users to get a list of available user IDs",
    });
  } catch (error) {
    logger.error("Database error: %s", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

/**
 * Returns the latest me.json schema.
 * @route GET /schema
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.get("/schema", (req, res) => {
  try {
    const schemaData = fs.readFileSync(SCHEMA_PATH, "utf-8");
    logger.info(
      `🔥 ${req.headers["x-forwarded-for"] || req.ip} requested the schema JSON file`,
    );
    res.json(JSON.parse(schemaData));
  } catch (error) {
    logger.error("❌ Could not send JSON schema");
    res.status(500).json({ error: "Could not send JSON schema" });
  }
});

/**
 * Retrieves and displays all user IDs in the database.
 * @route GET /users
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.get("/users", async (req, res) => {
  try {
    const query = `
      SELECT id
      FROM users
    `;
    const result = await pool.query(query);
    const userIDs = result.rows.map((row) => row.id);
    logger.info(
      `🔥 ${req.headers["x-forwarded-for"] || req.ip} requested the list of all available user IDs`,
    );
    res.json({ userIDs });
  } catch (error) {
    logger.error(`❌ Database error: ${error.message}`);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

/**
 * Retrieves JSON data for a specific user.
 * @route GET /:id
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT data
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      logger.warn(
        `❌ ${req.headers["x-forwarded-for"] || req.ip} requested data for non-existent user with ID ${id}`,
      );
      return res
        .status(404)
        .json({ error: `User with ID ${id} does not exist` });
    }

    logger.info(
      `🔥 ${req.headers["x-forwarded-for"] || req.ip} requested the dataset for user with ID ${id}`,
    );
    res.json(result.rows[0].data);
  } catch (error) {
    logger.error("Database error: %s", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

/**
 * Safely traverses a nested object using a key path (e.g., "foo/bar/0").
 * Supports array access and filters out empty keys.
 * @param {object|array} obj - The object or array to traverse.
 * @param {string} keyPath - The key path, separated by slashes.
 * @param {number} [maxDepth=10] - Maximum allowed depth for traversal.
 * @returns {{ value?: any, error?: string }} The value at the key path, or an error message.
 */
const getValueByKeyPath = (obj, keyPath, maxDepth = 10) => {
  if (!keyPath) return { error: "No key path provided" };
  const keys = keyPath.split("/").filter((k) => !!k);

  if (keys.length === 0) return { error: "No key path provided" };
  if (keys.length > maxDepth)
    return { error: `Key path too deep (max ${maxDepth})` };

  let value = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (Array.isArray(value) && /^\d+$/.test(key)) {
      const idx = Number(key);
      if (idx < value.length) {
        value = value[idx];
      } else {
        return { error: `Array index '${key}' out of bounds` };
      }
    } else if (
      value !== null &&
      typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, key)
    ) {
      value = value[key];
    } else {
      return { error: `Key '${key}' does not exist` };
    }
  }
  return { value };
};

/**
 * Retrieves nested JSON data for a user based on a key path.
 * @route GET /:id/*
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.get("/:id/*", async (req, res) => {
  try {
    const { id } = req.params;
    const keyPath = req.params["0"];

    // Check if the user exists by fetching the entire JSON data.
    const userQuery = "SELECT data FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      logger.warn(
        `❌ ${req.headers["x-forwarded-for"] || req.ip} requested data for non-existent user with ID ${id}`,
      );
      return res
        .status(404)
        .json({ error: `User with ID ${id} does not exist` });
    }

    const { value, error } = getValueByKeyPath(
      userResult.rows[0].data,
      keyPath,
    );

    if (error) {
      logger.warn(
        `❌ ${req.headers["x-forwarded-for"] || req.ip} requested invalid key path '${keyPath}' for user ${id}: ${error}`,
      );
      return res.status(404).json({
        error: `Invalid key path: ${error}`,
      });
    }

    // Respond with the last key and its value, or the value itself if it's a primitive/array/object
    const keys = keyPath.split("/").filter(Boolean);
    const lastKey = keys.length > 0 ? keys[keys.length - 1] : undefined;
    const responseData = lastKey ? { [lastKey]: value } : value;
    logger.info(
      `🔥 ${req.headers["x-forwarded-for"] || req.ip} requested key path '${keyPath}' for user with ID ${id}`,
    );
    res.json(responseData);
  } catch (error) {
    logger.error("Database error: %s", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

/**
 * Receives JSON from a form and saves it to the database.
 * @route POST /add
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 */
app.post("/add", async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        error: "Bad Request",
        details: "No JSON payload provided",
      });
    }

    const id = nanoid();

    const query = `
      INSERT INTO users (id, data)
      VALUES ($1, $2)
      RETURNING id
    `;
    const result = await pool.query(query, [id, data]);

    logger.info(
      `🔥 ${req.headers["x-forwarded-for"] || req.ip} successfully created a new entry with ID ${id}`,
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Database error: %s", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

/**
 * Starts the server and listens on the specified port.
 * Only runs if not in test mode.
 */
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(
      `🚀 API is running on ${process.env.PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
}

export { app, pool };
export default app;

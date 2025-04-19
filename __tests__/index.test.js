import request from "supertest";
import { app, pool } from "../index.js";

describe("API Endpoints", () => {
  afterAll(async () => {
    await pool.end();
  });
  it("should return 400 on GET / without user ID", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Bad Request");
  });
  it("should return the schema on GET /schema", async () => {
    const res = await request(app).get("/schema");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("personal_info");
    expect(res.body).toHaveProperty("contact_info");
  });
  it("should return an array of all available userIDs on GET /uers", async () => {
    const res = await request(app).get("/users");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("userIDs");
  });
});

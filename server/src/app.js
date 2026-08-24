import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import meetingRoutes from "./routes/meetingRoutes.js";
import { initDatabase } from "./database/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Initialize database check asynchronously
initDatabase().catch((err) => console.error("Database init error:", err));

app.use(cors());
app.use(express.json());

// Simple request log — useful during the demo / grading walkthrough.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/meetings", meetingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Centralized error handler. Every controller forwards errors here via next(err)
// so failure responses stay consistent across the API.
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || "Something went wrong. Please try again.",
  });
});

app.listen(PORT, () => {
  console.log(`Meeting Summarizer API listening on http://localhost:${PORT}`);
});

export default app;

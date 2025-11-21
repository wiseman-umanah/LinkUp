import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

mongoose.set("strictQuery", true);

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${maxAttempts})`);
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info("MongoDB connection established");
      return mongoose.connection;
    } catch (err) {
      logger.error("MongoDB connection attempt failed", err);
      if (attempt >= maxAttempts) {
        throw err;
      }
      const backoff = attempt * 1000;
      await delay(backoff);
    }
  }
  throw new Error("Unable to connect to MongoDB");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

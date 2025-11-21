import mongoose from "mongoose";
import { env } from "../config/env.js";

mongoose.set("strictQuery", true);

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  return mongoose.connection;
}

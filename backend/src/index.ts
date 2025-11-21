import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./lib/mongo.js";
import { logger } from "./lib/logger.js";

async function bootstrap() {
  await connectMongo();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Backend listening on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

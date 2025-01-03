const { createClient } = require("@redis/client"); // Import the updated Redis client

const redisClient = createClient({
  url: process.env.REDIS_URL, // Default Redis server URL (localhost on port 6379)
});

redisClient.connect().catch((err) => {
  console.error("Error connecting to Redis:", err);
});

redisClient.on("error", (err) => {
  console.log("Redis Client Error:", err);
});

module.exports = redisClient;

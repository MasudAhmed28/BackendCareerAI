const express = require("express");
const User = require("../models/UserSchema");
const {
  CreateUser,
  getUser,
  createCase,
} = require("../Controller/UserController");
const {
  createRoadmap,
  getRoadMapforUser,
  updateStatus,
  updateCompleteStatus,
} = require("../Controller/RoadMapController");
const {
  createQuestion,
  createReply,
  getQuestions,
  getReplies,
  upVoteQuestion,
  upVoteReplies,
} = require("../Controller/QnAController");

const verifyToken = require("../middleware/authMiddleware");
const redisClient = require("../RedisClient");

const router = express.Router();

// Cached middleware function
const cachedMiddleware = (keyFunction) => async (req, res, next) => {
  try {
    const key = keyFunction(req); // Generate the key dynamically
    console.log("Cache Key:", key); // Debugging log

    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return res.json(JSON.parse(cachedData)); // Return cached data if found
    }

    next(); // Proceed to next middleware if no cached data
  } catch (error) {
    console.error("Error in cache middleware:", error);
    next(); // Proceed even if there's an error with the cache
  }
};

// Register routes
router.post("/createUser", CreateUser);
router.post("/saveRoadMap", createRoadmap);
router.get("/getRoadMap", verifyToken, getRoadMapforUser);
router.get("/getUserName", verifyToken, getUser);
router.post("/updateStatus", updateStatus);
router.post("/markComplete", updateCompleteStatus);
router.post("/createCase", createCase);

router.post("/questions", createQuestion);
router.get(
  "/questions",
  cachedMiddleware(() => "questions"),
  getQuestions
);
router.post("/questions/:id/replies", createReply);
router.get(
  "/questions/:id/replies",
  cachedMiddleware((req) => `replies_${req.params.id}`),
  getReplies
);
router.patch("/question/:id/upvote", upVoteQuestion);
router.patch("/replies/:id/upvote", upVoteReplies);

module.exports = router;

// routes/authRoutes.js
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
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Register route
router.post("/createUser", CreateUser);

router.post("/saveRoadMap", createRoadmap);
router.get("/getRoadMap", verifyToken, getRoadMapforUser);
router.get("/getUserName", verifyToken, getUser);
router.post("/updateStatus", updateStatus);
router.post("/markComplete", updateCompleteStatus);
router.post("/createCase", createCase);
module.exports = router;

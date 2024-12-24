const mongoose = require("mongoose");

const SubTopicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["not started", "in progress", "completed"],
    default: "not started",
  },
});

const TopicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  subtopics: [SubTopicSchema],
  status: {
    type: String,
    enum: ["not started", "in progress", "completed"],
    default: "not started",
  },
});

const RoadMapSchema = new mongoose.Schema({
  name: { type: String, required: true },
  topics: [TopicSchema],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedTopic: { type: [String], default: [] },
  completedSubTopic: { type: [String], default: [] },
});

const Roadmap = mongoose.model("Roadmap", RoadMapSchema);
module.exports = Roadmap;

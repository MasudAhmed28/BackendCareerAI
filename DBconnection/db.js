const mongoose = require("mongoose");
const Roadmap = require("../models/RoadMapSchema");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("connected to database");

    const changeStream = Roadmap.watch([
      { $match: { operationType: "update" } },
    ]);
    changeStream.on("change", async (change) => {
      console.log("change detected in Roadmap Collection: ", change);
      const roadmapId = change.documentKey._id;

      await handleStatusChange(roadmapId);

      console.log("Listening to change in Roadmap Collection");
    });
    changeStream.on("error", (error) => {
      console.error("Error in Change Stream: ", error);
      setTimeout(() => connectDB, 5000);
    });
    changeStream.on("close", (error) => {
      console.log("Change Stream closed. Reconnecting...");
      setTimeout(() => connectDB(), 5000);
    });
  } catch (error) {
    console.log("Error setting up change stream: " + error);
  }
};

async function handleStatusChange(roadmapId) {
  try {
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      console.log("Roadmap Not found", roadmap);
    }
    roadmap.topics.forEach((topic) => {
      let isAnySubtopicInProgress = false;
      let areAllSubtopicCompleted = true;

      topic.subtopics.forEach((subtopic) => {
        if (subtopic.status === "in progress") {
          isAnySubtopicInProgress = true;
        }
        if (subtopic.status !== "completed") {
          areAllSubtopicCompleted = false;
        }
      });
      if (isAnySubtopicInProgress) {
        topic.status = "in progress";
      } else if (areAllSubtopicCompleted) {
        topic.status = "completed";
      } else {
        topic.status = "not started";
      }
    });
    await roadmap.save();
    console.log("Updated topic statuses in roadmap:", roadmapId);
  } catch (error) {
    console.error("Error handling status change: ", error);
  }
}
module.exports = connectDB;

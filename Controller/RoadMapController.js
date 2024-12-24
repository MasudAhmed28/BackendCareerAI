const Roadmap = require("../models/RoadMapSchema");
const User = require("../models/UserSchema");

const createRoadmap = async (req, res) => {
  const { name, topics, userId } = req.body;

  try {
    const user = await User.findOne({ firebaseUID: userId });

    const idUser = user._id;

    const RoadmapData = new Roadmap({
      name,
      topics,
      userId: idUser,
    });
    const savedRoadmapData = await RoadmapData.save();
    res.status(200).json("Roadmaps saved");
  } catch (error) {
    console.log(error);
    res.status(400).json("Roadmap wasnt saved");
  }
};

const getRoadMapforUser = async (req, res) => {
  const { uid } = req.query;

  try {
    const user = await User.findOne({ firebaseUID: uid });

    const idUser = user._id;

    const roadmapData = await Roadmap.findOne({ userId: idUser });

    if (roadmapData) {
      res
        .status(200)
        .json({ message: "Roadmap found for user", data: roadmapData });
    } else {
      res.status(204).json({ message: "Roadmap not found", data: "newuser" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("Internl server error");
  }
};

const updateStatus = async (req, res) => {
  try {
    const { topicId, subtopicid, uid } = req.body;
    if (!topicId || !subtopicid || !uid) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const { roadmapData, topic } = await findTopic(topicId, subtopicid, uid);

    if (!topic) return;
    const subtopic = await topic.subtopics.find((s) => s._id == subtopicid);
    if (!subtopic) {
      return res.status(404).json({ error: "Subtopic not found." });
    }
    if (subtopic.status === "not started") {
      subtopic.status = "in progress";
      await roadmapData.save();
    }

    res.status(200).json({ message: "Status updated successfully." });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

const findTopic = async (topicId, subtopicid, uid) => {
  try {
    const user = await User.findOne({ firebaseUID: uid });
    if (!user) {
      return null;
    }
    const idUser = user.id;
    const roadmapData = await Roadmap.findOne({ userId: idUser });

    if (!roadmapData) {
      return null;
    }
    console.log(topicId);
    const topic = await roadmapData.topics.find((t) => t._id == topicId);
    console.log(topic);
    if (!topic) {
      return null;
    }
    return { roadmapData, topic };
  } catch (error) {
    console.error("Error finding topic:", error);

    return null;
  }
};

const updateCompleteStatus = async (req, res) => {
  try {
    const { uid, topicId, subtopicid } = req.body;
    console.log("update complete req body:", req.body);
    if (!topicId || !subtopicid || !uid) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const { roadmapData, topic } = await findTopic(topicId, subtopicid, uid);
    if (!topic) return;
    const subtopic = await topic.subtopics.find((s) => s._id == subtopicid);
    if (!subtopic) {
      return res.status(404).json({ error: "Subtopic not found." });
    }
    if (subtopic.status !== "completed") {
      subtopic.status = "completed";
      await roadmapData.save();
    }
    res.status(200).json({ message: "Status updated successfully." });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

module.exports = {
  createRoadmap,
  getRoadMapforUser,
  updateStatus,
  updateCompleteStatus,
};

const { Question, Reply } = require("../models/QnASchema");
const redisClient = require("../RedisClient");
const admin = require("firebase-admin");

const getUserInfo = async (firebaseUID) => {
  try {
    const userRecord = await admin.auth().getUser(firebaseUID);
    return {
      name: userRecord.displayName || "Anonymous",
      photo: userRecord.photoURL || "/default-avatar.png",
    };
  } catch (error) {
    console.error(`Error fetching user info for UID: ${firebaseUID}`, error);
    return {
      name: "Anonymous",
      photo: "/default-avatar.png",
    };
  }
};

const createQuestion = async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    await redisClient.del("questions");

    // Fetch user info
    const userInfo = await getUserInfo(req.body.userId);

    // Return the question with userInfo
    res.status(201).json({ ...question.toObject(), userInfo });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const getQuestions = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const questions = await Question.find()
      .sort({ timeStamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enrichedQuestions = await Promise.all(
      questions.map(async (question) => {
        const userInfo = await getUserInfo(question.userId);
        return {
          ...question.toObject(),
          userInfo,
        };
      })
    );

    await redisClient.setEx(
      "questions",
      3600,
      JSON.stringify(enrichedQuestions)
    );

    res.json(enrichedQuestions);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const createReply = async (req, res) => {
  console.log(req.body, req.params.id);
  try {
    const reply = new Reply({
      ...req.body,
      questionId: req.params.id,
      userId: req.body.userId,
    });
    await reply.save();

    await Question.findByIdAndUpdate(req.params.id, {
      $inc: { replyCount: 1 },
    });
    const userInfo = await getUserInfo(req.body.userId);

    const cacheKey = `replies${req.params.id}`;
    console.log(cacheKey);
    await redisClient.del(cacheKey);

    res.status(201).json({ ...reply.toObject(), userInfo });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const getReplies = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const replies = await Reply.find({ questionId: req.params.id })
      .sort({ timeStamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enrichedReplies = await Promise.all(
      replies.map(async (reply) => {
        const userInfo = await getUserInfo(reply.userId);
        return {
          ...reply.toObject(),
          userInfo,
        };
      })
    );

    const cacheKey = `replies${req.params.id}`;
    console.log(cacheKey);
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(enrichedReplies));

    res.json(enrichedReplies);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const upVoteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["inc", "dec"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const incrementValue = action === "inc" ? 1 : -1;

    const question = await Question.findByIdAndUpdate(
      id,
      { $inc: { upvotes: incrementValue } },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Invalidate the cache for questions after upvoting
    await redisClient.del("questions");

    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const upVoteReplies = async (req, res) => {
  try {
    const { action } = req.body;
    const { id } = req.params;

    if (!["inc", "dec"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    const incrementValue = action === "inc" ? 1 : -1;
    const reply = await Reply.findByIdAndUpdate(
      id,
      { $inc: { upvotes: incrementValue } },
      { new: true }
    );
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    // After upvoting a reply, invalidate the cache for that question's replies
    const replyData = await Reply.findById(req.params.id);
    const cacheKey = `replies${replyData.questionId}`;
    await redisClient.del(cacheKey);

    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  createReply,
  getReplies,
  upVoteQuestion,
  upVoteReplies,
};

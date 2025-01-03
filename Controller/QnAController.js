const { Question, Reply } = require("../models/QnASchema");
const redisClient = require("../RedisClient");
const admin = require("firebase-admin");

// Helper function to fetch user info with caching
const getUserInfo = async (firebaseUID) => {
  const cacheKey = `user:${firebaseUID}`;
  const cachedUser = await redisClient.get(cacheKey);
  if (cachedUser) return JSON.parse(cachedUser);

  try {
    const userRecord = await admin.auth().getUser(firebaseUID);
    const userInfo = {
      name: userRecord.displayName || "Anonymous",
      photo: userRecord.photoURL || "/default-avatar.png",
    };

    // Cache the user info for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(userInfo));
    return userInfo;
  } catch (error) {
    console.error(`Error fetching user info for UID: ${firebaseUID}`, error);
    return {
      name: "Anonymous",
      photo: "/default-avatar.png",
    };
  }
};

// Invalidate all questions cache
const invalidateQuestionsCache = async () => {
  const keys = await redisClient.keys("questions:page=*");
  if (keys.length) {
    await redisClient.del(...keys);
  }
};

const invalidateRepliesForQuestion = async (questionId) => {
  const keys = await redisClient.keys(`replies:questionId=${questionId}:*`);
  if (keys.length) {
    await redisClient.del(...keys);
  }
};

const createQuestion = async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();

    // Invalidate cache
    await invalidateQuestionsCache();

    const userInfo = await getUserInfo(req.body.userId);
    res.status(201).json({ ...question.toObject(), userInfo });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// Get paginated questions with caching
const getQuestions = async (req, res) => {
  const { page = 1, limit = 10, userId } = req.query;
  const redisKey = `questions:page=${page}:limit=${limit}`;

  try {
    const cachedQuestions = await redisClient.get(redisKey);
    if (cachedQuestions) {
      return res.json(JSON.parse(cachedQuestions));
    }

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
          isLiked: question.likedBy.includes(userId),
        };
      })
    );

    // Cache the questions
    await redisClient.setEx(redisKey, 3600, JSON.stringify(enrichedQuestions));
    res.json(enrichedQuestions);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// Create a reply
const createReply = async (req, res) => {
  try {
    const reply = new Reply({ ...req.body, questionId: req.params.id });
    await reply.save();

    // Increment reply count in the question
    await Question.findByIdAndUpdate(req.params.id, {
      $inc: { replyCount: 1 },
    });

    // Invalidate replies cache for this question
    await invalidateRepliesForQuestion(req.params.id);
    await invalidateQuestionsCache();

    const userInfo = await getUserInfo(req.body.userId);
    res.status(201).json({ ...reply.toObject(), userInfo });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// Get paginated replies with caching
const getReplies = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const cacheKey = `replies:questionId=${req.params.id}:page=${page}:limit=${limit}`;

  try {
    const cachedReplies = await redisClient.get(cacheKey);
    if (cachedReplies) {
      return res.json(JSON.parse(cachedReplies));
    }

    const replies = await Reply.find({ questionId: req.params.id })
      .sort({ timeStamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enrichedReplies = await Promise.all(
      replies.map(async (reply) => {
        const userInfo = await getUserInfo(reply.userId);
        return { ...reply.toObject(), userInfo };
      })
    );

    // Cache the replies
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(enrichedReplies));
    res.json(enrichedReplies);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// Upvote or downvote a question
const upVoteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, userId } = req.body;

    if (!["inc", "dec"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const alreadyLiked = question.likedBy.includes(userId);

    if (action === "inc") {
      if (alreadyLiked) {
        return res
          .status(400)
          .json({ error: "You have already liked this question" });
      }
      question.likedBy.push(userId);
      question.upvotes += 1;
    } else if (action === "dec") {
      if (!alreadyLiked) {
        return res
          .status(400)
          .json({ error: "You have not liked this question yet" });
      }
      const index = question.likedBy.indexOf(userId);
      question.likedBy.splice(index, 1);
      question.upvotes -= 1;
    }

    await question.save();

    await invalidateQuestionsCache();

    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Upvote or downvote a reply
const upVoteReplies = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, userId } = req.body;

    if (!["inc", "dec"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const reply = await Reply.findById(id);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    const alreadyLiked = reply.likedBy.includes(userId);

    if (action === "inc") {
      if (alreadyLiked) {
        return res
          .status(400)
          .json({ error: "You have already liked this reply" });
      }
      reply.likedBy.push(userId);
      reply.upvotes += 1;
    } else if (action === "dec") {
      if (!alreadyLiked) {
        return res
          .status(400)
          .json({ error: "You have not liked this reply yet" });
      }
      const index = reply.likedBy.indexOf(userId);
      reply.likedBy.splice(index, 1);
      reply.upvotes -= 1;
    }

    await reply.save();

    await invalidateRepliesForQuestion(reply.questionId);

    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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

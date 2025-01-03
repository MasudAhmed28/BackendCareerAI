const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    likedBy: [{ type: String }],
  },
  { versionKey: false }
);

QuestionSchema.index({ timestamp: -1 });

const ReplySchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
      trim: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    likedBy: [{ type: String }],
  },
  { versionKey: false }
);

ReplySchema.index({ questionId: 1, timestamp: -1 });

const Question = mongoose.model("Question", QuestionSchema);
const Reply = mongoose.model("Reply", ReplySchema);

module.exports = { Question, Reply };

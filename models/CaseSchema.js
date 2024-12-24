const mongoose = require("mongoose");
const CaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String },
  status: {
    type: String,
    enum: ["Solved", "Not Solved"],
    default: "Not Solved",
  },
});
const Case = mongoose.model("Case", CaseSchema);
module.exports = Case;

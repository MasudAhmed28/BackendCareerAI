const Case = require("../models/CaseSchema");
const User = require("../models/UserSchema");

const CreateUser = async (req, res) => {
  try {
    const { firebaseUID, name, email } = req.body;
    const duplicateUser = await User.findOne({ firebaseUID });

    let userCreated;
    if (!duplicateUser) {
      const userToCreate = new User({
        firebaseUID,
        name,
        email,
      });
      userCreated = await userToCreate.save();
      res
        .status(201)
        .json({ message: "User created successfully", data: userCreated });
    } else {
      res
        .status(200)
        .json({ message: "User already exists", data: duplicateUser });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ message: "An error occurred while creating the user" });
  }
};

const getUser = async (req, res) => {
  const userid = req.user.user_id;
  try {
    const user = await User.findOne({ firebaseUID: userid });
    if (user) {
      res.status(200).json({ message: "user details found", data: user });
    } else {
      res.status(201).json({ message: "user details not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("internal server error");
  }
};

const createCase = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, message } = req.body.formdata;
    const CaseExists = await Case.findOne({
      status: "Not Solved",
      email: email,
    });
    if (CaseExists) {
      res.status(204).json({ message: "A Case already exist for the User" });
    } else {
      const caseToCreate = new Case({
        name,
        email,
        message,
      });
      const caseCreated = caseToCreate.save();
      res.status(200).json({
        message: "Case Created, Someone from us will connect with you soon",
        data: caseCreated,
      });
    }
  } catch (error) {
    console.error("case error:", error);
    res.status(500).json({ message: "Internal  Server Error" });
  }
};

module.exports = { CreateUser, getUser, createCase };

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  emails: {
    type: [String],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  emailsSent: {
    type: Number,
    default: 0,
  },
  emailsReceived: {
    type: Number,
    default: 0,
  },
  dailyMailCount: {
    type: Number,
    default: 3,
  },
  dailyMailIncrease: {
    type: Number,
    default: 2,
  },
  maxDailyMailCount: {
    type: Number,
    default: 5,
  },
  currentEmailIndex: {
    type: Number,
    default: 0,
  },
});

const User = mongoose.models.user || mongoose.model("User", userSchema);

export default User;

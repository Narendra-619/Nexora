import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  profilePicture: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Middleware to hash the password before saving the user document
// This runs only if the password field is new or has been modified
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // Only hash if password is new or modified

  // Hash the password with a salt factor of 10
  this.password = await bcrypt.hash(this.password, 10);
});

// Instance method to check password validity
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
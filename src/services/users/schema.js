const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, dropDups: true },
    password: { type: String },
    googleId: String,
    refreshTokens: [{ type: String }],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    img: {
      type: String,
      required: true,
      default:
        "https://cdn0.iconfinder.com/data/icons/user-pictures/100/malecostume-512.png",
    },
    favorites: [{ type: String }],
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObj = user.toObject();

  delete userObj.password;
  delete userObj.__v;

  return userObj;
};

UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email });

  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return user;
    else return null;
  } else return null;
};

UserSchema.pre("save", async function (next) {
  const user = this;
  const plainPw = user.password;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(plainPw, 12);
  }

  next();
});

const UserModel = model("User", UserSchema);

module.exports = UserModel;

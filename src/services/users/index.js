const router = require("express").Router();
const UserModel = require("./schema");
const { authenticateUser, refreshToken } = require("../../utils/auth");
const {
  authorizeUser,
  adminOnly,
} = require("../../utils/auth/authMiddlewares");
const passport = require("passport");

router.get("/", authorizeUser, adminOnly, async (req, res, next) => {
  try {
    const users = await UserModel.find();
    res.status(200).send(users);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/me", authorizeUser, async (req, res, next) => {
  try {
    res.status(200).send(req.user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const newUser = new UserModel(req.body);
    const { _id } = await newUser.save();

    const { accessToken, refreshToken } = await authenticateUser(newUser);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/users/refreshToken",
    });
    res.status(201).send(_id);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put("/me", authorizeUser, async (req, res, next) => {
  try {
    const updates = Object.keys(req.body);
    updates.forEach((update) => req.user[update] === req.body[update]);
    await req.user.save();

    res.status(200).send(req.user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete("/me", authorizeUser, async (req, res, next) => {
  try {
    await req.user.deleteOne();

    res.status(203).send("User deleted");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/addToFav", authorizeUser, async (req, res, next) => {
  try {
    const user = req.user;

    await user.updateOne({ $addToSet: { favorites: req.body.favorite } });

    res.status(200).send(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/removeFromFav", authorizeUser, async (req, res, next) => {
  try {
    const user = req.user;

    await user.updateOne({ $pull: { favorites: req.body.favorite } });

    res.status(200).send(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByCredentials(email, password);

    const { accessToken, refreshToken } = await authenticateUser(user);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/users/refreshToken",
    });

    res.send("OK");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/logout", authorizeUser, async (req, res, next) => {
  try {
    newRefreshTokens = req.user.refreshTokens.filter(
      (token) => token.refreshToken !== req.token.refreshToken
    );
    await req.user.updateOne({ refreshTokens: newRefreshTokens });
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.send("ok");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/logoutAll", authorizeUser, async (req, res, next) => {
  try {
    req.user.refreshTokens = [];

    await req.user.save();
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.send();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/refreshToken", async (req, res, next) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    const err = new Error("Refresh token is missing");
    err.httpStatusCode = 400;
    next(err);
  } else {
    try {
      const tokens = await refreshToken(oldRefreshToken);

      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        path: "/",
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        path: "/users/refreshToken",
      });

      res.send("OK");
    } catch (error) {
      console.log(error);
      const err = new Error(error);
      err.httpStatusCode = 403;
      next(err);
    }
  }
});

router.get(
  "/googleLogin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/googleRedirect",
  passport.authenticate("google"),
  async (req, res, next) => {
    try {
      res.cookie("accessToken", req.user.tokens.accessToken, {
        httpOnly: true,
      });

      res.cookie("refreshToken", req.user.tokens.refreshToken, {
        httpOnly: true,
        path: "/users/refreshToken",
      });

      res.status(200).redirect(`${process.env.FE_URL}/home`);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

module.exports = router;

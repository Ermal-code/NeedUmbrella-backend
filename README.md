## Need An Umbrella backend

### Summary

<p>Need An Umbrella is a weather app where you can search by city to see the weather. Also you can add cities to your favorite list so you can track them all the time without
the need to search again for them. For weather data I used the free API from: </p>

[openweathermap.org/api](https://openweathermap.org/api).

<p>This repo is for the backend of the project which was done using NodeJs, expressJs and MongoDB. Also for image upload I used cloudinary with multer. </p>

### Users

<p>To view the weather you need to have an account. You can register and than login every time you want to check the weather. This project is more about authorization and authentication than weather. Users endpoints contains basic CRUD operations and some extra other operations. Here is the users MongoDB schema which is a simple one: </p>

```javascript
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
```

<p>
Here you will find some of the features this app provides:
</p>

### Features

<details>

<summary><b> JWT Refresh Token authentication</b></summary>
<br/>

<p>In this project I use JWT authentication and authorization. I am using also Refresh Token technology and I use cookies to store the access token and refresh token. I also store the refresh token in database just in case you login with the same user from different devices. The access token lifespan is 1 week where for refresh token is only 15 minutes.</p>
<p>Here you have the generation and verification of JWT using JWT secret for access token and JWT refresh secret for refresh token. </p>

```javascript
const generateJWT = (payload, secret) =>
  new Promise((res, rej) =>
    jwt.sign(
      payload,
      secret,
      { expiresIn: secret === process.env.JWT_SECRET ? "15m" : "1 week" },
      (err, token) => {
        if (err) rej(err);
        res(token);
      }
    )
  );

const verifyJWT = (token, secret) =>
  new Promise((res, rej) =>
    jwt.verify(token, secret, (err, decoded) => {
      if (err) rej(err);
      res(decoded);
    })
  );
```

<p>Here is the logic for refresh token.</p>

```javascript
const refreshToken = async (oldRefreshToken) => {
  const decoded = await verifyJWT(
    oldRefreshToken,
    process.env.RERFRESH_JWT_SECRET
  );
  const user = await UserModel.findOne({ _id: decoded._id });
  if (!user) {
    throw new Error("Access to this action is forbidden for this user");
  }

  const currentRefreshToken = user.refreshTokens.find(
    (token) => token === oldRefreshToken
  );

  if (!currentRefreshToken) {
    throw new Error("Refresh token is wrong");
  }

  const newAccessToken = await generateJWT(
    { _id: user._id },
    process.env.JWT_SECRET
  );
  const newRefreshToken = await generateJWT(
    { _id: user._id },
    process.env.RERFRESH_JWT_SECRET
  );

  user.refreshTokens[user.refreshTokens.indexOf(currentRefreshToken)] =
    newRefreshToken;

  await user.updateOne({ refreshTokens: user.refreshTokens });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

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
        secure: true,
        sameSite: "none",
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        path: "/users/refreshToken",
        secure: true,
        sameSite: "none",
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
```

[HERE](https://github.com/Ermal-code/NeedUmbrella-backend/tree/master/src/utils/auth) you can find the full code and logic for authorization and authentication!

</details>

<details>

<summary><b> Google OAuth</b></summary>

<p>You can also login with google in this app, here I am using google oAuth 2.0 through the passport. Here is the code for how i get the user from google integrated in my database and than you can change or do whatever you want with the information.</p>

```javascript
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: `${process.env.BE_URL}/users/googleRedirect`,
    },
    async (requset, accessToken, refreshToken, profile, done) => {
      const newUser = {
        googleId: profile.id,
        name: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        img: profile.photos[0].value,
        refreshTokens: [],
      };

      try {
        const user = await UserModel.findOne({ googleId: profile.id });

        if (user) {
          const tokens = await authenticateUser(user);
          done(null, { user, tokens });
        } else {
          const createdUser = new UserModel(newUser);
          await createdUser.save();
          const tokens = await authenticateUser(createdUser);
          done(null, { user: createdUser, tokens });
        }
      } catch (error) {
        done(error);
      }
    }
  )
);
```

</details>

<details>

<summary><b>Upload picture using cloudinary with multer </b></summary>

<p>You can change your profile picture and to do that i am using the multer middleware in combination with cloudinary for storage.</p>

<p>Here you have snippets of code for cloudinary configuration and the upload picture endpoint.</p>

```javascript
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile",
  },
});

const cloudMulter = multer({ storage: cloudStorage });

router.post(
  "/uploadPicture",
  authorizeUser,
  cloudMulter.single("picture"),
  async (req, res, next) => {
    try {
      const user = req.user;
      await user.updateOne({
        $set: {
          img: req.file.path,
        },
      });
      res.status(201).send(user);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);
```

</details>

<details>

<summary><b>Add to favorites</b></summary>

<p>I will show you here the endpoints for adding and removing the city from favorite list.</p>

```javascript
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
```

</details>

<p>Please feel free to go through the code and for anything you want to ask or suggest me you can find my contacts in my profile page in Github! Thank you!</p>

[HERE](https://need-umbrella.vercel.app/) you can find the live Demo of the app.

[HERE](https://github.com/Ermal-code/NeedUmbrella-frontend) you can find the frontend repository.


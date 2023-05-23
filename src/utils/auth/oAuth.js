const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const UserModel = require("../../services/users/schema")
const { authenticateUser } = require("./index")

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
            }

            try {
                const user = await UserModel.findOne({ googleId: profile.id })

                if (user) {
                    const tokens = await authenticateUser(user)
                    done(null, { user, tokens })
                } else {
                    const createdUser = new UserModel(newUser)
                    await createdUser.save()
                    const tokens = await authenticateUser(createdUser)
                    done(null, { user: createdUser, tokens })
                }
            } catch (error) {
                done(error)
            }
        }
    )
)

passport.serializeUser(function (user, next) {
    next(null, user)
})

passport.deserializeUser(function (user, next) {
    next(null, user)
})

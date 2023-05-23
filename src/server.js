const express = require("express")
const listEndpoints = require("express-list-endpoints")
const cors = require("cors")
const mongoose = require("mongoose")
const helmet = require("helmet")
const passport = require("passport")
const cookieParser = require("cookie-parser")
const session = require("express-session")
const SQLiteStore = require("connect-sqlite3")(session)

const usersRoute = require("./services/users")
const weatherApiRoute = require("./services/weatherApi")
const oauth = require("./utils/auth/oAuth")

const {
    notFoundErrorHandler,
    unauthorizedErrorHandler,
    badRequestErrorHandler,
    forbiddenErrorHandler,
    catchAllErrorHandler,
} = require("./errorHandling")

const server = express()

const sess = {
    secret: "keyboard cat",
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    store: new SQLiteStore(),
}

if (server.get("env") === "production") {
    server.set("trust proxy", 1) // trust first proxy
    server.enable("trust proxy")
    sess.cookie.secure = true // serve secure cookies
}

const port = process.env.PORT || 3003

const whitelist = [`${process.env.FE_URL}`]
const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true,
}
server.use(cors(corsOptions))
server.use(helmet())
server.use(express.json())
server.use(cookieParser())
server.use(session(sess))
server.use(passport.authenticate("session"))
server.use(passport.initialize())

server.use("/users", usersRoute)
server.use("/weather", weatherApiRoute)

server.use(badRequestErrorHandler)
server.use(notFoundErrorHandler)
server.use(forbiddenErrorHandler)
server.use(unauthorizedErrorHandler)
server.use(catchAllErrorHandler)

console.log(listEndpoints(server))

mongoose.set("debug", true)

mongoose
    .connect(process.env.MONGO_CONNECTION, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
    })
    .then(server.listen(port, () => console.log("Running on port", port)))
    .catch((err) => console.log(err))

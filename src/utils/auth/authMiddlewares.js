const UserModel = require("../../services/users/schema")
const { verifyJWT } = require("./")

const authorizeUser = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken
        const decoded = await verifyJWT(token, process.env.JWT_SECRET)

        const user = await UserModel.findOne({ _id: decoded._id })

        if (!user) {
            const err = new Error()
            err.message = `Author with id: ${decodedToken._id} not found!`
            err.httpStatusCode = 404
            next(err)
        } else {
            req.token = token
            req.user = user
            next()
        }
    } catch (error) {
        console.log(error)
        const err = new Error()
        err.message = "You are not authenticated for this action"
        err.httpStatusCode = 401
        next(err)
    }
}

const adminOnly = async (req, res, next) => {
    if (req.user && req.user.role === "admin") next()
    else {
        const err = new Error()
        err.message = "You are not authorized for this action. Admins only!"
        err.httpStatusCode = 403
        next(err)
    }
}

module.exports = { authorizeUser, adminOnly }

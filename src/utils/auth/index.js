const jwt = require("jsonwebtoken")
const UserModel = require("../../services/users/schema")

const authenticateUser = async (user) => {
    try {
        const newAccessToken = await generateJWT({ _id: user._id }, process.env.JWT_SECRET)
        const newRefreshToken = await generateJWT({ _id: user._id }, process.env.RERFRESH_JWT_SECRET)

        user.refreshTokens = [...user.refreshTokens, newRefreshToken]
        await user.save()

        return { accessToken: newAccessToken, refreshToken: newRefreshToken }
    } catch (error) {
        console.log({ error })
    }
}

const generateJWT = (payload, secret) =>
    new Promise((res, rej) =>
        jwt.sign(payload, secret, { expiresIn: secret === process.env.JWT_SECRET ? "15m" : "1 week" }, (err, token) => {
            if (err) rej(err)
            res(token)
        })
    )

const verifyJWT = (token, secret) =>
    new Promise((res, rej) =>
        jwt.verify(token, secret, (err, decoded) => {
            if (err) rej(err)
            res(decoded)
        })
    )

const refreshToken = async (oldRefreshToken) => {
    const decoded = await verifyJWT(oldRefreshToken, process.env.RERFRESH_JWT_SECRET)
    const user = await UserModel.findOne({ _id: decoded._id })
    if (!user) {
        const err = new Error()
        err.message = "Access to this action is forbidden for this user"
        throw err
    }

    const currentRefreshToken = user.refreshTokens.find((token) => token === oldRefreshToken)

    if (!currentRefreshToken) {
        const err = new Error()
        err.message = "Refresh token is wrong"
        throw err
    }

    const newAccessToken = await generateJWT({ _id: user._id }, process.env.JWT_SECRET)
    const newRefreshToken = await generateJWT({ _id: user._id }, process.env.RERFRESH_JWT_SECRET)

    user.refreshTokens[user.refreshTokens.indexOf(currentRefreshToken)] = newRefreshToken

    await user.updateOne({ refreshTokens: user.refreshTokens })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

module.exports = { authenticateUser, verifyJWT, refreshToken }

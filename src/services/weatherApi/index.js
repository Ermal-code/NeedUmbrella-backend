const router = require("express").Router();
const { authorizeUser } = require("../../utils/auth/authMiddlewares");
const axios = require("axios");

router.get("/:city", authorizeUser, async (req, res, next) => {
  try {
    const url = "https://api.openweathermap.org/data/2.5/weather";
    const { data } = await axios.get(url, {
      params: {
        q: req.params.city,
        units: "metric",
        appid: process.env.WEATHER_KEY,
      },
    });

    res.status(200).send(data);
  } catch (error) {
    if (error.response.data.message === "city not found") {
      const err = new Error();
      err.message = "City not found";
      err.httpStatusCode = 404;
      next(err);
    } else if (error.response.data.message === "bad query") {
      const err = new Error();
      err.message = "Search for a city...";
      err.httpStatusCode = 400;
      next(err);
    } else {
      next(error);
    }
  }
});

module.exports = router;

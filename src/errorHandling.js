const notFoundErrorHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 404) {
    res.status(404).send(err);
  }
  next(err);
};

const unauthorizedErrorHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 401) {
    res.status(401).send(err);
  }
  next(err);
};

const forbiddenErrorHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 403) {
    res.status(403).send(err);
  }
  next(err);
};

const badRequestErrorHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 400) {
    res.status(400).send(err);
  }
  next(err);
};

const catchAllErrorHandler = (err, req, res, next) => {
  if (!res.headersSent) {
    res.status(500).send("Generic server Error!");
  }
  next(err);
};

module.exports = {
  notFoundErrorHandler,
  unauthorizedErrorHandler,
  forbiddenErrorHandler,
  badRequestErrorHandler,
  catchAllErrorHandler,
};

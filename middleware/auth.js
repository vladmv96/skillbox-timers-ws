const { findUserBySessionId } = require("../db");

const auth = () => async (req, res, next) => {
  const { sessionId } = req.cookies || {};
  if (!sessionId) {
    return next();
  }
  const user = await findUserBySessionId(req.db, sessionId);
  req.user = user;
  req.sessionId = sessionId;
  next();
};

module.exports = { auth };

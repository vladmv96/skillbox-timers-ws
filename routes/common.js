const express = require("express");
const passwordHash = require("password-hash");
const { auth } = require("../middleware/auth");
const { addNewUser, findUserByUsername, createSession, deleteSession } = require("../db");

const router = express.Router();

const hash = (d) => passwordHash.generate(d);

router.post("/login", express.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(req.db, username);
  if (!user || !passwordHash.verify(password, user.password)) {
    return res.redirect("/?authError=true");
  }
  const sessionId = await createSession(req.db, user._id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/");
});

router.post("/signup", express.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(req.db, username);
  if (user) {
    return res.redirect("/?authError=User is already exist");
  }
  const newUser = {
    username,
    password: hash(password),
  };
  const { ops } = await addNewUser(req.db, newUser);
  const sessionId = await createSession(req.db, ops[0]._id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/");
});

router.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }
  await deleteSession(req.db, req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

router.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
  });
});

module.exports = router;

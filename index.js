const express = require("express");
const nunjucks = require("nunjucks");
const cookieParser = require("cookie-parser");
const http = require("http");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const wsInit = require("./ws");

const clientPromise = MongoClient.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  poolSize: 10,
});

const app = express();

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));

app.use(cookieParser());
app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});
app.use("/", require("./routes/common"));

app.use(function (err, req, res, next) {
  if (err) {
    res.sendStatus(500);
  }
});

const server = http.createServer(app);
wsInit(server);

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});

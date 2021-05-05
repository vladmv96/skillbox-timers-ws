const { findUserBySessionId, getAllTimers, addTimer, stopTimer } = require("./db");
const cookie = require("cookie");
const WebSocket = require("ws");
const { MongoClient } = require("mongodb");

const clientPromise = MongoClient.connect(process.env.DB_URI, {
  useUnifiedTopology: true,
  poolSize: 10,
});

const sendAllTimers = async (db, ws, isActive, newTimerId) => {
  ws.send(
    JSON.stringify({
      type: "all_timers",
      isActive: isActive,
      timers: await getAllTimers(db, isActive),
      newTimerId,
    })
  );
};

const wsInit = async (server) => {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("users");
  const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
  const clients = new Map();

  server.on("upgrade", async (req, socket, head) => {
    const cookies = cookie.parse(req.headers["cookie"]);
    const { sessionId } = cookies;
    const user = await findUserBySessionId(db, sessionId);
    if (!user) {
      socket.write("HTTP/1.1 404 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    req.user = user;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws, req) => {
    const { user } = req;
    clients.set(user._id, ws);

    ws.on("close", () => {
      clients.delete(user._id);
    });

    sendAllTimers(db, ws, true);
    sendAllTimers(db, ws, false);

    setInterval(() => {
      for (ws of clients.values()) {
        sendAllTimers(db, ws, true);
      }
    }, 1000);

    ws.on("message", async (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch {
        return;
      }

      if (data.type === "add_timer") {
        const { id } = await addTimer(db, data.description);
        sendAllTimers(db, ws, true, id);
      }

      if (data.type === "stop_timer") {
        await stopTimer(db, data.id);
        sendAllTimers(db, ws, true);
        sendAllTimers(db, ws, false);
      }
    });
  });
};

module.exports = wsInit;

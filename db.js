const { nanoid } = require("nanoid");
const { ObjectId } = require("mongodb");

const addNewUser = (db, { username, password }) =>
  db.collection("users").insertOne({
    username,
    password,
  });

const findUserByUsername = (db, username) => db.collection("users").findOne({ username });

const findUserBySessionId = async (db, sessionId) => {
  const session = await db.collection("sessions").findOne({ sessionId }, { projection: { userId: 1 } });

  if (!session) return;

  return db.collection("users").findOne({ _id: ObjectId(session.userId) });
};

const createSession = async (db, userId) => {
  const sessionId = nanoid();
  await db.collection("sessions").insertOne({
    userId,
    sessionId,
  });
  return sessionId;
};

const deleteSession = async (db, sessionId) => {
  await db.collection("sessions").deleteOne({ sessionId });
};

const getAllTimers = async (db, isActive) => {
  const timers = await db.collection("timers").find({ isActive }).toArray();
  return timers.map((timer) => ({
    ...timer,
    id: timer._id,
    progress: (isActive ? Date.now() : timer.end) - timer.start,
  }));
};

const addTimer = async (db, description) => {
  const newTimer = {
    description,
    start: Date.now(),
    isActive: true,
  };
  const {
    ops: [timer],
  } = await db.collection("timers").insertOne(newTimer);
  return { id: timer._id };
};

const stopTimer = async (db, id) => {
  const timer = await db.collection("timers").findOne({ _id: ObjectId(id) });
  await db.collection("timers").updateOne(
    { _id: ObjectId(id) },
    {
      $set: {
        duration: Date.now() - timer.start,
        isActive: false,
        end: Date.now(),
      },
    }
  );
  return { id };
};

module.exports = {
  addNewUser,
  findUserByUsername,
  findUserBySessionId,
  createSession,
  deleteSession,
  getAllTimers,
  addTimer,
  stopTimer,
};

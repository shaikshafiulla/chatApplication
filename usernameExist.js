const MongoClient = require("mongodb").MongoClient;
const crypto = require("crypto");

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = "chat";
const collection = "clients";

async function usernameExists(username) {
  const user = await client
    .db(database)
    .collection(collection)
    .findOne({ username: username });
  return user !== null;
}

module.exports = { usernameExists };

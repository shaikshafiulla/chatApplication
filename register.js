const { MongoClient } = require("mongodb");
const Chalk = require("chalk");
const crypto = require("crypto");
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = "chat";
const collection = "clients";

async function register_user(username, password) {
  await client.connect();
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(password));
  password = encrypted.toString("base64");
  const result = await client.db(database).collection(collection).insertOne({
    username: username,
    password: password,
    public_Key: publicKey,
    private_Key: privateKey,
  });

  console.log(Chalk.green.bold("Registration Successfull🤩🤩 "));
  client.close();
}
module.exports = { register_user };
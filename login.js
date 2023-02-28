const MongoClient = require("mongodb").MongoClient;
const crypto = require("crypto");
const chalk = require("chalk");

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = "chat";
const collection = "clients";

async function login_user(username, password) {
  await client.connect();
  const result = await client
    .db(database)
    .collection(collection)
    .findOne({ username: username });
  if (result) {
    const decrypted = crypto.privateDecrypt(
      result["private_Key"],
      Buffer.from(result["password"].toString("base64"), "base64")
    );
    if (password.localeCompare(decrypted.toString()) == 0) {
      client.close();
      console.log(chalk.green.bold("Login Successfull🤩🤩"));

      let obj = {
        uname: result["username"],
        pswd: result["password"],
        privatekey: result["private_Key"],
        publickey: result["public_Key"],
      };

      return obj;
    } else {
      client.close();
      return null;
    }
  }
  return null;
}
module.exports = { login_user };

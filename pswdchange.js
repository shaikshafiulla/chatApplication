const MongoClient = require("mongodb").MongoClient;
const crypto = require("crypto");
const chalk = require("chalk");

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = "chat";
const collection = "clients";

async function change_pswd(username, password, newpswd) {
  console.log(username, password, newpswd);
  await client.connect();

  const result = await client
    .db(database)
    .collection(collection)
    .findOne({ username: username });

    const decrypted = crypto.privateDecrypt(
      result["private_Key"],
      Buffer.from(result["password"].toString("base64"), "base64")
    );

    if (password.localeCompare(decrypted.toString()) == 0) {
      const encrypted = crypto.publicEncrypt(
        result["public_Key"],
        Buffer.from(newpswd)
      );
      newpswd = encrypted.toString("base64");
      client
        .db(database)
        .collection(collection)
        .updateOne({ username: username }, { $set: { password: newpswd } });
      console.log(chalk.green.bold("password changed"));
      return true;
    } else {
      console.log(chalk.red.bold(" Oops!!! Incorrect Password😐"));
      return false;
    }
    // client.close();
    
}
// change_pswd("shafi", "Shafi@12345", "Shafi@123");
module.exports = { change_pswd };

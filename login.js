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
    if(result){
  const decrypted = crypto.privateDecrypt(
    result["private_Key"],
    Buffer.from(result["password"].toString("base64"), "base64")
  );
  if (password.localeCompare(decrypted.toString()) == 0) {
    client.close();
    console.log(chalk.green.bold("Login Successfull🤩🤩"));

    return true;//chalk.green.bold("Login Successfull🤩🤩");
  }else{
    client.close();
  // console.log(chalk.red.bold(" Oops!!! Incorrect Password😐"));
  return false;
  }
}
return false;

   
}
module.exports = { login_user };
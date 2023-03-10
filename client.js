const net = require("net");
const readline = require("readline");
var { username, password, privatekey, publickey } = require("./start");
const chalk = require("chalk");
const inquirer = require("inquirer");
const term = require("terminal-kit").terminal;
const crypto = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const heading = "Welcome to the chat session";
const footer = "Press '0' for HELP\n";

const client = new net.Socket();
client.connect(8080, "localhost", () => {
  client.write(`${username}.${password}.${privatekey}.${publickey}.#`);
  console.log(chalk.greenBright.bold("Connected to server  🥳"));
  showMenu();
});

client.on("data", (data) => {
  let arr = data.toString().split(" ");
  if (arr[5] == "@") {
    publickey = data.toString().split("@")[0];
    // console.log(publickey);
  } else if (arr[1] == "&") {
    let arr2 = arr[0].toString().split(">");
    let msgreceived = decrypt(arr2[1]);

    term.clear();
    term.cyan(
      chalk.greenBright.bold(heading) +
        " 🤟" +
        "\n" +
        chalk.yellowBright.bold(footer)
    );
    console.log(chalk.blue.bold(`${arr2[0]} : ${msgreceived.toString()}`));
  } else {
    term.clear();
    term.cyan(
      chalk.greenBright.bold(heading) +
        " 🤟" +
        "\n" +
        chalk.yellowBright.bold(footer)
    );
    console.log(chalk.blue.bold(data.toString()));
  }
});

client.on("error", (err) => {
  console.log(
    chalk.redBright.bold(
      "Hey!! Something went wrong at server side 🥹 \n try again later.."
    )
  );
});

client.on("close", () => {
  console.log(chalk.blueBright.bold("Connection closed"));
  process.exit();
});

rl.on("line", async (line) => {
  switch (line) {
    case "0":
      term.clear();
      term.cyan(
        chalk.greenBright.bold(heading) +
          " 🤟" +
          "\n" +
          chalk.yellowBright.bold(footer)
      );
      showMenu();
      break;
    case "1":
      rl.question(chalk.greenBright.bold("Enter group Name : "), (name) => {
        client.write(`1. ${name}`);
      });
      break;
    case "2":
      rl.question(chalk.greenBright.bold("Join group name : "), (groupName) => {
        client.write(`2. ${groupName}`);
      });
      break;
    case "3":
      rl.question(
        chalk.greenBright.bold("Enter group name : "),
        (groupName) => {
          client.write(`3. ${groupName}`);
        }
      );
      break;
    case "4":
      client.write(`4.`);
      break;

    case "5":
      client.write(`5.`);
      break;
    case "6":
      rl.question(chalk.greenBright.bold("Enter clientId : "), (id) => {
        client.write(`6. ${id}`);
      });
      break;
    case "7":
      publickeyreq();
      break;
    case "8":
      rl.question(chalk.greenBright.bold("Enter clientId : "), (id) => {
        client.write(`8. ${id}`);
      });
      break;
    case "9":
      client.write(`9.`);
      break;
    case "10":
      // client.write(`9.`);
      rl.question(chalk.greenBright.bold("Enter clientId : "), (id) => {
        client.write(`10. ${id}`);
      });
      break;
    case "11":
      rl.question(
        chalk.greenBright.bold("Enter group name : "),
        (groupName) => {
          client.write(`11. ${groupName}`);
        }
      );
      break;
    case "12":
      rl.question(chalk.greenBright.bold("Change password : "), async (pwd) => {
        if (await validatePassword(pwd)) client.write(`12. ${pwd}`);
        else {
          console.log(
            chalk.red.bold(
              "🧐 Password must contain at least one upper case letter, one lower case letter, one number 🧐 "
            )
          );
        }
      });
      break;
    case "13":
      rl.question(chalk.greenBright.bold("Enter recepient id : "), (id) => {
        client.write(`13. ${id}`);
      });
      break;
    case "14":
      client.write(`14.`);
      process.exit();
    // case "15":
    //   rl.question(
    //     chalk.greenBright.bold("enter Recepient id : "),
    //     (recepientId) => {
    //       client.write(`15.${recepientId}`);
    //     }
    //   );
    //   break;

    default:
      client.write(line);
      break;
  }
});

function showMenu() {
  console.log(chalk.blueBright.bold("            FUNCTIONS           "));
  console.log(chalk.yellowBright.bold("1. Delete Group"));
  console.log(chalk.yellowBright.bold("2. join a group"));
  console.log(chalk.yellowBright.bold("3. create a group"));
  console.log(chalk.yellowBright.bold("4. Show all active clients"));
  console.log(chalk.yellowBright.bold("5. show the active groups"));
  console.log(chalk.yellowBright.bold("6. disconnect from 1:1 chat session"));
  console.log(chalk.yellowBright.bold("7. Message"));
  console.log(chalk.yellowBright.bold("8. Request 1:1 chat session"));
  console.log(chalk.yellowBright.bold("9. Get request"));
  console.log(chalk.yellowBright.bold("10. Accept request"));
  console.log(chalk.yellowBright.bold("11. disconnect from Group"));
  console.log(chalk.yellowBright.bold("12. change password"));
  console.log(chalk.yellowBright.bold("13. Remove User from Group"));
  console.log(chalk.yellowBright.bold("14. Logout"));

  console.log(chalk.blueBright.bold("Enter a command number:"));
}

async function validatePassword(value) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const res = regex.test(value);
  if (res == false) {
    return false;
  }
  return true;
}

function encrypt(text, publicKey) {
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(text));
  text = encrypted.toString("base64");
  return text;
}

function decrypt(text) {
  const decrypted = crypto.privateDecrypt(
    privatekey,
    Buffer.from(text.toString("base64"), "base64")
  );
  return decrypted.toString();
}

async function publickeyreq() {
  rl.question(
    chalk.greenBright.bold("enter Recepient id : "),
    (recepientId) => {
      client.write(`15.${recepientId}`);
      message(recepientId);
    }
  );
}

function message(recepientId) {
  rl.question(chalk.cyanBright.bold("Enter message : "), (data) => {
    data = encrypt(data, publickey);
    // console.log(`encrypted data : ${chalk.green.bold(data)}`);
    client.write(`${data}.${recepientId}`);
  });
}

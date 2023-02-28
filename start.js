const register = require("./register");
const login = require("./login");
const chalk = require("chalk");
const exists = require("./usernameExist");
const term = require("terminal-kit").terminal;
const inquirer = require("inquirer");
var username, password;

const regristration_prompt = [
  {
    type: "input",
    name: "user",
    message: chalk.blueBright.bold("username" + "🤠 "),
    validate: async (value) => {
      const status = await exists.usernameExists(value);
      if (status) {
        return chalk.redBright.bold("🧐username already exists🧐");
      } else {
        return true;
      }
    },
  },
  {
    type: "password",
    mask: "•",
    name: "pswd",
    message: chalk.blueBright.bold("password" + "🔑 "),
    validate: (value) => {
      const regex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      const res = regex.test(value);
      if (res == false) {
        return chalk.red.bold(
          chalk.redBright.bold(
            "🧐 Password must contain at least one upper case letter, one lower case letter, one number 🧐 "
          )
        );
      }
      return res;
    },
  },
];

const StartupQuestions = [
  {
    type: "list",
    name: "options",
    choices: [
      chalk.blueBright.bold("1. Register"),
      chalk.blueBright.bold("2. Login"),
      chalk.blueBright.bold("3. Quit"),
    ],
  },
];

const LoginQuestions = [
  {
    type: "input",
    name: "username",
    message: chalk.blueBright.bold("🤠 " + "Enter your username:"),
  },
  {
    type: "input",
    name: "password",
    message: chalk.blueBright.bold("🔑 " + "Enter your password:"),
  },
];

async function RegisterClient() {
  let username, password;
  try {
    await inquirer.prompt(regristration_prompt).then((answers) => {
      username = answers.user;
      password = answers.pswd;
    });
    await register.register_user(username, password);
    term.clear();
    console.log(chalk.green.bold("Registration Successfull🤩🤩 "));
  } catch (err) {
    console.log(err);
  }
}

async function LoginClient() {
  await inquirer.prompt(LoginQuestions).then(async (answers) => {
    const data = await login.login_user(answers.username, answers.password);
    if (data) {
      username = answers.username;
      password = answers.password;
      privatekey = data.privatekey;
      publickey = data.publickey;
      module.exports = { username, password, privatekey, publickey };
      term.clear();
      console.log(chalk.green.bold("Login Successfull🤩🤩\n"));
      console.log(chalk.yellowBright.bold("welcome"));
      require("./client");
    } else {
      term.clear();
      console.log(chalk.red.bold(" Oops!!! Incorrect Password😐"));
      await LoginClient();
    }
  });
}

async function startup() {
  term.clear();
  let status = false;
  while (!status) {
    let ans = await inquirer.prompt(StartupQuestions);

    if (ans.options == chalk.blueBright.bold("2. Login")) {
      term.clear();
      term.cyan(chalk.yellowBright.bold(" Login Page \n"));
      await LoginClient();
      status = true;
    } else if (ans.options == chalk.blueBright.bold("1. Register")) {
      term.clear();
      term.cyan(chalk.yellowBright.bold(" Regristration \n"));
      await RegisterClient();
    } else process.exit();
  }
}

startup();

// module.exports = { startup,LoginClient,RegisterClient,LoginQuestions,StartupQuestions,regristration_prompt };

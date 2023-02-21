const net = require("net");
const multimap = require("multimap");
const chalk = require("chalk");
const pswd = require('./pswdchange');

var nextClientNumber = 1;
var activeClients = new Set();
var activegroups = new Set();
var SOCKETS = {};
var map = new multimap();
var chatreq = new multimap();
var coordinated = new multimap();
var groupAdmins = new Map();
var addingStatus = false;
const server = net.createServer((socket) => {
  const clientNumber = nextClientNumber++;
  console.log(chalk.blue.bold(`Client ${clientNumber} connected 🙌😉`));
  //added properties to the socket
  socket.id = clientNumber;
  socket.isGroupChatting = false;
  SOCKETS[clientNumber] = socket;
  socket.chatStatus = false;
  activeClients.add(clientNumber);

  socket.on("data", (data) => {
    var message = data.toString().trim();
    // console.log(chalk.blue.bgYellow.bold(socket.id + " : " + message));
    message = message.split(".");
    console.log(chalk.blue.bgRed.bold(message));

    if (!isNaN(message[0])) {
      const request = Number(message[0]);
      switch (request) {
        case 1:
          // socket.write(
          //   `Client ${socket.id} is initiated chat with client ${message[1]}`
          // );
          // chat(message, socket);
          deleteGroup(socket, message);
          break;

        case 2:
          if (isExist(message[1])) {
            socket.write(".........JOINED THE GROUP  🙌😉.........\n");
            groupChat(message, socket);
          } else {
            socket.write(".........Invalid group name 🥴.........\n");
          }
          break;

        case 3:
          createGroup(message, socket);
          break;

        case 4:

          data = "";
          for (const element of activeClients) {
            if (element!= socket.id) 
            data += element.toString() + " ";
          }
          socket.write(`-----> ${activeClients.size-1} active clients\n ${data}`);
          break;

        case 5:
          activeGroups(socket);
          break;

        case 6:
          disconnect(socket, message);
          break;
        // case 7:
        //   message();
        case 8:
          requestChat(socket, message);
          break;
        case 9:
          getRequests(socket, message);
          break;

        case 10:
          acceptRequest(socket, message);
          break;
        case 11:
          GroupDisconnect(socket, message);
          break;
        case 12:
          if(pswd.change_pswd(socket.username, socket.password,message[1].trim()))
          socket.password = message[1].trim();
          break;
          
          

      }
    } else {
      // let message = data.toString().trim().split(".");
      if (!isNaN(message[1])) {
        const recepient = SOCKETS[Number(message[1])];
        if (recepient) {
          if (coordinated.has(socket.id, recepient.id))
            recepient.write(`${socket.username} : ${message[0].toString()}`);
          else socket.write("🫥 not initiated chat with this client 🫥");
        } else {
          socket.write("🫥 invalid recepient id 🫥\n");
        }
      } else if (socket.isGroupChatting) {
        groupname = socket.groupChatName;
        values = map.get(groupname);
        for (let value of values) {
          recepientId = value;
          recepient = SOCKETS[recepientId];
          if(recepient!=socket)
          recepient.write(message + "\n");
        }
      } else if(!addingStatus && message[2]=='#'){
        socket.username = message[0];
        socket.password = message[1];
        addStatus = true;
      }
      else{
        socket.write(" INVALID ENTRY!!\n");
      }

      // }
      // } else if (socket.isChatting && socket.chatStatus && recepient.chatStatus) {
      //   recepient = socket.chatmember;
      //   recepient.write(message + "\n");
      //   socket.write("..........");
      // } else {
      //   groupname = socket.chatmember;
      //   values = map.get(groupname);
      //   for (let value of values) {
      //     recepientId = value;
      //     recepient = SOCKETS[recepientId];
      //     recepient.write(message + "\n");
      //     socket.write("....................................");
      //   }
      // }
    }
  });

  socket.on("end", () => {
    clients.delete(clientNumber);
    console.log(chalk.blue.bgRed.bold(`Client ${clientNumber} disconnected`));
  });

  socket.on("error", (err) => {
    console.error(chalk.blue.bgRed.bold(`${socket.id} is disconnected `));
    socket.destroy();
    activeClients.delete(socket.id);
  });
});

server.on("error", (err) => {
  console.error(chalk.blue.bgRed.bold(`${err.message}`));
  throw err;
});

function requestChat(socket, message) {
  const recepient = SOCKETS[Number(message[1])];
  if (recepient) {
    chatreq.set(recepient.id, socket.id);
    socket.write(chalk.blueBright.bold("  Request sent  😍"));
  } else {
    socket.write(
      chalk.blue.bold("...🫥 Invalid client number 🫥....")
    );
  }
}

function getRequests(socket) {
  let data = "";
  let values = chatreq.get(socket.id);
  if (values != undefined) {
    for (let i = 0; i < values.length; i++) {
      data += values[i].toString() + " ";
    }
    if (data != "") socket.write(data);
    else socket.write(chalk.blue.bold("No requests.. 🤞"));
  } else socket.write(chalk.blue.bold("No requests.. 🤞"));
}

function acceptRequest(socket, message) {
  let values = chatreq.get(socket.id);
  if (values == undefined) {
    socket.write(chalk.blue.bold("no requests to accept 🤞"));
    return;
  }
  const recepient = SOCKETS[Number(message[1])];
  if (recepient) {
    for (let i = 0; i < values.length; i++) {
      if (values[i] == message[1]) {
        socket.write("accepted chat request 🤩");
        recepient.write(`${socket.id} accepted chat request 🤩`);
        coordinated.set(socket.id, recepient.id);
        coordinated.set(recepient.id, socket.id);
        chatreq.delete(socket.id, recepient.id);
      } else {
        socket.write("There is no request from recepient to accept 🤞\n");
      }
    }
  } else {
    socket.write("..Busy or Invalid recepient 🤞..\n");
  }
}

// function chat(message, socket) {
//   const recepient = SOCKETS[Number(message[1])];
//   let values = coordinated.get(socket.id);
//   let valuesSet = new Set(values);
//   if (valuesSet.has(message[1])) {
//     socket.chatStatus = true;
//     recepient.chatStatus = true;
//     console.log(
//       chalk.green(
//         `Client ${socket.id} is initiated chat with client ${message[1]}`
//       )
//     );
//   } else {
//     socket.write(chalk.blue.bgRed.bold(".....No acceptance of request....."));
//   }
// }

function isExist(name) {
  if (activegroups.has(name)) return true;
  return false;
}

function groupChat(message, socket) {
  if(!socket.isGroupChatting){
  console.log(
    `Client ${socket.id,socket.username} is initiated group chat with group -> ${message[1]} 😍`
  );
  socket.isGroupChatting = true;
  socket.groupChatName = message[1];
  map.set(message[1], socket.id);
  }
  else{
    socket.write(chalk.greenBright.bold(`Hey!, you are already in the group ${socket.groupChatName} 😂`));
  }
}

function createGroup(message, socket) {
  if(activegroups.has(message[1])){
    socket.write(chalk.redBright.bold("..Group already exists 💁‍♂️.."));
  }
  else{
  activegroups.add(message[1]);
  groupAdmins.set(message[1], socket.id);
  socket.write(`Group ${message[1]} created successfully 😍😍\n`);
}
}

function activeGroups(socket) {
  data = "";
  for (const element of activegroups) {
    data += element.toString() + " ";
  }
  if (data != "") socket.write(`active groups are ${data}`);
  else socket.write(`active groups are empty 💁‍♂️`);
}

function disconnect(socket, message) {
  recepient = SOCKETS[Number(message[1])];
  if (recepient && coordinated.has(socket.id, recepient.id)) {
    socket.write(
      `Client ${socket.id} and ${recepient.id} are disconnected from 1:1 chat session 🤕`
    );
    coordinated.delete(socket.id, recepient.id);
    coordinated.delete(recepient.id, socket.id);
  } else {
    socket.write(
      chalk.blue.bold(".....DISCONNECTION IS NOT POSSIBLE 💁‍♂️...\n")
    );
  }

  // if (socket.isChatting) {
  //   recepient = socket.chatmember;
  //   socket.isChatting = false;
  //   recepient.isChatting = false;
  //   socket.chatStatus = false;
  //   recepient.chatStatus = false;
  //   coordinated.delete(socket.id, recepient.id);
  //   activeClients.add(socket.id);
  //   activeClients.add(recepient.id);
  //   socket.write(
  //     `Client ${socket.id} and ${recepient.id} are disconnected from 1:1 chat session`
  //   );
  // } else if (socket.isGroupChatting) {
  //   activeClients.add(socket.id);
  //   socket.isGroupChatting = false;
  //   socket.write(`Client ${socket.id} is disconnected from group chat session`);
  // } else {
  //   socket.write(
  //     chalk.blue.bgRed.bold(".........DISCONNECTION IS NOT POSSIBLE.........\n")
  //   );
  // }
}

function deleteGroup(socket, message) {
  if (
    activegroups.has(message[1]) &&
    groupAdmins.get(message[1]) == socket.id
  ) {
    socket.write(`Group ${message[1]} deleted successfully 🤕`);
    let values = map.get(message[1]);
    if(values!= undefined){
    for (let value of values) {
      clientid = value;
      client = SOCKETS[clientid];
      client.isGroupChatting = false;
    }
    activegroups.delete(message[1]);
    groupAdmins.delete(message[1]);
  }
  } else if (!activegroups.has(message[1])) {
    socket.write("No such group to delete 🤕\n");
  } else if (!groupAdmins.get(message[1]) == socket.id) {
    socket.write(chalk.redBright.bold("You are not authorized to delete this group 💁‍♂️\n"));
  } else {
    socket.write(chalk.redBright.bold("Invalid 💁‍♂️"));
  }
}

function GroupDisconnect(socket, message) {
  let groupname = message[1];
  if (isExist(groupname) && socket.groupChatName == groupname) {
    socket.isGroupChatting = false;
    map.delete(groupname, socket.id);
    socket.write(`Disconnected from ${groupname} successfully 🤕`);
  }
  else{
    socket.write(chalk.redBright.bold("INVALID 🫠"));
  }
}

server.listen(8080, () => {
  console.log(chalk.green.bold("Server connected 🤝"));
});

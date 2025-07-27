const WebSocket = require("ws");

// Crea una instancia de un servidor WebSocket en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });
const userList = new Map();

function addUser(ws, parsedMessage) {
  userList.set(ws, parsedMessage.playload.id);

  let ids = Array.from(userList.values());
  ids = ids.filter((id) => id !== parsedMessage.playload.id);
  if (ids.length === 0)  return;
  sendMessageToUser(ws, {
    type: "usersList",
    messageContent: {
      playload: {
        ids: ids,
      },
    },
  });
  sendMessageToAll(
    {
      type: parsedMessage.type,
      messageContent: parsedMessage,
    },
    ws
  );
}

function MessageUserToServer(userWs, message) {
  switch (message?.type) {
    case "connected":
      addUser(userWs, message);
      break;
  }
}

function sendMessageUserToUser(message) {
  const recipientId = message.playload.recipient;

  // Buscar el WebSocket del destinatario
  const recipientWs = Array.from(userList.entries()).find(
    ([ws, id]) => id === recipientId
  )?.[0];

  if (recipientWs) {
    // Enviar el mensaje al destinatario
    sendMessageToUser(recipientWs, {
      type: "message",
      messageContent: message,
    });
  } else {
    console.error("Usuario no encontrado:", recipientId);
  }
}

function MessageUserToUser(userWs, message) {
  switch (message.type) {
    case "message":
      sendMessageUserToUser(message);
      break;
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      // 1. Parsear el mensaje correctamente
      let parsedMessage = JSON.parse(message.toString());
      if (parsedMessage?.to == "server") MessageUserToServer(ws, parsedMessage.messageContent);
      else if (parsedMessage?.to == "client") MessageUserToUser(ws, parsedMessage.messageContent);
    } catch (e) {
      console.error("Error al parsear el mensaje:", e);
    }
  });

  // Cuando el cliente se desconecta
  ws.on("close", () => {
    sendMessageToAll({
      type: "disconnected",
      messageContent: { playload: { id: userList.get(ws) } },
    });
    userList.delete(ws);
  });

  // Cuando ocurre un error
  ws.on("error", (error) => {
    console.error("Error de WebSocket del cliente:", error);
  });

});



  // Enviar mensaje a un usuario específico (ws)
  function sendMessageToUser(userWs, message) {
    if (userWs.readyState === WebSocket.OPEN) {
      userWs.send(JSON.stringify(message));
    } else {
      console.error(
        "WebSocket no está abierto. No se puede enviar el mensaje al usuario."
      );
    }
  }

  // Enviar mensaje a todos los usuarios conectados excepto el usuario con id 'unless'
  function sendMessageToAll(message, unless) {
    wss.clients.forEach((client) => {
      if (unless && unless === client) return; // Salta el cliente que coincide con 'unless'
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 })

interface User{
    socket: WebSocket,
    room : string
}

//message : {
// "type" : "join",
// "payload" : {
//      "message" : "Hi there"
// }
// }

// {
// "type" : "chat",
// "payload" : {
//     "roomId" : "39432472"
// }
// }

let allSockets : User[] = [];

wss.on("connection", function (socket) { // not the native WebSocket of nodejs or Browser, this is imported from the ws library
   
    socket.on("message", (message) => {
        const parsedMessage = JSON.parse(message as unknown as string);

        if(parsedMessage.type == 'join'){
            allSockets.push({
                socket,
                room : parsedMessage.payload.roomId
            });
        }
        if(parsedMessage.type == 'chat'){
            const currRoom = allSockets.find((u) => u.socket === socket)?.room

            // for(let i = 0 ; i < allSockets.length ; i++){
            //     if(allSockets[i].room === currRoom){
            //         allSockets[i].socket.send(parsedMessage.payload.message);
            //     }
            // }

            allSockets.filter(s => s.room === currRoom).forEach(s => s.socket.send(parsedMessage.payload.message))
        }
    })
    

})
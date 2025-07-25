import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 })
// const wss = new WebSocketServer({ port: 8081 })

interface Room {
    sockets: WebSocket[]
}

interface User {
    socket: WebSocket,
    room: string
}

const rooms: Record<string, Room> = {
    // room1 : {
    //     sockets : [socket1, socket2, socket3],

    // }

    // room2 : {
    //     sockets : [socket3, socket4, socket5],

    // }

}

//message : {
// "type" : "chat",
// "payload" : {
//      "message" : "Hi there",
//      "roomId" : "3435934",

// }
// }

// {
// "type" : "join",
// "payload" : {
//     "roomId" : "39432472"
// }
// }

let allSockets: User[] = [];
const RELAYER_URI = 'ws://localhost:3001'
const relayerSocket = new WebSocket(RELAYER_URI)

relayerSocket.onopen = () => {

    // console.log('Connected to relayer');

}

relayerSocket.onerror = (error) => {
    console.error('Relayer connection error:', error);
}

relayerSocket.onclose = () => {
    console.log('Relayer connection closed');
}

relayerSocket.onmessage = (event) => {
    const message = event.data.toString();

    // console.log('Recieved from Relayer : ', message)

    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type == 'chat') {

        const room = parsedMessage.payload.roomId;

        // console.log('BroadCasting to room : ', room)

        // Check if room exists before trying to send messages
        if (rooms[room]) {
            rooms[room].sockets.map((socket) => {
                socket.send(parsedMessage.payload.message)
            })
        }

    }
}

wss.on("connection", function (socket) { // not the native WebSocket of nodejs or Browser, this is imported from the ws library

    socket.on("error", console.error);

    socket.on("message", (message) => {

        const parsedMessage = JSON.parse(message as unknown as string);

        // const parsedMessage = JSON.parse(message as unknown as string);

        if (parsedMessage.type == 'join') {
            const room = parsedMessage.payload.roomId;
            //first room
            if (!rooms[room]) {
                rooms[room] = {
                    sockets: []
                }
            }
            rooms[room].sockets.push(socket);

            // allSockets.push({
            //     socket,
            //     room : parsedMessage.payload.roomId
            // });
        }
        // if(parsedMessage.type == 'chat'){
        //     const room = parsedMessage.payload.roomId ; 

        //     // Check if room exists before trying to send messages
        //     if(rooms[room]) {
        //         rooms[room].sockets.map((socket)=>{
        //             socket.send(parsedMessage.payload.message)
        //         })
        //     }
        //     // const currRoom = allSockets.find((u) => u.socket === socket)?.room

        //     // for(let i = 0 ; i < allSockets.length ; i++){
        //     //     if(allSockets[i].room === currRoom){
        //     //         allSockets[i].socket.send(parsedMessage.payload.message);
        //     //     }
        //     // }

        //     // allSockets.filter(s => s.room === currRoom).forEach(s => s.socket.send(parsedMessage.payload.message))
        // }


        //if it is chat message, forward to relayer
        if (parsedMessage.type === 'chat') {
            
            // console.log('Forwarding chat message to relayer:', parsedMessage.payload.message);

            relayerSocket.send(message)
        }

    })


})
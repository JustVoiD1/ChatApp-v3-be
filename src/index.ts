import { WebSocketServer, WebSocket } from "ws";


// const wss = new WebSocketServer({ port: 8081 })

type UserInfoType = {
    fullname: string,
    email: string,
    username: string,
}
interface Room {
    sockets: WebSocket[]
}

interface UserType {
    socket: WebSocket,
    room: string
    userInfo: UserInfoType
}

const wss = new WebSocketServer({ port: 8080 })
const rooms: Record<string, Room> = {

    // room1 : {
    //     sockets : [socket1, socket2, socket3],

    // }

    // room2 : {
    //     sockets : [socket3, socket4, socket5],

    // }

}
let allSockets: UserType[] = [];

const socketToRoom = new Map<WebSocket, string>()
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

const RELAYER_URI = 'ws://localhost:3001'
const relayerSocket = new WebSocket(RELAYER_URI)

relayerSocket.onopen = () => {

    console.log('Connected to relayer');

}

relayerSocket.onerror = (error) => {
    console.error('Relayer connection error:', error);
}

relayerSocket.onclose = () => {

    console.log('Relayer connection closed');
}

relayerSocket.onmessage = (event) => {
    const message = event.data.toString();


    const parsedMessage = JSON.parse(message);
    console.log('Recieved from Relayer : ', parsedMessage)

    if (parsedMessage.type == 'chat') {


        const room = parsedMessage.payload.roomId;
        const sender = parsedMessage.payload.sender;

        // console.log('BroadCasting to room : ', room)

        // Check if room exists before trying to send messages
        if (rooms[room]) {
            rooms[room].sockets.map((socket) => {
                socket.send(JSON.stringify(parsedMessage))
            })
        }

    }
}

wss.on("connection", function (socket) { // not the native WebSocket of nodejs or Browser, this is imported from the ws library

    socket.on("error", console.error);

    socket.on("close", function (socket: WebSocket) {
        Object.keys(rooms).forEach(roomId => {
            if (rooms[roomId]) {
                rooms[roomId].sockets = rooms[roomId].sockets.filter(s => s !== socket)
                if (rooms[roomId].sockets.length === 0) {
                    delete rooms[roomId];
                }
            }
        })
        socketToRoom.delete(socket)
        allSockets.pop()
        console.log('Socket disconnected and sockets length: ', allSockets.length)
    })

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
            socketToRoom.set(socket, room)

            allSockets.push({
                socket,
                room : parsedMessage.payload.roomId,
                userInfo: parsedMessage.payload.userInfo
            });
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
            const room = parsedMessage.payload.roomId
            if (!parsedMessage.payload.sender) {
                parsedMessage.payload.sender = parsedMessage.payload.user?.username || 'Unknown'
            }
            if (rooms[room]) {
                // rooms[room].sockets.filter(roomSocket => roomSocket !== socket).forEach(roomSocket => {
                rooms[room].sockets.forEach(roomSocket => {
                    roomSocket.send(JSON.stringify(parsedMessage))
                    console.log(`Message Sent and sockets length ${allSockets.length}`)
                })
            }


            // console.log('Forwarding chat message to relayer:', parsedMessage.payload.message);

            relayerSocket.send(JSON.stringify(parsedMessage))
        }

    })

    


})
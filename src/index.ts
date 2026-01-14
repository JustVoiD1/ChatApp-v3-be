import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config()
// app.listen(port, () => {
//     console.log('authentication listening to port: ', port)
// })

type UserInfoType = {
    username: string,
}
interface Room {
    sockets: WebSocket[]
    users: { username: string, socket: WebSocket }[]
}

interface UserType {
    socket: WebSocket,
    room: string
    userInfo: UserInfoType
}

const PORT = 8080

const JWT_SECRET = process.env.JWT_SECRET!

function verifyToken(token: string | null) {
    if (!token) return { valid: false }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number, username: string }
        return { valid: true, userid: decoded.id, username: decoded.username }
    } catch (err) {
        console.log("token: ", token)
        console.error("Token verification error: ", err)
        return { valid: false }
    }
}
const wss = new WebSocketServer({ port: PORT })
// const wss = new WebSocketServer({ port: 8081 })
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



    const room = parsedMessage.payload.roomId;
    const sender = parsedMessage.payload.sender;

    // Check if room exists before trying to send messages
    if (rooms[room]) {
        rooms[room].sockets.map((socket) => {
            socket.send(JSON.stringify(parsedMessage))
        })
    }

}

wss.on("connection", function (socket, req) { // not the native WebSocket of nodejs or Browser, this is imported from the ws library
    const token = new URL(req.url!, "http://localhost").searchParams.get("token")
    
    const result = verifyToken(token);

    if (!result.valid) {
        socket.close(1008, "Unauthorized");
        return;
    }

    (socket as any).user = {
        id: result.userid,
        username: result.username
    };

    socket.on("error", console.error);

    socket.on("close", () => {
        const room = socketToRoom.get(socket);
        if (room && rooms[room]) {
            // Find and remove the specific user
            const userIndex = rooms[room].users.findIndex(u => u.socket === socket);
            const socketIndex = rooms[room].sockets.findIndex(s => s === socket);

            if (userIndex !== -1) {
                const leavingUser = rooms[room].users[userIndex];
                rooms[room].users.splice(userIndex, 1);

                if (socketIndex !== -1) {
                    rooms[room].sockets.splice(socketIndex, 1);
                }

                // Notify remaining users
                if (rooms[room].users.length > 0) {
                    const memberLeftMessage = {
                        type: "leave",
                        payload: {
                            username: leavingUser.username,
                            roomId: room,
                            members: rooms[room].users.map(u => u.username)
                        }
                    };

                    rooms[room].sockets.forEach(s => {
                        s.send(JSON.stringify(memberLeftMessage));
                    });
                }
            }

            // Remove empty rooms
            if (rooms[room].users.length === 0) {
                delete rooms[room];
            }
        }
        socketToRoom.delete(socket);
        allSockets.filter(s => s.socket !== socket)
        console.log('Socket disconnected and cleaned up');
    });

    socket.on("message", (message) => {


        const parsedMessage = JSON.parse(message as unknown as string);

        // const parsedMessage = JSON.parse(message as unknown as string);

        if (parsedMessage.type == 'join') {
            const room = parsedMessage.payload.roomId;
            const username = parsedMessage.payload.sender;
            if (socketToRoom.get(socket) === room) {
                console.log('Socket already in room', room)
                return;
            }

            // remove the socket from old rooms before joining
            const currentRoom = socketToRoom.get(socket);
            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].sockets = rooms[currentRoom].sockets.filter(s => s !== socket)
                rooms[currentRoom].users = rooms[currentRoom].users.filter(u => u.socket !== socket)

                const userLeftMessage = {
                    type: "leave",
                    payload: {
                        username: username,
                        roomId: currentRoom,
                        members: rooms[currentRoom].users.map(u => u.username)
                    }
                }

                rooms[currentRoom].sockets.forEach(s => {
                    s.send(JSON.stringify(userLeftMessage))
                })
                relayerSocket.send(JSON.stringify(userLeftMessage))


            }



            //room created only ones
            if (!rooms[room]) {
                rooms[room] = {

                    sockets: [],
                    users: []
                }
            }

            const existingUserIndex = rooms[room].users.findIndex(u => u.username === username);
            if (existingUserIndex !== -1) {
                // Remove the old entry for this user
                rooms[room].users.splice(existingUserIndex, 1);
                const existingSocketIndex = rooms[room].sockets.findIndex(s => s === rooms[room].users[existingUserIndex]?.socket);
                if (existingSocketIndex !== -1) {
                    rooms[room].sockets.splice(existingSocketIndex, 1);
                }
            }
            rooms[room].sockets.push(socket);
            // console.log(`socket pushed`)
            rooms[room].users.push({ username, socket });
            socketToRoom.set(socket, room)

            // rooms[room].users.push(username)
            const currentMembers = rooms[room].users.map(u => u.username)
            const memberListMessage = {
                type: "memberslist",
                payload: {
                    members: currentMembers,
                    roomId: room
                }
            }

            socket.send(JSON.stringify(memberListMessage))
            relayerSocket.send(JSON.stringify(memberListMessage))


            allSockets.push({
                socket,
                room: parsedMessage.payload.roomId,
                userInfo: parsedMessage.payload.userInfo
            });
            const memberJoinedMessage = {
                type: 'memberjoined',
                payload: {
                    username: username,
                    roomId: room,
                    members: currentMembers
                }
            }
            rooms[room].sockets.forEach(s => {
                if (s !== socket) {
                    s.send(JSON.stringify(memberJoinedMessage))
                }
            })

            console.log(`${username} joined the room ${room}`)
            relayerSocket.send(JSON.stringify(parsedMessage))
            relayerSocket.send(JSON.stringify(memberJoinedMessage))


        }
        else if (parsedMessage.type === 'typing') {
            const room = parsedMessage.payload.roomId
            if (rooms[room]) {
                rooms[room].sockets.filter(sct => sct !== socket).forEach(sct => {
                    sct.send(JSON.stringify(parsedMessage))
                })
            }

            relayerSocket.send(JSON.stringify(parsedMessage))
        }
        else if (parsedMessage.type === 'leave') {
            const room = parsedMessage.payload.roomId
            const username = parsedMessage.payload.sender
            const currentMembers = rooms[room].users.map(u => u.username)

            // Handle explicit leave message
            // (though the socket.on("close") handler will also trigger)
            console.log(`User ${parsedMessage.payload.sender} explicitly left room ${parsedMessage.payload.roomId}`);
            const userLeftMessage = {
                type: "leave",
                payload: {
                    username: username,
                    roomId: room,
                    members: currentMembers
                }
            }
            relayerSocket.send(JSON.stringify(userLeftMessage))

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
                    console.log(`Message Sent ${JSON.stringify(parsedMessage)} and sockets length ${allSockets.length}`)
                })
            }


            // console.log('Forwarding chat message to relayer:', parsedMessage.payload.message);

            relayerSocket.send(JSON.stringify(parsedMessage))
        }

    })




})
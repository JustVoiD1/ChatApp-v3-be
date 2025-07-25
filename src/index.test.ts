
import { WebSocket } from "ws"

const backendurl1 = 'ws://localhost:8080'
const backendurl2 = 'ws://localhost:8081'

describe("chat-app-be", () => {
    test("message sent from room1 reaches other participants in room1", async () => {
        const ws1 = new WebSocket(`${backendurl1}`);
        const ws2 = new WebSocket(`${backendurl2}`);
        ;



        await new Promise<void>((resolve, reject) => {
            let cnt = 0;
            ws1.onopen = () => {
                cnt++;
                if (cnt == 2) resolve();

            }

            ws2.onopen = () => {
                cnt++;
                if (cnt == 2) resolve();

            }

        })

        ws1.send(JSON.stringify({
            type: 'join',
            payload: {
                roomId: 'Room 1'
            }
        }))
        ws2.send(JSON.stringify({
            type: 'join',
            payload: {
                roomId: 'Room 1'
            }
        }))
        await new Promise(resolve => setTimeout(resolve, 100));

        await new Promise<void>((resolve) => {
            //@ts-ignore
            ws2.onmessage = ({data} : {data : Data}) => {
                
                // const parsedData = JSON.parse(data);
                // expect(parsedData.type).toBe('chat')
                // expect(parsedData.payload.message).toBe('Hi there')
                // resolve();

                const message = data.toString();
                expect(message).toBe('Hi there');
                resolve();
            }

            ws1.send(JSON.stringify({
                type: 'chat',
                payload: {
                    roomId: 'Room 1',
                    message: 'Hi there',
                }
            }))
        })

        ws1.close()
        ws2.close()






    })
})


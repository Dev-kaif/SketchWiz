import WebSocket, { WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend/config";
import { client } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8000 });

interface User {
  ws: WebSocket;
  rooms: number[];
  userId: number;
}

interface DataType {
  type: "join_room" | "leave_room" | "chat";
  roomId: number;
  message?: string;
}

const users: User[] = [];

wss.on("connection", (socket, request) => {
  console.log("User connected");

  try {
    const url = request.url;
    const queryParam = new URLSearchParams(url?.split("?")[1]);
    const token = queryParam.get("token");

    if (!token) throw new Error("Token not provided");

    const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
    const userId = decoded.id;

    if (!userId) throw new Error("Invalid token");

    const user: User = { ws: socket, rooms: [], userId };
    users.push(user);

    socket.on("message", async (data) => {
      try {
        const parsedData: DataType = JSON.parse(data.toString());

        switch (parsedData.type) {
          case "join_room":
            if (!user.rooms.includes(parsedData.roomId)) {
              user.rooms.push(parsedData.roomId);
            }
            break;

          case "leave_room":
            user.rooms = user.rooms.filter((id) => id !== parsedData.roomId);
            break;

          case "chat":
            if (!parsedData.message) {
              console.warn("Chat message is missing");
              return;
            }

            await client.chat.create({
              data: {
                roomId: parsedData.roomId,
                message: JSON.stringify(parsedData.message),
                userId: user.userId,
              },
            });

            users.forEach((user) => {
              if (user.rooms.includes(parsedData.roomId)&& user.ws !== socket) {
                user.ws.send(
                  JSON.stringify({
                    type: "chat",
                    message: parsedData.message,
                    roomId: parsedData.roomId,
                  })
                );
              }
            });
            break;

          default:
            console.warn("Unknown message type:", parsedData.type);
        }
      } catch (error) {
        console.error("Message handling error:", error);
      }
    });

    socket.on("close", () => {
      console.log("User disconnected");
      const index = users.indexOf(user);
      if (index !== -1) {
        users.splice(index, 1);
      }
    });
  } catch (error) {
    console.error("Authentication error:", error);
    socket.close();
  }
});

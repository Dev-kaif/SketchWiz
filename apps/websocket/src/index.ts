import { WebSocketServer } from "ws";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET } from "@repo/backend/config";

const wss = new WebSocketServer({port:8000})

wss.on("connection",(socket,request)=>{
    
    console.log("user connected");

    const url = request.url;
    if(!url)return;

    const queryParam = new URLSearchParams(url.split('?')[1]);
    const token = queryParam.get('token');
    const decoded = jwt.verify(token as string, JWT_SECRET as string);

    if(!decoded || !(decoded as JwtPayload).userId ){
        socket.close();
        return;
    }

    socket.on('close',()=>{
        console.log("user Disconnected");  
    })
})
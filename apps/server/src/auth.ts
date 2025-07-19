import 'dotenv/config'
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
// import { JWT_SECRET } from '@repo/backend/config';
const JWT_SECRET = process.env.JWT_SECRET 

interface RequestWithUserId extends Request{
    userId?:string;
}


export default function auth(req:RequestWithUserId,res:Response,next:NextFunction) {
    const token = req.headers["authorization"] ?? "";

    if (!token) {
        res.status(401).json({ error: "No token provided" });
        return; 
    }

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }
    
    try{
        const decoded: string | JwtPayload = jwt.verify(token,JWT_SECRET);
        if(decoded){
            req.userId = ( decoded as JwtPayload).id;
            next();
            return;
        }else{
            res.status(403).json({ message: "User not verified" });
            return;
        }

    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" })
        return;
    }
    
}
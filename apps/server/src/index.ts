import express, { Request, Response } from 'express';
import { z } from 'zod';
import cors from 'cors'
import bcrypt from 'bcrypt';
import { CreateRoomSchema,CreateUserSchema,SigninSchema } from '@repo/common/type';

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@repo/backend/config';
import auth from './auth.js';
import { client } from '@repo/db/client';

const saltRounds = 5;

const app = express();
app.use(express.json());

app.use(cors());

type signUpRequest = z.infer<typeof CreateUserSchema>
type signInRequest = z.infer<typeof SigninSchema>

interface RequestWithUserId extends Request{
    userId?:string;
}

app.post("/api/signup",async (req:Request,res:Response)=>{

    const validation = CreateUserSchema.safeParse(req.body)
    
    if(!validation.success)return;
    
    const {email,username,password,name,photo}:signUpRequest = req.body;

    const hashPassword = await bcrypt.hash(password,saltRounds)
        
        await client.user.create({
            data:{
                username,
                email,
                name,
                password:hashPassword,
                photo
            }
        })
    
        res.json({message:"you have sign up"})
        return;
})

app.post("/api/signin",(req:Request,res:Response)=>{
    const validation = SigninSchema.safeParse(req.body)
    
    if(!validation.success)return;

    const {email,password}:signInRequest = req.body;

    res.status(200).json({ message: "Signin successful" });

})

app.get("/api/room",auth,(req:RequestWithUserId ,res:Response)=>{
    
    res.status(200).json({ message: "joined room" });
    
})

app.listen(5000,()=>{
});


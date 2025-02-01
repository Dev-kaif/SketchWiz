import express, { Request, Response } from 'express';
import { z } from 'zod';
import cors from 'cors'
import bcrypt from 'bcrypt';

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config';
import auth from './auth';

console.log(JWT_SECRET);

const saltRounds = 5;

const app = express();
app.use(express.json());

app.use(cors());

const reqbody = z.object({
    email:z.string().email(),
    username:z.string().min(1).max(30),
    password:z.string().min(8, { message: "Password must be at least 8 characters long" })
})

type signUpRequest = z.infer<typeof reqbody>

app.post("/api/signup",async (req:Request,res:Response)=>{

    const validation = reqbody.safeParse(req.body)
    
    if(!validation.success)return;
    
    const {email,username,password} = req.body;

    const hashPassword = await bcrypt.hash(password,saltRounds)
    
    //send to backend

    res.json({message:"you have sign up"})

})

app.post("/api/signin",(req:Request,res:Response)=>{
    const {email,password}:Pick<signUpRequest,'email'|'password'> = req.body;

    res.status(200).json({ message: "Signin successful" });

})

interface RequestWithUserId extends Request{
    userId?:string;
}



app.get("/api/room",auth,(req:RequestWithUserId ,res:Response)=>{
    
    res.status(200).json({ message: "joined room" });
    
})

app.listen(5000,()=>{
    console.log("running at 5000"); 
});


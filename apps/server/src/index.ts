import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { RoomSchema, CreateUserSchema, SigninSchema } from '@repo/common/type';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@repo/backend/config';
import auth from './auth.js';
import { client } from '@repo/db/client';

const app = express();
app.use(express.json());
app.use(cors());

const SALT_ROUNDS = 10;

// Augment Express Request type globally
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

app.post("/api/signup", async (req: Request, res: Response) => {
  const validation = CreateUserSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      message: "Invalid Credential Inputs",
      errors: validation.error.flatten()
    });
    return;
  }

  try {
    const { email,username,password,name,photo  } = validation.data;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log(validation.data);
    
    await client.user.create({
      data: {
        username,
        email,
        name,
        photo:photo || null,
        password: hashedPassword
      }
    });

    res.status(201).json({message: "User created successfully",});
    return;

  } catch (error) {

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      res.status(409).json({message: "User with this email or username already exists"});
      return;
    }

    res.status(500).json({
      message: "Internal server error during signup"
    });
    return;
  }
});

app.post("/api/signin", async (req: Request, res: Response) => {
  const validation = SigninSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      message: "Invalid Credentials",
      errors: validation.error.flatten()
    });
    return;
  }

  const { email, password } = validation.data;

  try {
    const user = await client.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid credentials"
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "Invalid credentials"
      });
      return;
    }

    const token = jwt.sign({ id: user.id },JWT_SECRET as string);

    res.status(200).json({
      message: "Signin successful",
      token,
    });
    return;
  } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({
        message: "Internal server error during signin"
      });
      return;
  }
});

// Protected Room Endpoints

// create new room
app.post("/api/room", auth, async (req: Request, res: Response) => {
  const parsedData = RoomSchema.safeParse(req.body);
  
  if(!parsedData.success){
    res.json({
      message:"Incorrect Inputs"
    })
    return;
  }
  
  try {
      const {roomName} = parsedData.data

      const userId = Number(req.userId);
      const response = await client.room.create({
        data:{
          adminId:userId,
          slug:roomName
        }
      })

      res.status(200).json({message: "Joined room", room:response});
      return;
  } catch (error) {
      console.error("Signin error:", error);
      res.status(403).json({
        message: "Room ALready exist"
      });
      return;
  }
});

//get all the user's room
app.get("/api/rooms",auth,async (req: Request, res: Response) => {
  const userId = Number(req.userId);
  try {
    const rooms = await client.room.findMany({
      where:{
        adminId:userId
      }
    })
    res.status(200).json({rooms})
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }

})

//get previous messages
app.get("/api/room/:roomId",auth,async (req:Request,res:Response)=>{
  const roomId = Number(req.params.roomId);
  try {
    const messages = await client.chat.findMany({
      where:{
        roomId:roomId
      }
    })
  
    res.status(200).json({messages})

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }
})

// get roomId with the help of slug
app.get("/api/room/slug/:slug",auth,async (req:Request,res:Response)=>{
  
  const slug = req.params.slug
  
  try {
    const room = await client.room.findFirst({
      where:{
        slug
      }
    })
    res.status(200).json({room})

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }
})

//delete room with its content
app.delete("/api/room/delete/:roomId", auth, async (req: Request, res: Response) => {
  const roomId = Number(req.params.roomId);

  try {
    // Use a transaction to delete the room's content first,
    // then delete the room itself.
    const response = await client.$transaction([
      client.chat.deleteMany({
        where: { roomId },
      }),
      client.room.delete({
        where: { id: roomId },
      }),
    ]);

    res.status(200).json({ 
      message: `Room ${response[1].slug} and data associated content items deleted successfully.`,
      room: response[1]
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

//delete canvas content
app.delete("/api/room/delete/content/:roomId", auth, async (req: Request, res: Response) => {
  const roomId = Number(req.params.roomId);
  try {
    const response = await client.chat.deleteMany({
      where:{
        roomId
      }
    })

    res.status(200).json({ message: `Content deleted successfully.`,response});
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
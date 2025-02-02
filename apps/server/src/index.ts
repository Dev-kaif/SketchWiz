import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { CreateRoomSchema, CreateUserSchema, SigninSchema } from '@repo/common/type';
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
      message: "Validation error",
      errors: validation.error.flatten()
    });
    return;
  }

  try {
    const { email,username,password,name,photo  } = validation.data;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

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
      message: "Validation error",
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
      userId: user.id
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

// Protected Room Endpoint
app.get("/api/room", auth, (req: Request, res: Response) => {



  res.status(200).json({message: "Joined room",userId: req.userId});
  return;
});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
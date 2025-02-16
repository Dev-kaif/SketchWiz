import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { RoomSchema, CreateUserSchema, SigninSchema } from "@repo/common/type";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend/config";
import auth from "./auth.js";
import { client } from "@repo/db/client";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "@repo/backend/config";

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
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const { email, username, password, name, photo } = validation.data;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await client.user.create({
      data: {
        username,
        email,
        name,
        photo: photo || null,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "User created successfully" });
    return;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      res
        .status(409)
        .json({ message: "User with this email or username already exists" });
      return;
    }

    res.status(500).json({
      message: "Internal server error during signup",
    });
    return;
  }
});

app.post("/api/signin", async (req: Request, res: Response) => {
  const validation = SigninSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: "Invalid Credentials",
      errors: validation.error.flatten(),
    });
    return;
  }

  const { email, password } = validation.data;

  try {
    const user = await client.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid credentials",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "Invalid credentials",
      });
      return;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET as string);

    res.status(200).json({
      message: "Signin successful",
      token,
    });
    return;
  } catch (error) {
    res.status(500).json({
      message: "Internal server error during signin",
    });
    return;
  }
});

// Protected Room Endpoints

// create new room
app.post("/api/room", auth, async (req: Request, res: Response) => {
  const parsedData = RoomSchema.safeParse(req.body);

  if (!parsedData.success) {
    res.json({
      message: "Incorrect Inputs",
    });
    return;
  }

  try {
    const { roomName } = parsedData.data;

    const userId = Number(req.userId);
    const response = await client.room.create({
      data: {
        adminId: userId,
        slug: roomName,
      },
    });

    res.status(200).json({ message: "Joined room", room: response });
    return;
  } catch (error) {
    res.status(403).json({
      message: "Room ALready exist",
    });
    return;
  }
});

//get all the user's room
app.get("/api/rooms", auth, async (req: Request, res: Response) => {
  const userId = Number(req.userId);
  try {
    const rooms = await client.room.findMany({
      where: {
        adminId: userId,
      },
    });
    res.status(200).json({ rooms });
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }
});

//get previous messages
app.get("/api/room/:roomId", auth, async (req: Request, res: Response) => {
  const roomId = Number(req.params.roomId);
  try {
    const messages = await client.chat.findMany({
      where: {
        roomId: roomId,
      },
    });

    res.status(200).json({ messages });

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }
});

// get roomId with the help of slug
app.get("/api/room/slug/:slug", auth, async (req: Request, res: Response) => {
  const slug = req.params.slug;

  try {
    const room = await client.room.findFirst({
      where: {
        slug,
      },
    });
    res.status(200).json({ room });

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.json({ error: error.message });
    } else {
      res.json({ error: "An unexpected error occurred" });
    }
  }
});

//delete room with its content
app.delete(
  "/api/room/delete/:roomId",
  auth,
  async (req: Request, res: Response) => {
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
        room: response[1],
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unexpected error occurred" });
      }
    }
  }
);

//delete canvas content
app.delete(
  "/api/room/delete/content/:roomId",
  auth,
  async (req: Request, res: Response) => {
    const roomId = Number(req.params.roomId);
    try {
      const response = await client.chat.deleteMany({
        where: {
          roomId,
        },
      });

      res
        .status(200)
        .json({ message: `Content deleted successfully.`, response });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unexpected error occurred" });
      }
    }
  }
);

const upload = multer();

// Initialize the Gemini generative AI model with your API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface GenerativePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

function fileToGenerativePart(
  imageBuffer: Buffer,
  mimeType: string
): GenerativePart {
  return {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };
}

async function analyzeImage(
  imageBuffer: Buffer,
  dictOfVars: Record<string, any>
): Promise<object[]> {
  // Convert the dictionary of variables to a string
  const dict_of_vars_str = JSON.stringify(dictOfVars);

  // Build the prompt (mirroring your Python version) that includes the variables.
  const prompt =
    'f"You have been given an image that contains various mathematical, graphical, abstract problems, or event descriptions. Your task is to analyze the image and either solve, interpret, or provide recommendations based on its content. The image will clearly fall into exactly one of the following categories, each with specific handling requirements:\\n\\n' +
    "1. Simple Mathematical Expression:\\n" +
    "   - Examples: 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.\\n" +
    "   - Solve the expression using the PEMDAS rule (i.e., Parentheses, Exponents, Multiplication/Division left-to-right, Addition/Subtraction left-to-right).\\n" +
    "   - Return your answer as a list containing a single dictionary formatted as: [{'expr': <original expression>, 'result': <calculated answer>}].\\n\\n" +
    "2. Set of Equations:\\n" +
    "   - Examples: x^2 + 2x + 1 = 0, 3y + 4x = 0, 5x^2 + 6y + 7 = 12, etc.\\n" +
    "   - Solve for all variables present. For each variable, return a dictionary formatted as: {'expr': '<variable>', 'result': <calculated value>, 'assign': True}.\\n" +
    "   - Return the results as a comma-separated list of dictionaries.\\n\\n" +
    "3. Variable Assignment:\\n" +
    "   - Examples: x = 4, y = 5, z = 6, etc.\\n" +
    "   - Directly assign the provided values to their respective variables.\\n" +
    "   - Return the assignments as a list of dictionaries (each with 'assign': True), e.g., [{'expr': 'x', 'result': 4, 'assign': True}].\\n\\n" +
    "4. Graphical Math Problems:\\n" +
    "   - These include word problems depicted as drawings (e.g., collisions, trigonometric setups, Pythagorean problems, or sports scenarios).\\n" +
    "   - Pay close attention to visual details, including color coding and annotations.\\n" +
    "   - Return your answer as a list containing a single dictionary formatted as: [{'expr': <description>, 'result': <calculated answer>}].\\n\\n" +
    "5. Abstract Concept Interpretation with Interactive Suggestions:\\n" +
    "   - This category combines abstract concept interpretation with interactive suggestions. It covers images representing abstract ideas (e.g., love, hate, jealousy, patriotism), historical references, or additional interactive drawings that imply further actions.\\n" +
    "   - Analyze the drawing and provide a clear explanation of the underlying concept.\\n" +
    "   - Additionally, if the image suggests further actions or interactive elements, include actionable suggestions or next steps.\\n" +
    "   - Format your answer as a list containing a single dictionary, e.g., [{'expr': <explanation>, 'result': <abstract concept>, 'suggestion': <next steps>}] (the 'suggestion' key is optional if not applicable).\\n\\n" +
    "6. Complex Systems of Equations and Advanced Mathematical Problems:\\n" +
    "   - This category includes systems with multiple variables, complex functions (trigonometric, logarithmic, exponential), and expressions requiring symbolic manipulation.\\n" +
    "   - Solve the system or expression, including intermediate computation steps where necessary. For unique solutions, return each variable’s result as in category 2. For systems with multiple or infinite solutions, provide a parameterized solution or include an 'error' key with an explanation.\\n" +
    "   - For advanced expressions, include a 'steps' key that lists intermediate computation steps.\\n" +
    "   - Format the answer as a list of dictionaries, e.g., [{'expr': <original expression>, 'result': <calculated answer>, 'steps': [<step1>, <step2>, ...]}].\\n\\n" +
    "7. Multi-Part or Ambiguous Problems:\\n" +
    "   - If the image contains multiple distinct problems spanning different categories, separate each problem's response clearly.\\n" +
    "   - For each distinct problem, include a key indicating the problem type and return the answer in the appropriate format as defined above.\\n" +
    "   - If any problem is ambiguous or incomplete, return a dictionary with an 'error' key and a detailed message explaining the ambiguity.\\n\\n" +
    "8. Event or Abstract Scenario Analysis with Next Steps:\\n" +
    "   - If the image depicts a specific event or abstract scenario (e.g., an event description, social gathering, protest, or any scene conveying a situation), analyze and interpret the event.\\n" +
    "   - Provide a clear explanation of the event or scenario, and include actionable suggestions or next steps.\\n" +
    "   - Format your answer as a list containing a single dictionary with keys: 'expr' for your interpretation, 'result' for the summary or abstract concept, and 'suggestion' for your recommended next steps.\\n\\n" +
    "Additional Guidelines:\\n" +
    "   - Use extra backslashes for escape characters (e.g., \\f becomes \\\\f and \\n becomes \\\\n).\\n" +
    "   - Do NOT include any double quotes inside the string values. If the image content contains double quotes, either remove them or replace them with single quotes.\\n\\n" +
    "   - DO NOT USE BACKTICKS OR MARKDOWN FORMATTING in your output.\\n" +
    "   - Replace any variables in the expression with their actual values from the provided dictionary: ${dict_of_vars_str}.\\n" +
    "   - Ensure all keys and values in your returned dictionaries are properly quoted to facilitate parsing with Python's ast.literal_eval.\\n\\n" +
    'Analyze the image content thoroughly and return your answer following these rules, including detailed intermediate steps, robust error handling, and actionable suggestions or next steps when applicable."';

  try {
    // Define the MIME type for the image (adjust if needed)
    const mimeType = "image/jpeg";
    const imagePart: GenerativePart = fileToGenerativePart(
      imageBuffer,
      mimeType
    );

    // Send the prompt and image part to the Gemini model
    const result = await model.generateContent([prompt, imagePart]);
    const responseText: string = await result.response.text();

    // Clean up the response by removing markdown formatting and normalizing quotes
    const cleanedResponse = responseText
    .replace(/```json/g, "") 
    .replace(/```/g, "")
    .replace(/'/g, '"') 
    .replace(/\bTrue\b/g, "true") 
    .replace(/\bFalse\b/g, "false")
    .replace(/:\s*"([^"]*?)"(?=\s*[},])/g, (match, p1) => `: "${p1.replace(/"/g, '\\"')}"`); // Escape quotes inside values


    let answers: object[] = [];
    try {
      answers = JSON.parse(cleanedResponse);
    } catch (error) {
      return [ {cleanedResponse} ];
    }

    return answers;
  } catch (error) {
    throw error;
  }
}

/**
 * POST /analyze
 * Expects a multipart/form-data request with an "image" file and optionally a "dictOfVars" field (JSON string).
 * Returns the analysis result from the generative AI model.
 */
app.post("/api/analyze/ai", upload.single("image"),async (req: Request, res: Response) => {
    try {
      // Ensure an image file was uploaded
      if (!req.file) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      // Get the image buffer from the uploaded file.
      const imageBuffer: Buffer = req.file.buffer;

      // Optionally, retrieve additional parameters (as a JSON string) from the request body.
      const dictOfVars: Record<string, any> = req.body.dictOfVars
        ? JSON.parse(req.body.dictOfVars)
        : {};

      // Process the image using the analyzeImage function.
      const analysisResult = await analyzeImage(imageBuffer, dictOfVars);
      res.json({ analysisResult });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

const PORT = 5000;

app.listen(PORT);

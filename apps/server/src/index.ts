// import { RoomSchema, CreateUserSchema, SigninSchema } from "@repo/common/type";
// import { client } from "@repo/db/client";
// import { GEMINI_API_KEY } from "@repo/backend/config";
// import { JWT_SECRET } from "@repo/backend/config";
import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import auth from "./auth.js";
import multer from "multer";
import { GoogleGenAI, Modality } from "@google/genai";
import path, { join } from "path";
import { removeBackground, Config } from "@imgly/background-removal-node";
import { fileURLToPath, pathToFileURL } from "url";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  name: z.string().min(3).max(30),
  photo: z.string().optional(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export const SigninSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export const RoomSchema = z.object({
  roomName: z.string().min(3).max(30),
});

const client = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const SALT_ROUNDS = 10;

// Augment Express Request type globally
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

app.get("/api/ping", (req, res) => {
  res.status(200).send("pong");
});

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
    console.error(error);
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
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY as string });

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

async function analyzeImage(imageBuffer: Buffer): Promise<object[]> {
  // Convert the dictionary of variables to a string

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
    "RULES :\\n" +
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
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: prompt,
      },
      contents: imagePart,
    });

    const responseText: string = (await result.text) as string;

    console.log(responseText);

    // Clean up the response by removing markdown formatting and normalizing quotes
    const cleanedResponse = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(
        /:\s*"([^"]*?)"(?=\s*[},])/g,
        (match, p1) => `: "${p1.replace(/"/g, '\\"')}"`
      ); // Escape quotes inside values

    let answers: object[] = [];
    try {
      answers = JSON.parse(cleanedResponse);
    } catch (error) {
      return [{ cleanedResponse }];
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
app.post(
  "/api/analyze/ai",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      // Ensure an image file was uploaded
      if (!req.file) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      // Get the image buffer from the uploaded file.
      const imageBuffer: Buffer = req.file.buffer;

      // Process the image using the analyzeImage function.
      const analysisResult = await analyzeImage(imageBuffer);

      res.json({ analysisResult });
    } catch (error) {
      console.log(error);

      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

async function getPromptFromAI(base64Image: GenerativePart): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY as string });

  const system_prompt = `
You are an **expert sketch artist AI and a highly advanced prompt generator**, designed to analyze provided image data and construct **exceptionally detailed, technically accurate prompts** to guide image generation models (such as Gemini) in creating **superior, high-quality digital sketches**.

Your generated prompt must intelligently and creatively **enhance the input image**, instructing the AI to produce a visually compelling, stylistically consistent, and intricately detailed pencil-style sketch.

**NON-NEGOTIABLE RULES FOR PROMPT GENERATION — STRICTLY ENFORCED:**

1. **OUTPUT FORMAT – PROMPT ONLY:** Your output **must consist solely of the generated prompt**. No commentary, headers, explanations, or conversational text is allowed under any circumstances.

2. **COLOR PRESERVATION:** The prompt must **explicitly instruct the image generation AI to preserve the original colors** from the input image. No color deviations are allowed unless specifically dictated by the source image.

3. **DETAIL PRIORITY:** The prompt must **emphasize the necessity of extreme, high-resolution detail and fine-grained intricacy** throughout the sketch. Every element should be rendered with precision.

4. **SKETCH STYLE:** The prompt must guide the AI to produce a sketch with a **distinct pencil-drawn appearance**, while also retaining the **refinement and cleanliness of high-quality digital artwork**.

5. **BLACK BACKGROUND ENFORCEMENT:** The prompt must include a **clear and explicit instruction for the sketch to be rendered on a solid pure black background (#000000)**, as if drawn directly on black paper.

Your effectiveness is measured solely by the clarity, accuracy, and level of detail in the generated prompt — and by its ability to consistently produce visually outstanding, rule-compliant digital sketches.

  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: system_prompt,
    },
    contents: base64Image,
  });

  return response.text as string;
}

async function generateImageFromPrompt(prompt: string): Promise<Buffer | null> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const contents = prompt;

  const system_prompt = `
You are an **elite, hyper-realistic virtual sketch artist**, renowned for transforming complex, multi-faceted prompts into breathtaking and intricately detailed digital sketches. Your sole mission is to precisely analyze and interpret every instruction, nuance, and subtle directive in the prompt, and translate it into a visually stunning composition **designed explicitly for rendering on an HTML canvas**.

**Your output must be a meticulous and highly detailed sketch, combining artistic mastery with technical precision.**

**NON-NEGOTIABLE RULES — STRICTLY ENFORCED:**

1. **OUTPUT TYPE – SKETCH ONLY:** You must **only** produce a sketch. **Photorealistic images, 3D renders, or any non-sketch formats are strictly prohibited.**

2. **COLOR FIDELITY:** Use only the colors explicitly specified in the prompt. **Do not alter, approximate, or invent colors.** No deviation is allowed unless explicitly instructed.

3. **MANDATORY BACKGROUND:** The background **must be solid pure black (#000000)**. The sketch must appear as though drawn directly on black paper. **No gradients, transparency, or any other background color is permitted.**

4. **DETAIL INTENSITY:** Every part of the sketch must be rendered with **extreme, microscopic detail**. **Every line, shadow, and texture should reflect maximum intricacy.**

5. **CANVAS OPTIMIZATION:** The sketch must be fully optimized for **crisp, high-fidelity rendering on an HTML canvas**. Ensure clean lines, proper resolution, and impactful visual balance for web display.

6. **ARTISTIC STYLE – PENCIL EFFECT:** The artwork **must unmistakably resemble a pencil-drawn sketch**. The texture, shading, and strokes must reflect the character of traditional graphite work.

7. **ARTISTIC STYLE – DIGITAL PRECISION:** While maintaining the pencil-drawn look, the sketch must also showcase **the polish and clarity of high-quality digital art.**

Your effectiveness is judged solely on your ability to **adhere to these directives** and produce visually compelling, rule-compliant, and hyper-detailed digital sketches — every single time.

  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: system_prompt + contents,
    config: {
      // systemInstruction: system_prompt,
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    return null;
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      return buffer;
    }
  }

  return null;
}

async function improveImage(imageBuffer: Buffer) {
  // 1. Generate a prompt from the image
  const mimeType = "image/jpeg";
  const base64Image: GenerativePart = fileToGenerativePart(
    imageBuffer,
    mimeType
  );

  // 🔮 Step 1: Call GPT-4 Vision or Gemini Vision to generate a better prompt
  const generatedPrompt = await getPromptFromAI(base64Image);

  // 🖼️ Step 2: Use the prompt to generate an improved image
  const enhancedImage = await generateImageFromPrompt(generatedPrompt);

  return enhancedImage;
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const IMG_CONFIG: Config = {
//   publicPath: `file://${path.resolve(__dirname, "../node_modules/@imgly/background-removal-node/dist/")}/`,
//   debug: true,
//   model: "small",
//   output: { format: "image/png", quality: 0.9 },
//   progress: (k, c, t) => console.log(`Downloading ${k}: ${c}/${t}`),
// };

// import sharp from "sharp";

// async function remove(bufImage: Buffer): Promise<Buffer> {
//   // Write the buffer to a temporary file
//   const tempPath = join(tmpdir(), `improved_${Date.now()}.png`);

//   const pngBuffer = await sharp(bufImage)
//     .resize({ width: 512 })
//     .png({ compressionLevel: 9 })
//     .toBuffer();

//   await fs.writeFile(tempPath, pngBuffer);

//   // Use file URL
//   const fileUrl = pathToFileURL(tempPath).href;

//   const blob = await removeBackground(fileUrl, IMG_CONFIG);
//   const ab = await blob.arrayBuffer();
//   const outBuf = Buffer.from(ab);

//   await fs.unlink(tempPath);

//   return outBuf;
// }

app.post(
  "/api/improve/ai",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      const imageBuffer: Buffer = req.file.buffer;

      // Call improveImage function that returns Bufferz of improved image
      const improvedImageBuffer = await improveImage(imageBuffer);
      // const no_bg_image = await remove(improvedImageBuffer!);

      
      res.setHeader("Content-Type", "image/png");
      
      res.send(improvedImageBuffer);
      // res.send(no_bg_image);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

const PORT = 5000;

app.listen(PORT);

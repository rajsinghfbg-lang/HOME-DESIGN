import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup body parsers with limits for base64 images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Initialize Gemini client (Lazy initialization where possible, but we check key presence)
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Endpoint 1: Makeover generation using gemini-2.5-flash-image or gemini-3.1-flash-image
  app.post("/api/makeover", async (req, res) => {
    try {
      const { image, style } = req.body;

      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }
      if (!style) {
        return res.status(400).json({ error: "No style selected" });
      }

      // Check for API key presence
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          error: "API_KEY_MISSING",
          message: "No Gemini API Key found in server environment. Please configure it in Settings > Secrets."
        });
      }

      const ai = getGeminiClient();

      // Parse the base64 image
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 image format" });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Invoke Gemini to generate/edit the room image in the requested style
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Reimagine this room fully in "${style}" interior design style. Make it extremely detailed, highly styled, professional, photorealistic, and complete. Maintain the architectural structure (walls, windows, ceilings) of the original room but completely makeover the furniture, color scheme, rug, wall art, lighting fixtures, and decor items to perfectly match the "${style}" aesthetic.`,
            },
          ],
        },
      });

      let generatedBase64 = null;
      let textExplanation = "";

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            generatedBase64 = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            textExplanation += part.text;
          }
        }
      }

      if (generatedBase64) {
        res.json({
          success: true,
          image: generatedBase64,
          explanation: textExplanation || `Successfully reimagined the space in ${style} style.`
        });
      } else {
        res.status(502).json({
          success: false,
          error: "GENERATION_FAILED",
          message: "The model did not return an image. This might be due to content filters or a temporary issue. Please try another image or style."
        });
      }
    } catch (error: any) {
      console.error("Error in /api/makeover:", error);
      res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred while reimagining the room."
      });
    }
  });

  // Endpoint 2: Consultant Chat using gemini-3.5-flash with JSON schema for shoppable products
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, style, currentRoomInfo } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      // If API key is missing, respond with a helpful mock-up
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          reply: `I'm here as your AI Interior Design Consultant! (Note: Gemini API Key is missing in Settings, so I'm running in offline/consultant sandbox mode). 

For the **${style}** style, your design looks incredible. Adding elements like a customized plush rug or stylized lighting will beautifully pull the room together. What specific elements are you looking to refine?`,
          suggestedProducts: [
            {
              name: "Minimalist Modern Table Lamp",
              price: "$75.00",
              store: "West Elm",
              url: "https://www.westelm.com",
              description: "A sleek ceramic base with linen drum shade providing soft ambient lighting."
            },
            {
              name: "Cozy Wool Area Rug (5x8)",
              price: "$299.00",
              store: "Wayfair",
              url: "https://www.wayfair.com",
              description: "High pile organic wool rug to bring rich texture and warmth to your space."
            }
          ]
        });
      }

      const ai = getGeminiClient();

      // Format the message history into prompt guidelines or parts
      const systemInstruction = `You are "Aura", an elite, warm, and highly experienced AI Interior Design Consultant. 
Your objective is to help the user refine their room design, give creative color advice, layout suggestions, and recommend beautiful shoppable products. 

Context:
- Currently selected design style: "${style}"
- User's active room scenario: ${JSON.stringify(currentRoomInfo || {})}

Rules:
1. Provide elegant, professional interior design advice. Talk about proportions, textures, color palettes, and focal points.
2. If the user asks for a refinement (e.g., "make the rug blue" or "add a reading corner"), enthusiastically guide them on how to incorporate that change within the "${style}" aesthetic.
3. Keep the markdown conversational and easy to read.
4. You MUST suggest 1 to 3 actual shoppable products that align perfectly with their refinement request or current style. 
5. Return your answer ONLY as a JSON object matching the requested schema.`;

      // Map the messages array to the format expected by the SDK
      const contents = messages.map((m) => {
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        };
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: "The professional, warm text response from Aura, formatted in clean Markdown with clear paragraphs and lists.",
              },
              suggestedProducts: {
                type: Type.ARRAY,
                description: "List of 1-3 shoppable products that match the conversation and design style.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Compact name of the product" },
                    price: { type: Type.STRING, description: "Estimated price with dollar sign (e.g. $145)" },
                    store: { type: Type.STRING, description: "Realistic online shop name (e.g. IKEA, Article, Pottery Barn)" },
                    url: { type: Type.STRING, description: "Simulated URL link for shopping (e.g. https://www.article.com)" },
                    description: { type: Type.STRING, description: "Detailed styling tip on how and why this specific item fits their room" },
                  },
                  required: ["name", "price", "store", "url", "description"],
                },
              },
            },
            required: ["reply", "suggestedProducts"],
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("Empty response from Gemini Model");
      }

      const result = JSON.parse(jsonText);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({
        reply: "I apologize, but I encountered a slight error while rendering my advice. Let's try to refine your request!",
        suggestedProducts: [],
        error: error.message || "Unknown error"
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer();

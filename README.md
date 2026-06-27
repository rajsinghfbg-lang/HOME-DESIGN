# Aura: AI Interior Studio 🏛️

An interactive, high-fidelity room makeover applet styled in a premium **Editorial Aesthetic** (Playfair Display serif headings, warm neutral palettes, and elegant borders). Users can upload a photo of their current space, choose from designer style proposals, and watch Gemini AI completely redesign their furniture, lighting, and textures.

![Preview](https://images.unsplash.com/photo-1616486341351-70252447c574?q=80&w=1200)

## Features 🌟

- **Original vs. Reimagined Compare Slider**: Let users drag between their original room photo and the AI-generated design with smooth, responsive mouse/touch-tracking interaction.
- **Editorial Style Carousel**: Instantly switch between high-fidelity presets:
  - **Scandinavian**: Bright, airy, and warm minimalism.
  - **Mid-Century Modern**: Retro organic shapes and warm wood tones.
  - **Bohemian**: Eclectic textures, plants, and natural fibers.
  - **Japandi**: Serene union of Japanese & Scandinavian simplicity.
  - **Industrial**: Bold textures of exposed brick and dark metal.
- **Bespoke Gemini Makeover Engine**: Upload a custom space photo and invoke `gemini-2.5-flash-image` (server-side) to completely redesign your room on demand.
- **Interactive Shoppable Hotspots**: Numbered design pins overlaid directly onto the reimagined layout displaying curated furniture tags, estimated prices, and link references.
- **Styling Consultation Companion (Aura)**: A context-aware chatbot powered by `gemini-3.5-flash` to suggest color palettes, item tips, and maintain a multi-turn design conversation.
- **"Shop the Look" Integration**: Automatically extracts shoppable matches discussed in the chat thread and aggregates them into a clean side rail.

---

## Tech Stack 🛠️

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Animations), Lucide React (Icons).
- **Backend**: Express.js (Node server), TSX, Esbuild (bundles server into CJS for optimal container cold starts).
- **AI Integration**: Official `@google/genai` SDK querying `gemini-2.5-flash-image` and `gemini-3.5-flash` with strict structured JSON schemas.

---

## Getting Started 🚀

### Prerequisites
- Node.js (v18+)
- A Gemini API Key from Google AI Studio.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/aura-ai-interior-studio.git
   cd aura-ai-interior-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a `.env` file in the root:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   *The application will boot up on `http://localhost:3000`.*

### Building for Production

Compile both the static assets and the Express server:
```bash
npm run build
npm start
```
This bundles the backend into `dist/server.cjs` and the frontend into `dist/index.html` for clean deployment.

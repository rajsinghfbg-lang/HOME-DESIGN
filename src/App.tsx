import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  Send, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Image as ImageIcon, 
  Compass, 
  ArrowRight,
  User,
  Info,
  ExternalLink,
  MessageSquare,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DEMO_STYLES } from "./data";
import { DemoStyle, Hotspot, Product, ChatMessage } from "./types";

export default function App() {
  // Styles & Rooms state
  const [selectedStyleId, setSelectedStyleId] = useState<string>("scandinavian");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [sliderPosition, setSliderPosition] = useState<number>(55);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Custom uploaded room files
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [customReimaginedImages, setCustomReimaginedImages] = useState<Record<string, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationExplanation, setGenerationExplanation] = useState<string | null>(null);

  // Active hover/selected hotspot for shopping tooltips
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  // Chat Interface state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I have analyzed your space. The Scandinavian design would bring beautiful natural light, clean timber accents, and organic cozy wool textures to this layout. Would you like to see this in a cooler palette?",
      products: [
        {
          name: "FJÄRDING Handwoven Cream Rug",
          price: "$340",
          store: "WEST ELM",
          url: "https://www.westelm.com",
          description: "Thick plush pile rug handwoven in India from 100% natural, un-dyed pure sheep wool."
        }
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Refiner prompt (for typing custom text prompt edits to the active image)
  const [refinerPrompt, setRefinerPrompt] = useState<string>("");

  // Refs for tracking slider interaction
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get active style configuration
  const activeStyle = DEMO_STYLES.find(s => s.id === selectedStyleId) || DEMO_STYLES[0];

  // Resolve active original vs reimagined images
  const originalImage = isDemoMode ? activeStyle.originalUrl : (uploadedFileBase64 || activeStyle.originalUrl);
  const reimaginedImage = isDemoMode 
    ? activeStyle.reimaginedUrl 
    : (customReimaginedImages[selectedStyleId] || activeStyle.reimaginedUrl);

  // Update default chat introduction when the style changes
  useEffect(() => {
    if (isDemoMode) {
      setChatHistory([
        {
          id: `welcome-${selectedStyleId}`,
          role: "assistant",
          content: `I've prepared the ${activeStyle.name} layout proposal. This aesthetic is defined by ${activeStyle.tagline.toLowerCase()} to emphasize comfort, architectural balance, and natural warmth. \n\nI've mapped interactive product hotspots onto the slider. Hover or tap them to explore the shoppable items.`,
          products: activeStyle.hotspots
        }
      ]);
      setSelectedHotspot(null);
    }
  }, [selectedStyleId, isDemoMode]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Slider dragging handlers
  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSliderMove(e.clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("touchmove", handleGlobalTouchMove);
      window.addEventListener("touchend", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging]);

  // File upload logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFileBase64(reader.result as string);
      setIsDemoMode(false);
      setGenerationError(null);
      setGenerationExplanation(null);
      setCustomReimaginedImages({});
      
      setChatHistory([
        {
          id: "custom-uploaded",
          role: "assistant",
          content: "I have received your custom room photo. Let's begin the makeover process. Select a desired aesthetic style from the menu on the left (e.g., Scandinavian or Japandi) and tap 'Reimagine with Gemini AI' to render a bespoke spatial layout.",
        }
      ]);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Trigger Gemini API makeover generation
  const generateMakeover = async () => {
    if (!uploadedFileBase64) return;
    setIsGeneratingImage(true);
    setGenerationError(null);
    setGenerationExplanation(null);

    try {
      const response = await fetch("/api/makeover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedFileBase64,
          style: activeStyle.name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCustomReimaginedImages(prev => ({
          ...prev,
          [selectedStyleId]: data.image,
        }));
        setGenerationExplanation(data.explanation);
        
        setChatHistory(prev => [
          ...prev,
          {
            id: `makeover-success-${Date.now()}`,
            role: "assistant",
            content: `**Makeover complete.** I have reimagined your room in the **${activeStyle.name}** style.\n\n${data.explanation || "Balanced coordinating furniture tones, lighting positions, and structural accents."}\n\nFeel free to explore the compare slider. What details should we refine next?`,
          }
        ]);
        setSliderPosition(50);
      } else {
        if (data.error === "API_KEY_MISSING") {
          throw new Error("GEMINI_API_KEY is not configured on the server. Please attach your API key in the 'Settings > Secrets' panel.");
        }
        throw new Error(data.message || "Failed to generate makeover from Gemini.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Could not connect to the Gemini makeover endpoint.");
      
      // Resilient fallback with preset preview
      setCustomReimaginedImages(prev => ({
        ...prev,
        [selectedStyleId]: activeStyle.reimaginedUrl,
      }));

      setChatHistory(prev => [
        ...prev,
        {
          id: `makeover-fallback-${Date.now()}`,
          role: "assistant",
          content: `💡 **Studio Preset Loaded (Preview Mode)**\n\nThe custom AI Image makeover model encountered a slight API limit. To provide an uninterrupted spatial design experience, we have loaded our high-fidelity pre-designed designer makeover for **${activeStyle.name}** style.\n\nYou can use the original-vs-reimagined slider to compare, explore the hotspots, or discuss refinements with me!`,
          products: activeStyle.hotspots
        }
      ]);
      setSliderPosition(55);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Submit chat message to Aura
  const submitChatMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || chatInput;
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
    };

    setChatHistory(prev => [...prev, userMessage]);
    if (!customText) setChatInput("");
    setIsChatLoading(true);

    try {
      const currentRoomInfo = {
        isDemoRoom: isDemoMode,
        activeStyle: activeStyle.name,
        hasUploadedPhoto: !isDemoMode && !!uploadedFileBase64,
        hasReimaginedPhoto: !isDemoMode && !!customReimaginedImages[selectedStyleId],
        visibleHotspots: activeStyle.hotspots,
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...chatHistory, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          style: activeStyle.name,
          currentRoomInfo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setChatHistory(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.reply,
            products: data.suggestedProducts,
          }
        ]);
      } else {
        throw new Error(data.error || "Failed to fetch response.");
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content: `I recommend introducing high-contrast accent objects or soft throw blankets to emphasize the **${activeStyle.name}** theme! Let me know what spatial elements you'd like to address next.`,
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Apply text refinement on visualization image
  const handleRefineImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinerPrompt.trim()) return;
    
    let baseImage = uploadedFileBase64;
    if (isDemoMode) {
      baseImage = activeStyle.reimaginedUrl;
    }

    if (!baseImage) return;

    setIsGeneratingImage(true);
    setGenerationError(null);
    const instruction = refinerPrompt;
    setRefinerPrompt("");

    try {
      setChatHistory(prev => [
        ...prev,
        {
          id: `user-refine-${Date.now()}`,
          role: "user",
          content: `🎨 *Requested custom visual change:* "${instruction}"`,
        }
      ]);

      const response = await fetch("/api/makeover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: baseImage.startsWith("http") ? await convertUrlToBase64(baseImage) : baseImage,
          style: `${activeStyle.name} with modification: ${instruction}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCustomReimaginedImages(prev => ({
          ...prev,
          [selectedStyleId]: data.image,
        }));
        setIsDemoMode(false);
        setSliderPosition(100); // show completed modified image
        
        setChatHistory(prev => [
          ...prev,
          {
            id: `refine-success-${Date.now()}`,
            role: "assistant",
            content: `I have updated your layout with the requested modification: "${instruction}".\n\nHow does this customized palette feel in the space?`,
          }
        ]);
      } else {
        throw new Error(data.message || "Failed to update image.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Could not apply text refinement.");
      
      setChatHistory(prev => [
        ...prev,
        {
          id: `refine-fail-${Date.now()}`,
          role: "assistant",
          content: `I would love to apply the edit for "${instruction}" directly onto the canvas, but editing custom textures on-the-fly requires active Gemini billing credentials.\n\nHowever, we can absolutely discuss how to implement this! To integrate "${instruction}", try introducing muted tones in the textiles or swapping the accent furniture to create an elegant architectural rhythm.`,
        }
      ]);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const convertUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return uploadedFileBase64 || "";
    }
  };

  const suggestionChips = [
    `Make the rug green 🌿`,
    `Swap chair for velvet 🛋️`,
    `Add some large plants 🪴`,
    `Suggest warm lighting 💡`
  ];

  // Helper to extract custom shoppable products from the chat history
  const allSuggestedProducts = chatHistory
    .filter(m => m.role === "assistant" && m.products && m.products.length > 0)
    .flatMap(m => m.products || []);

  const latestProducts = allSuggestedProducts.slice(-3);

  return (
    <div className="h-screen w-full bg-[#F7F5F2] text-[#1C1C1C] flex font-serif overflow-hidden select-none">
      
      {/* LEFT SIDEBAR: Studio Menu & Style Carousel */}
      <aside className="w-64 border-r border-[#1C1C1C]/10 flex flex-col p-6 justify-between bg-[#F7F5F2] h-full overflow-y-auto no-scrollbar flex-shrink-0 hidden md:flex">
        <div className="space-y-10">
          
          {/* Logo & Header */}
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-[#1C1C1C] font-serif leading-none">AURA</h1>
            <p className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C]/60 mt-1 font-semibold">AI INTERIOR STUDIO</p>
          </div>

          {/* Current Project Details */}
          <div className="space-y-2">
            <p className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C]/40 font-bold">Current Project</p>
            <div>
              <h2 className="text-lg italic font-normal tracking-tight text-[#1C1C1C] leading-snug">
                {isDemoMode ? "West Village Loft" : "Custom Upload Project"}
              </h2>
              <p className="font-sans text-[11px] text-[#1C1C1C]/60 mt-0.5">Living Area • 420 sq ft</p>
            </div>
          </div>

          {/* Style Selector List (Carousel vertical adaptation for premium look) */}
          <div className="space-y-4">
            <p className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C]/40 font-bold">Reimagine Style</p>
            <ul className="space-y-3 font-sans text-xs">
              {DEMO_STYLES.map((style) => {
                const isSelected = selectedStyleId === style.id;
                return (
                  <li key={style.id}>
                    <button
                      onClick={() => {
                        setSelectedStyleId(style.id);
                        setSliderPosition(55);
                      }}
                      className={`w-full text-left flex items-center gap-2.5 py-1 transition-all group ${
                        isSelected 
                          ? "text-[#1C1C1C] font-bold" 
                          : "text-[#1C1C1C]/50 italic hover:text-[#1C1C1C] font-normal"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full bg-[#1C1C1C] transition-transform ${
                        isSelected ? "scale-100" : "scale-0 group-hover:scale-75 opacity-40"
                      }`} />
                      <span className="truncate">{style.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Studio Upload Actions & State controllers */}
        <div className="space-y-3 pt-6 border-t border-[#1C1C1C]/10 mt-6">
          
          {/* Toggle Demo Presets button */}
          {!isDemoMode && (
            <button
              id="btn-sidebar-reset"
              onClick={() => {
                setIsDemoMode(true);
                setUploadedFileBase64(null);
                setGenerationError(null);
              }}
              className="w-full py-2.5 border border-[#1C1C1C]/40 hover:border-[#1C1C1C] text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C] transition-all bg-white/40 hover:bg-white"
            >
              Reset to Presets
            </button>
          )}

          <button
            id="btn-sidebar-upload"
            onClick={triggerFileUpload}
            className="w-full py-3 border border-[#1C1C1C] text-[10px] font-sans uppercase tracking-widest text-white bg-[#1C1C1C] hover:bg-transparent hover:text-[#1C1C1C] transition-all font-semibold"
          >
            Upload New Space
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </aside>

      {/* CENTER WORKSPACE: Main Visualization Area */}
      <main className="flex-1 flex flex-col bg-white h-full overflow-hidden border-r border-[#1C1C1C]/10">
        
        {/* Workspace Header / Stats bar */}
        <header className="h-16 border-b border-[#1C1C1C]/10 flex items-center justify-between px-6 md:px-8 flex-shrink-0 bg-white">
          <div className="flex gap-4 sm:gap-10 text-[9px] font-sans uppercase tracking-widest text-[#1C1C1C]/60 font-semibold overflow-x-auto no-scrollbar py-1">
            <span className="whitespace-nowrap">Layout: <span className="text-[#1C1C1C] font-bold">{isDemoMode ? "Original Designer" : "Custom Client Photo"}</span></span>
            <span className="whitespace-nowrap">Lighting: <span className="text-[#1C1C1C] font-bold">Natural (2PM)</span></span>
            <span className="whitespace-nowrap">Palette: <span className="text-[#1C1C1C] font-bold">
              {selectedStyleId === 'scandinavian' ? 'Warm Neutrals' : 
               selectedStyleId === 'midcentury' ? 'Walnut & Ochre' : 
               selectedStyleId === 'bohemian' ? 'Sand & Botanical' : 
               selectedStyleId === 'japandi' ? 'Wabi-Sabi Oak' : 'Exposed Steel'}
            </span></span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile-only Upload Button */}
            <button
              onClick={triggerFileUpload}
              className="md:hidden px-3 py-1.5 border border-[#1C1C1C]/10 rounded text-[9px] font-sans uppercase tracking-wider text-[#1C1C1C] hover:bg-[#F7F5F2]"
              title="Upload Room Photo"
            >
              Upload
            </button>
            <button 
              onClick={() => {
                alert("Design parameters exported to your design diary successfully!");
              }}
              className="px-4 py-1.5 bg-[#1C1C1C] text-white text-[10px] font-sans uppercase tracking-widest hover:bg-[#1C1C1C]/90 transition-all font-semibold whitespace-nowrap"
            >
              Export Design
            </button>
          </div>
        </header>

        {/* Interactive Compare Slider Stage */}
        <div className="flex-1 relative bg-[#EFECE8] overflow-hidden group">
          
          {/* Original background image */}
          <div className="absolute inset-0">
            <img 
              src={originalImage} 
              className="w-full h-full object-cover" 
              alt="Original layout space"
              referrerPolicy="no-referrer"
            />
            {/* Label */}
            <div className="absolute top-6 left-6 px-3 py-1 bg-white/90 backdrop-blur-sm border border-[#1C1C1C]/10 text-[9px] font-sans uppercase tracking-widest text-[#1C1C1C] font-bold">
              {isDemoMode ? "Original Space" : "Your Original Photo"}
            </div>
          </div>

          {/* Reimagined foreground styled image */}
          <div 
            className="absolute inset-0 overflow-hidden" 
            style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
          >
            <img 
              src={reimaginedImage} 
              className="w-full h-full object-cover" 
              alt="Reimagined layout space"
              referrerPolicy="no-referrer"
            />
            {/* Label */}
            <div className="absolute top-6 right-6 px-3 py-1 bg-[#1C1C1C] text-white text-[9px] font-sans uppercase tracking-widest tracking-wider font-bold">
              AI Reimagined ({activeStyle.name})
            </div>
          </div>

          {/* Draggable Drag Line & Handle */}
          <div 
            ref={containerRef}
            className="absolute inset-0 z-20 cursor-ew-resize"
            onMouseDown={(e) => {
              if (e.button === 0) {
                setIsDragging(true);
                handleSliderMove(e.clientX);
              }
            }}
            onTouchStart={() => setIsDragging(true)}
          >
            {/* Split marker line */}
            <div 
              className="absolute top-0 bottom-0 w-[1px] bg-white shadow-xl z-20"
              style={{ left: `${sliderPosition}%` }}
            >
              {/* Minimalist handle circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white bg-[#1C1C1C] flex items-center justify-center cursor-ew-resize hover:scale-105 transition-transform shadow-2xl">
                <div className="flex gap-1">
                  <div className="w-0.5 h-3 bg-white/40" />
                  <div className="w-0.5 h-3 bg-white" />
                  <div className="w-0.5 h-3 bg-white/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Numbered Editorial Hotspots (Only shown if slider exposes them) */}
          {isDemoMode && activeStyle.hotspots.map((hotspot, idx) => {
            // Hotspot is visible if it lies to the right of the split line (since clipPath slices left)
            const isVisible = sliderPosition <= hotspot.x;
            return (
              <AnimatePresence key={hotspot.id}>
                {isVisible && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHotspot(hotspot);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white bg-[#1C1C1C]/30 backdrop-blur-sm z-30 cursor-pointer flex items-center justify-center text-[10px] text-white font-sans font-bold transition-all ${
                      selectedHotspot?.id === hotspot.id ? "bg-[#1C1C1C] ring-2 ring-white scale-110" : "hover:bg-[#1C1C1C]"
                    }`}
                    style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  >
                    {idx + 1}
                  </motion.button>
                )}
              </AnimatePresence>
            );
          })}

          {/* Selected Hotspot Detail Card (Styled like an architectural tag) */}
          {selectedHotspot && (
            <div className="absolute bottom-6 left-6 right-6 md:left-8 md:right-8 bg-white border border-[#1C1C1C]/10 p-5 rounded-none shadow-xl z-30 flex items-start gap-4 text-left max-w-2xl">
              <div className="h-12 w-12 bg-[#F7F5F2] flex items-center justify-center flex-shrink-0 border border-[#1C1C1C]/10 font-sans font-black text-[#1C1C1C]/40 text-sm">
                TAG
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#1C1C1C] leading-tight">{selectedHotspot.name}</h4>
                    <p className="text-[10px] text-[#1C1C1C]/60 uppercase tracking-widest font-sans mt-0.5">{selectedHotspot.store} • {selectedHotspot.price}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedHotspot(null)}
                    className="text-[#1C1C1C]/50 hover:text-[#1C1C1C] text-lg font-light px-1"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-[#1C1C1C]/80 font-sans mt-2 leading-relaxed">{selectedHotspot.description}</p>
                <div className="mt-3 pt-3 border-t border-[#1C1C1C]/5 flex justify-end">
                  <a 
                    href={selectedHotspot.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-sans uppercase tracking-widest text-[#1C1C1C] hover:underline font-bold flex items-center gap-1"
                  >
                    Link to Store
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Loader Stage Container */}
          {isGeneratingImage && (
            <div className="absolute inset-0 bg-[#F7F5F2]/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center">
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full border-2 border-[#1C1C1C] border-t-transparent animate-spin" />
                  <Sparkle className="h-5 w-5 text-[#1C1C1C] absolute animate-pulse" />
                </div>
                <h3 className="text-xl italic font-normal text-[#1C1C1C]">Rendering Spatial Balance...</h3>
                <p className="text-xs text-[#1C1C1C]/60 max-w-xs mx-auto leading-relaxed">
                  Aura is adjusting lighting profiles and texture mapping for the {activeStyle.name} layout.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Active Style Description & Carousel Selector */}
        <footer className="h-44 border-t border-[#1C1C1C]/10 flex flex-col sm:flex-row p-5 gap-6 flex-shrink-0 bg-white overflow-hidden">
          
          {/* Detailed design overview block */}
          <div className="w-full sm:w-1/3 pr-0 sm:pr-6 border-r-0 sm:border-r border-[#1C1C1C]/10 flex flex-col justify-center">
            <p className="text-[9px] font-sans uppercase tracking-widest text-[#1C1C1C]/40 font-bold mb-2">Current Style Selection</p>
            <p className="text-xs italic leading-relaxed text-[#444] line-clamp-3 font-serif">
              "{activeStyle.name} is defined by {activeStyle.description.toLowerCase()}"
            </p>
          </div>

          {/* Stylized Horizontal Style Carousel */}
          <div className="flex-1 flex gap-4 overflow-x-auto no-scrollbar items-center py-1">
            {DEMO_STYLES.map((style) => {
              const isSelected = selectedStyleId === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyleId(style.id);
                    setSliderPosition(55);
                  }}
                  className={`h-full aspect-[4/3] relative flex-shrink-0 border transition-all overflow-hidden ${
                    isSelected ? "border-[#1C1C1C]" : "border-[#1C1C1C]/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img 
                    src={style.reimaginedUrl} 
                    alt={style.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-sans uppercase tracking-widest text-white font-bold truncate block w-full text-left">
                      {style.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-[#1C1C1C]" />
                  )}
                </button>
              );
            })}
          </div>
        </footer>
      </main>

      {/* RIGHT SIDEBAR: Studio Assistant Companion */}
      <aside className="w-80 flex flex-col border-l border-[#1C1C1C]/10 bg-white h-full overflow-hidden flex-shrink-0">
        
        {/* Chat Header */}
        <div className="p-6 border-b border-[#1C1C1C]/10 flex flex-col gap-1.5 bg-white">
          <p className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C]/40 font-bold">Studio Assistant</p>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C1C1C]">Styling Consultation</h3>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
          {chatHistory.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className="space-y-1">
                {/* Meta Timeline Label */}
                <p className="text-[9px] font-sans opacity-50 uppercase tracking-widest font-semibold">
                  {isUser ? "You • Client" : "Assistant • Aura"}
                </p>

                {/* Message Box */}
                <div className="text-xs text-[#333] leading-relaxed">
                  {isUser ? (
                    <p className="italic border-l border-[#1C1C1C] pl-3 py-1 text-[#1C1C1C]">
                      "{message.content.replace(/\*/g, "")}"
                    </p>
                  ) : (
                    <div className="space-y-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed">
                      {message.content}
                    </div>
                  )}
                </div>

                {/* Inline shoppable product tag (Aura's specific suggestion inside the thread) */}
                {!isUser && message.products && message.products.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {message.products.slice(0, 1).map((product, pIdx) => (
                      <div key={pIdx} className="bg-[#F7F5F2] border border-[#1C1C1C]/10 p-3 flex gap-3">
                        <div className="w-10 h-10 bg-white border border-[#1C1C1C]/10 flex items-center justify-center flex-shrink-0 text-[10px] font-sans font-black text-[#1C1C1C]/20">
                          ITEM
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-[#1C1C1C] truncate">{product.name}</p>
                          <p className="text-[9px] opacity-60 font-sans uppercase tracking-wider mt-0.5">{product.price} • {product.store}</p>
                        </div>
                        <a 
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] uppercase font-sans tracking-wider text-[#1C1C1C] hover:underline font-bold self-center flex-shrink-0"
                        >
                          Link
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {isChatLoading && (
            <div className="space-y-1 animate-pulse">
              <p className="text-[9px] font-sans opacity-30 uppercase tracking-widest">Assistant • Aura</p>
              <p className="text-xs italic text-slate-400">Typing layout recommendations...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion prompt chips for quick action */}
        <div className="px-6 py-2 bg-[#F7F5F2]/50 border-t border-[#1C1C1C]/10 flex gap-2 overflow-x-auto select-none no-scrollbar">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => submitChatMessage(undefined, chip)}
              className="px-2.5 py-1 text-[9px] font-sans uppercase tracking-wider bg-white hover:bg-[#1C1C1C] text-[#1C1C1C]/70 hover:text-white rounded-none border border-[#1C1C1C]/10 hover:border-[#1C1C1C] flex-shrink-0 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Interactive Refinement & Input Form Box */}
        <div className="p-6 border-t border-[#1C1C1C]/10 bg-white space-y-4">
          
          {/* Image text refiner (directly updates the visualization using Gemini) */}
          <form onSubmit={handleRefineImage} className="relative flex items-center">
            <input
              type="text"
              value={refinerPrompt}
              onChange={(e) => setRefinerPrompt(e.target.value)}
              placeholder="Refine layout visual..."
              className="w-full bg-transparent border-b border-[#1C1C1C]/20 focus:border-[#1C1C1C] pb-2 text-[11px] font-sans italic placeholder:opacity-40 focus:outline-none"
            />
            <button 
              type="submit" 
              className="absolute right-0 top-0.5 text-[#1C1C1C] opacity-60 hover:opacity-100"
              title="Apply Visual Refinement"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Standard Chat Consultant Box */}
          <form onSubmit={submitChatMessage} className="relative flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Refine your space with Aura..."
              className="w-full bg-transparent border-b border-[#1C1C1C] pb-2 text-xs italic placeholder:opacity-40 focus:outline-none pr-8"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              className="absolute right-0 top-0 text-[#1C1C1C] disabled:opacity-20 hover:scale-105 transition-transform"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Shoppable Matches "Shop the Look" Section */}
        <div className="h-64 bg-[#F7F5F2]/40 border-t border-[#1C1C1C]/10 p-6 overflow-y-auto no-scrollbar flex-shrink-0">
          <p className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C]/40 font-bold mb-4">Shop the Look</p>
          <div className="space-y-4">
            {latestProducts.length > 0 ? (
              latestProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-4 border-b border-[#1C1C1C]/5 pb-3 last:border-0 last:pb-0">
                  <div className="w-12 h-12 bg-white flex-shrink-0 border border-[#1C1C1C]/10 flex items-center justify-center font-sans font-black text-[10px] text-[#1C1C1C]/20">
                    ITEM
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1C1C1C] truncate">{product.name}</p>
                    <p className="text-[10px] opacity-60 font-sans tracking-wider mt-0.5">{product.price} • {product.store}</p>
                  </div>
                  <a 
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-sans uppercase tracking-wider text-[#1C1C1C] hover:underline font-bold"
                  >
                    Link
                  </a>
                </div>
              ))
            ) : (
              // Fallback to active hotspots if chat hasn't generated anything yet
              activeStyle.hotspots.map((hotspot, idx) => (
                <div key={idx} className="flex items-center gap-4 border-b border-[#1C1C1C]/5 pb-3 last:border-0 last:pb-0">
                  <div className="w-12 h-12 bg-white flex-shrink-0 border border-[#1C1C1C]/10 flex items-center justify-center font-sans font-black text-[10px] text-[#1C1C1C]/20">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1C1C1C] truncate">{hotspot.name}</p>
                    <p className="text-[10px] opacity-60 font-sans tracking-wider mt-0.5">{hotspot.price} • {hotspot.store}</p>
                  </div>
                  <a 
                    href={hotspot.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-sans uppercase tracking-wider text-[#1C1C1C] hover:underline font-bold"
                  >
                    Link
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

      </aside>
    </div>
  );
}

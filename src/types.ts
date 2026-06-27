export interface Hotspot {
  id: string;
  name: string;
  price: string;
  store: string;
  url: string;
  description: string;
  x: number; // percentage coordinate on image
  y: number; // percentage coordinate on image
}

export interface DemoStyle {
  id: string;
  name: string;
  tagline: string;
  description: string;
  originalUrl: string;
  reimaginedUrl: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hotspots: Hotspot[];
}

export interface Product {
  name: string;
  price: string;
  store: string;
  url: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

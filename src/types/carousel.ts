export type AspectRatio = "1:1" | "4:5" | "9:16";
export type SlideRole = "hook" | "body" | "cta";
// Color scheme of a slide, independent of its layout. Lets a deck mix rich
// brand sections (e.g. a wine-toned quote). Omitted = derived from role.
export type SlideTone = "paper" | "soft" | "dark" | "wine";
export type Channel = "instagram" | "threads";

export interface MediaRef {
  type: "image" | "video";
  src: string;
  fit: "cover" | "contain";
  source: "generated" | "uploaded";
  provider?: string;
  prompt?: string;
}

export interface Slide {
  id: string;
  html: string;
  previousVersions: string[];
  order: number;
  notes: string;
  role: SlideRole;
  headline: string;
  body: string;
  items: string[];
  media: MediaRef | null;
  tone?: SlideTone;
}

export interface ReferenceImage {
  id: string;
  url: string;       // e.g. "/uploads/abc.png"
  absPath: string;    // absolute path for Claude to Read
  name: string;       // original filename or description
  addedAt: string;
}

export interface Carousel {
  id: string;
  projectId: string;
  brandId?: string;
  name: string;
  aspectRatio: AspectRatio;
  channel: Channel;
  slides: Slide[];
  referenceImages: ReferenceImage[];
  caption?: string;
  hashtags?: string[];
  chatSessionId: string | null;
  isTemplate: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function emptyStructuredSlide(order: number): {
  role: SlideRole;
  headline: string;
  body: string;
  items: string[];
  media: MediaRef | null;
  order: number;
} {
  return { role: "body", headline: "", body: "", items: [], media: null, order };
}

export interface CarouselsData {
  carousels: Carousel[];
}

export const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export const MAX_SLIDES = 20;
export const MAX_VERSIONS = 5;

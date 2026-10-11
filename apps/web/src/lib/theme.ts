import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import type { Category, Verdict } from "@breeze/core";

/** CPCB NAQI category → map/chart fill and a readable on-fill text colour */
export const CATEGORY_FILL: Record<Category, { fill: string; on: string }> = {
  Good: { fill: "#1f9d7a", on: "#ffffff" },
  Satisfactory: { fill: "#7cb518", on: "#14260a" },
  Moderate: { fill: "#e8a317", on: "#2a1a00" },
  Poor: { fill: "#ee7b30", on: "#2a1100" },
  "Very Poor": { fill: "#d64545", on: "#ffffff" },
  Severe: { fill: "#8f1d2c", on: "#ffffff" },
};

export const CATEGORY_ORDER: Category[] = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"];

export const CATEGORY_RANGE: Record<Category, string> = {
  Good: "0–30",
  Satisfactory: "31–60",
  Moderate: "61–90",
  Poor: "91–120",
  "Very Poor": "121–250",
  Severe: "250+",
};

export interface VerdictTheme {
  /** r g b triplet used for the ambient page tint */
  tint: string;
  gradient: string;
  /** Primary text on the gradient */
  text: string;
  /** Secondary text on the gradient (kept ≥ 4.5:1) */
  textSoft: string;
  /** Glassy chip background for controls on the gradient */
  chip: string;
  chipActive: string;
  chipActiveText: string;
  icon: typeof CheckCircle2;
}

export const VERDICT_THEMES: Record<Verdict, VerdictTheme> = {
  "Good to go": {
    tint: "31 157 122",
    gradient: "linear-gradient(145deg, #0a5a46 0%, #0f7557 52%, #178a6a 100%)",
    text: "#ffffff",
    textSoft: "rgb(255 255 255 / 0.9)",
    chip: "rgb(255 255 255 / 0.14)",
    chipActive: "#ffffff",
    chipActiveText: "#0a4a3a",
    icon: CheckCircle2,
  },
  "Take care": {
    tint: "232 163 23",
    gradient: "linear-gradient(145deg, #f7c94f 0%, #efb024 52%, #e69f12 100%)",
    text: "#2a1a00",
    textSoft: "rgb(42 26 0 / 0.86)",
    chip: "rgb(42 26 0 / 0.1)",
    chipActive: "#2a1a00",
    chipActiveText: "#fff4d6",
    icon: AlertCircle,
  },
  "Stay indoors if you can": {
    tint: "214 69 69",
    gradient: "linear-gradient(145deg, #8a1f2e 0%, #b0303a 52%, #c93f3f 100%)",
    text: "#ffffff",
    textSoft: "rgb(255 255 255 / 0.92)",
    chip: "rgb(255 255 255 / 0.15)",
    chipActive: "#ffffff",
    chipActiveText: "#7a1624",
    icon: AlertTriangle,
  },
};

export const CATEGORY_ICON: Record<Category, typeof CheckCircle2> = {
  Good: CheckCircle2,
  Satisfactory: CheckCircle2,
  Moderate: AlertCircle,
  Poor: AlertTriangle,
  "Very Poor": ShieldAlert,
  Severe: ShieldAlert,
};

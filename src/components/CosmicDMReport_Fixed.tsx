import { jsPDF } from "jspdf";
import { generateReusableTableContent } from "./ReusableTableContent";
import "../../public/fonts/NotoSans-VariableFont_wdth,wght-normal.js";
import { readAstroJSON } from "@/server/readastrofile";
import removeMarkdown from "remove-markdown";


interface MahaDasha {
  dasha: string;
  dasha_start_year: string;
  dasha_end_year: string;
}

interface MahaDashaData {
  mahadasha: string[];
  mahadasha_order: string[];
}

interface AntardashaData {
  antardashas: string[][];
  antardasha_order: string[][];
}

interface AstroDatas {
  mahadasha_data?: MahaDashaData;
  maha_dasha_predictions?: { dashas: MahaDasha[] };
  antardasha_data?: AntardashaData;
}

type PlanetName =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

// Define specific keys for all dynamic planet-based data
type AstroData = {
  // Dynamic Planet Reports
  [K in PlanetName as `planet_report_${K}`]: Record<string, any>;
} & {
  // Retrogrades for each planet
  [K in PlanetName as `retrogrades_${K}`]: Record<string, any>;
} & {
  // Transit dates for each planet
  [K in PlanetName as `transit_dates_${K}`]: Record<string, any>;
} & {
  // Static global astrology datasets
  planetary_aspects_planets?: Record<string, any>;
  planet_details?: Record<string, any>;
  kp_planets?: Record<string, any>;
  kp_houses?: Record<string, any>;
  shad_bala?: Record<string, any>;
  maha_dasha?: Record<string, any>;
  antar_dasha?: Record<string, any>;

  // Allow any additional data keys safely
  [key: string]: any;
};

function sanitizeText(text: string): string {
  return text
    // Fix common PDF artifacts like t�h�e� => the
    .replace(/([a-zA-Z])[\u0000-\u001F\u200B-\u206F\uFEFF\u00AD\uFFFD�]+([a-zA-Z])/g, "$1$2")

    // Remove & between letters (e.g., s&e&l&f => self)
    .replace(/(?:&[a-zA-Z];?)+/g, match => match.replace(/&|;/g, ""))

    // Remove isolated or spaced ampersands
    .replace(/(\s*&\s*)+/g, "")

    // Remove known HTML entities (&amp;, &#160;, etc.)
    .replace(/&[a-zA-Z#0-9]+;/g, "")

    // Convert smart quotes and dashes to ASCII
    .replace(/[“”«»„]/g, '"') // Double quotes
    .replace(/[‘’‚‛]/g, "'")  // Single quotes
    .replace(/[–—―−]/g, "-")  // En dashes, em dashes
    .replace(/[•∙·⋅]/g, "*")  // Bullet-like symbols
    .replace(/[…]/g, "...")   // Ellipsis
    .replace(/[°º˚]/g, "°")   // Degree symbols (keep readable)
    .replace(/[×✕✖]/g, "x")  // Multiplication signs
    .replace(/[‐-‒⁃]/g, "-")  // Hyphen variants

    // Replace special spacing and invisible chars
    .replace(/[\u200B-\u200F\uFEFF\u034F\u061C\u00AD]/g, "")

    // Normalize to composed form
    .normalize("NFKC")

    // Remove control chars except basic whitespace
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, "")

    // Collapse multiple spaces/newlines
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")

    // Trim excess
    .trim();
}


const PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
];

async function callBedrock(prompt: string, jsonData: any) {
  const res = await fetch("/api/bedrock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, jsonData }),
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("❌ Non-JSON response from /api/bedrock:", text);
    throw new Error("Server did not return valid JSON.");
  }

  if (!res.ok) {
    throw new Error(data.error || "Bedrock API failed.");
  }

  // 🧩 Handle both string and object message formats
  let message =
    typeof data.message === "string"
      ? data.message
      : data.message?.text ||
      data.message?.outputText ||
      JSON.stringify(data.message, null, 2) || // fallback
      "";

  // 🧹 Clean reasoning tags if message is a string
  if (typeof message === "string") {
    message = message.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, "").trim();
  }

  console.log("✅ Cleaned Bedrock message:", message);
  return message;
}

interface UserData {
  name: string;
  sex: string;
  dob: string;
  time: string;
  place: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  language: string;
}

function addParagraphs(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 20
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const bottomLimit = pageHeight - margin;
  let currentY = y;

  const drawPageBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
  };

  const getPageStartY = () => margin + 20;

  // Safe Add New Page
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > bottomLimit) {
      doc.addPage();
      drawPageBorder();
      if (typeof addHeaderFooter === "function") {
        addHeaderFooter(doc, doc.getNumberOfPages());
      }
      currentY = getPageStartY();
    }
  };

  drawPageBorder();

  // 🧹 Clean text for invisible chars
  const sanitizeText = (t: string) =>
    t
      .replace(/&[a-zA-Z]+;/g, "")
      .replace(/&#\d+;/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/<<\/?subheading>>/gi, "") // remove tag markers, keep content
      .replace(/<<<\/?heading>>>/gi, "")
      .replace(/<<<heading>>>/gi, "")
      .trim();

  // Split based on tags
  const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
  const segments = text.split(tagRegex).filter(Boolean);
  let currentTag: string | null = null;

  for (const segment of segments) {
    const trimmed = sanitizeText(segment.trim());
    if (!trimmed) continue;

    // Detect tags
    if (trimmed === "<<<heading>>>") {
      currentTag = "heading";
      continue;
    } else if (trimmed === "<<subheading>>") {
      currentTag = "subheading";
      continue;
    } else if (trimmed === "<content>") {
      currentTag = "content";
      continue;
    } else if (trimmed === "</content>") {
      currentTag = null;
      continue;
    }

    // Render according to tag
    if (currentTag === "heading") {
      ensureSpace(lineHeight * 2);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(20);
      doc.setTextColor("#000");
      currentY += 10;
      doc.text(trimmed, x, currentY);
      currentY += lineHeight * 1.5;
      currentTag = null;
    } else if (currentTag === "subheading") {
      ensureSpace(lineHeight * 1.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(17);
      doc.setTextColor("#a16a21");
      currentY += 6;
      doc.text(trimmed, x, currentY);
      currentY += lineHeight * 1.2;
      currentTag = null;
    } else if (currentTag === "content") {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#5a4632");

      const wrapped = doc.splitTextToSize(trimmed, maxWidth);
      for (const line of wrapped) {
        ensureSpace(lineHeight);
        doc.text(line, x, currentY);
        currentY += lineHeight;
      }
      currentY += 5;
    }
  }

  return currentY;
}

function addParagraphss(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 20
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const bottomLimit = pageHeight - margin;
  let currentY = y;

  const drawPageBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
  };

  const getPageStartY = () => margin + 20;

  // Draw first border
  drawPageBorder();

  // Clean unwanted characters and markdown
  const cleanMarkdown = (txt: string) =>
    txt
      .replace(/[*#_>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Split by paragraphs (2 or more newlines)
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const para of paragraphs) {
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#a16a21");

    // Wrap long text
    const wrappedLines = doc.splitTextToSize(cleanMarkdown(para), maxWidth);

    for (const wrappedLine of wrappedLines) {
      if (currentY + lineHeight > bottomLimit) {
        doc.addPage();
        drawPageBorder();
        if (typeof addHeaderFooter === "function") addHeaderFooter(doc, doc.getNumberOfPages());
        currentY = getPageStartY();
      }

      // Always print as normal text (no bold)
      doc.setFont("NotoSans", "normal");
      doc.setTextColor("#a16a21");

      doc.text(wrappedLine, x, currentY);
      currentY += lineHeight;
    }

    currentY += 10; // space between paragraphs
  }

  return currentY;
}

// --- Utilities for header/footer ---
const addHeaderFooter = (doc: jsPDF, pageNum: number) => {
  // Skip first page (no header/footer)
  if (pageNum === 1) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Save the current font and style
  const prevFont = doc.getFont().fontName;
  const prevStyle = doc.getFont().fontStyle;
  const prevColor = doc.getTextColor();
  const prevSize = doc.getFontSize();

  // Footer style
  doc.setFont("Times", "normal");
  doc.setTextColor("#a16a21");
  doc.setFontSize(12);

  // Footer text
  doc.text(
    "© 2025 TrustAstrology. All rights reserved.",
    pageWidth / 2,
    pageHeight - 30,
    { align: "center" }
  );

  // Restore previous font and style
  doc.setFont(prevFont, prevStyle);
  doc.setFontSize(prevSize);
  doc.setTextColor(prevColor);
};

export function svgToBase64PNG(svgText: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('window not available'));

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context is null');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        // convert to PNG base64 data URL
        const pngBase64 = canvas.toDataURL('image/png'); // string starts "data:image/png;base64,..."

        if (typeof pngBase64 !== 'string' || !pngBase64.startsWith('data:image/png')) {
          throw new Error('Invalid PNG base64 string');
        }
        resolve(pngBase64);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for conversion'));
    };
    img.src = url;
  });
}

const generatePlanetReportsWithImages = async (
  doc: jsPDF,
  AstroData: AstroData,
  userData: UserData
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 25;
  const marginY = 25;
  const contentWidth = pageWidth - 2 * marginX;
  const bottomLimit = pageHeight - marginY;

  const PLANETS = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
  ];

  // === Helper to draw frame & header/footer ===
  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
  };

  const addNewPageIfNeeded = (cursorY: number, estimatedHeight = 40) => {
    if (cursorY + estimatedHeight > bottomLimit - 10) {
      doc.addPage();
      addHeaderFooter(doc, doc.getNumberOfPages());
      drawBorder();
      return marginY + 30;
    }
    return cursorY;
  };

  // === Sequential generation ===
  for (const planetName of PLANETS) {
    const nameKey = planetName.toLowerCase();
    const planetReport = AstroData[`planet_report_${nameKey}`];
    const retroData = AstroData[`retrogrades_${nameKey}`];
    const transitData = AstroData[`transit_dates_${nameKey}`];
    const aspectData = AstroData[`planetary_aspects_planets`];
    const planetdetails = AstroData[`planet_details`];

    if (!planetReport) {
      console.warn(`⚠️ No planet report found for ${planetName}`);
      continue;
    }

    const combinedData = {
      planetReport,
      retroData: retroData || null,
      transitData: transitData || null,
      aspectData: aspectData || null,
      planetdetails,
      kp_planets: AstroData.kp_planets,
      kp_houses: AstroData.kp_houses,
      shad_bala: AstroData.shad_bala,
      maha_dasha: AstroData.maha_dasha,
      antar_dasha: AstroData.antar_dasha,
    };

    // === New prompt with XML-style tags ===
    const prompt = `
You are an expert Vedic astrologer and cosmic storyteller.
Using the provided astro data, write a deeply insightful, 800–1000 word report on ${planetName} in the native's birth chart.

The report must strictly follow this XML-like structure (no markdown, no asterisks, no bullet points):

──────────────────────────────
<<<heading>>> Planet Placement: Which House Each Planet is In
<content> Write 2–3 paragraphs explaining where ${planetName} is placed in the birth chart, the house and sign it occupies, and its core influence on personality and life direction. Blend psychological and spiritual tones.</content>

<<<heading>>> Planetary Aspects (Drishti)
<content> Discuss the aspects formed by ${planetName} with other planets. Explain how these interactions modify its results in key life areas like career, relationships, and health.</content>

<<<heading>>> Planetary Strength & Nature (Shadbala & Report)
<content> Analyze the planet's strength and dignity using Shadbala and overall placement. Describe whether it acts as a benefic or malefic and how it supports or challenges personal growth.</content>

<<<heading>>> KP Planetary Analysis
<content> Offer interpretation based on KP astrology — the planet’s sub-lord connections, house significations, and how it affects timing of events.</content>

<<<heading>>> Retrogrades & Transits (2025 Outlook)
<content> Explain how retrograde motion or upcoming transits in 2025 may influence the native’s experiences related to ${planetName}. Include predictions on timing, mindset, and opportunities.</content>

<<<heading>>> Summary & Remedies
<content> Conclude with an integrative summary of the planet’s lessons and karmic purpose. Recommend spiritual remedies, gemstones, or mindset practices that enhance harmony with ${planetName}.</content>
──────────────────────────────

Style & Tone:
- Be eloquent, smooth, and encouraging.
- Blend Vedic astrology, psychology, and spirituality naturally.
- Do not use markdown (**bold**, lists, asterisks, etc.).
- Write in ${userData.language || "English"}.
`;

    // === Model call ===
    let text;
    try {
      text = await callBedrock(prompt, combinedData);
      text = sanitizeText(text);
    } catch (err) {
      console.error(`Error generating ${planetName} report:`, err);
      text = `Report for ${planetName} could not be generated.`;
    }

    // === PDF Rendering ===
    doc.addPage();
    addHeaderFooter(doc, doc.getNumberOfPages());
    drawBorder();

    // Title
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`${planetName} Report`, pageWidth / 2, 70, { align: "center" });

    // Planet image
    const imagePath = `/assets/planets/${nameKey}.jpg`;
    const imageY = 100;
    const imageWidth = 230;
    let imageHeight = 0;

    try {
      const img = new Image();
      img.src = imagePath;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const aspectRatio = img.height / img.width;
          imageHeight = imageWidth * aspectRatio;
          const imageX = (pageWidth - imageWidth) / 2;
          doc.addImage(img, "JPG", imageX, imageY, imageWidth, imageHeight);
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      console.warn(`⚠️ No image found for ${planetName}`);
    }

    let cursorY = imageY + imageHeight + 40;
    const lineHeight = 20;
    const usableWidth = contentWidth - 30;

    // === Parse custom tags and render ===
    const tagRegex =
      /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;

    const segments = text.split(tagRegex).filter(Boolean);

    let currentTag: string | null = null;

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      // Detect opening tags
      if (trimmed === "<<<heading>>>") {
        currentTag = "heading";
        continue;
      } else if (trimmed === "<<subheading>>") {
        currentTag = "subheading";
        continue;
      } else if (trimmed === "<content>") {
        currentTag = "content";
        continue;
      } else if (trimmed === "</content>") {
        currentTag = null;
        continue;
      }

      // Apply font based on current tag
      if (currentTag === "heading") {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(20);
        doc.setTextColor("#000");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);
        doc.text(trimmed, marginX + 10, cursorY);
        cursorY += lineHeight * 1.5;
        currentTag = null;
      } else if (currentTag === "subheading") {
        doc.setFont("NotoSans", "semibold");
        doc.setFontSize(17);
        doc.setTextColor("#a16a21");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);
        doc.text(trimmed, marginX + 12, cursorY);
        cursorY += lineHeight * 1.2;
        currentTag = null;
      } else if (currentTag === "content") {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");

        const wrappedText = doc.splitTextToSize(trimmed, usableWidth);
        for (const line of wrappedText) {
          cursorY = addNewPageIfNeeded(cursorY);
          doc.text(line, marginX + 15, cursorY);
          cursorY += lineHeight;
        }
        cursorY += lineHeight / 2;
      }
    }
  }
};

async function loadSVGTextAsImage(svgText: string, width = 500, height = 500): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image: " + String(e)));
    };
    img.src = url;
  });
}

async function svgTextToPngBase64(svgText: string, width: number, height: number): Promise<string> {
  const img = await loadSVGTextAsImage(svgText, width, height);

  // Use higher-resolution canvas to prevent text blur
  const scale = 3; // 3x scale for sharper text
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}

/**
 * Generate a pure SVG Kundli (D1) styled like the golden chart-card layout, with house numbers.
 * @param {Record<string, any>} chartObj - mapping numeric keys -> planet entries (like your JSON)
 * @param {number} size - size of SVG square (default 500)
 * @returns {string} SVG string
 */
function generateKundliSVG(chartObj: Record<string, any>, size = 500): string {
  const houses: string[][] = Array.from({ length: 12 }, () => []);

  Object.keys(chartObj).forEach((k) => {
    if (!/^\d+$/.test(k)) return;
    const p = chartObj[k];
    const name = p.name || p.full_name || "";
    const display = p.retro ? `${name}(R)` : name;
    const houseIndex = typeof p.house === "number" ? p.house - 1 : Number(p.house) - 1;
    if (houseIndex >= 0 && houseIndex < 12) houses[houseIndex].push(display);
  });

  // Planet text coordinates (approximate for North Indian diamond)
  const coords = [
    { x: 250, y: 125 }, { x: 125, y: 35 }, { x: 35, y: 125 },
    { x: 125, y: 250 }, { x: 35, y: 375 }, { x: 125, y: 460 },
    { x: 250, y: 375 }, { x: 375, y: 460 }, { x: 465, y: 375 },
    { x: 375, y: 250 }, { x: 465, y: 125 }, { x: 375, y: 35 }
  ];

  // House number coordinates (placed near edges)
  const houseNums = [
    { x: 250, y: 70 }, { x: 180, y: 50 }, { x: 70, y: 100 },
    { x: 80, y: 250 }, { x: 70, y: 400 }, { x: 180, y: 445 },
    { x: 250, y: 430 }, { x: 320, y: 445 }, { x: 430, y: 400 },
    { x: 420, y: 250 }, { x: 430, y: 100 }, { x: 320, y: 50 }
  ];

  const stroke = "rgba(150,95,48,1)";
  const strokeWidth = 5;

  // Planet names inside each house
  const houseTexts = houses.map((items, i) => {
    const lines = items.length ? items : [""];
    const tspans = lines.map(
      (t, idx) =>
        `<tspan x="${coords[i].x}" dy="${idx === 0 ? "0" : "1.2em"}">${escapeXml(t)}</tspan>`
    ).join("");
    return `<text x="${coords[i].x}" y="${coords[i].y}" font-family="'Lucida Sans','Lucida Grande',sans-serif" font-weight="800" font-size="16" fill="rgb(68,68,68)" text-anchor="middle">${tspans}</text>`;
  }).join("");

  // House number labels
  const houseNumberTexts = houseNums
    .map(
      (pos, i) =>
        `<text x="${pos.x}" y="${pos.y}" font-family="'Poppins','Arial',sans-serif" font-size="16" font-weight="700" fill="${stroke}" text-anchor="middle">${i + 1}</text>`
    )
    .join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <!-- Background Gradient & Shadow -->
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#fff9ee"/>
        <stop offset="60%" stop-color="#f3e0b5"/>
        <stop offset="100%" stop-color="#e6cda0"/>
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="rgba(0,0,0,0.25)" />
      </filter>
    </defs>

    <!-- Chart Background -->
    <rect width="100%" height="100%" rx="20" ry="20" fill="url(#bg)" filter="url(#shadow)" />

    <!-- Chart Lines -->
    <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="3" y1="0" x2="3" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="${size - 3}" x2="${size}" y2="${size - 3}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size - 3}" y1="${size}" x2="${size - 3}" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="3" x2="${size}" y2="3" stroke="${stroke}" stroke-width="${strokeWidth}" />

    <!-- Diamond Inner Lines -->
    <line x1="${size / 2}" y1="0" x2="0" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="0" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="${size}" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="${size}" x2="0" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />

    <!-- House Numbers -->
    ${houseNumberTexts}

    <!-- Planet Names -->
    ${houseTexts}
  </svg>`.trim();

  return svg;
}

// Escape unsafe XML
function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


interface DivisionalChart {
  chart_name: string;
  chart_num: number;
  chart_data: Record<string, any>;
}

async function addAllDivisionalChartsFromAstroData(
  doc: jsPDF,
  chartList: { chart_name: string; data: Record<string, any> }[], // ✅ accept full chart data
  astroData: Record<string, any>
) {
  const chartsPerPage = 2;
  const imgWidth = 340;
  const imgHeight = 300;
  const spacingY = 50;
  const marginTop = 100;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textColor = "#a16a21";

  // Prepare chart objects (now from chartList.data)
  const divisionalCharts: DivisionalChart[] = chartList
    .map((item) => {
      const chartData = item.data;
      if (!chartData) return null;

      const chartNum = parseInt(item.chart_name.replace(/[^0-9]/g, ""), 10) || 0;
      return {
        chart_name: item.chart_name.toUpperCase(),
        chart_num: chartNum,
        chart_data: chartData,
      };
    })
    .filter((x): x is DivisionalChart => x !== null);

  // Sort numerically (D1, D2, D9, etc.)
  divisionalCharts.sort((a, b) => a.chart_num - b.chart_num);

  // Render each chart
  for (let i = 0; i < divisionalCharts.length; i++) {
    const chartData = divisionalCharts[i];
    if (!chartData) continue;

    if (i % chartsPerPage === 0) {
      if (i > 0) doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#a16a21");
      doc.text("DIVISIONAL CHARTS", pageWidth / 2, 60, { align: "center" });
    }

    const posInPage = i % chartsPerPage;
    const currentY = marginTop + posInPage * (imgHeight + spacingY);
    const xPos = (pageWidth - imgWidth) / 2;

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(16);
    doc.setTextColor(textColor);
    doc.text(`DIVISIONAL CHART - ${chartData.chart_name}`, pageWidth / 2, currentY - 10, { align: "center" });

    try {
      const svgText = generateKundliSVG(chartData.chart_data, 500);
      const base64 = await svgTextToPngBase64(svgText, imgWidth, imgHeight);
      await new Promise((r) => setTimeout(r, 50));
      doc.addImage(base64, "PNG", xPos, currentY, imgWidth, imgHeight);
    } catch (err) {
      console.error(`Error rendering chart ${chartData.chart_name}`, err);
      doc.text("Chart could not be loaded", pageWidth / 2, currentY + imgHeight / 2, { align: "center" });
    }

    await new Promise((r) => setTimeout(r, 20));
  }

  // Add header/footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addHeaderFooter(doc, p);
  }
}

const generateHouseReports = async (doc: jsPDF, AstroData: any, userData: UserData) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 25;
  const marginY = 25;
  const contentWidth = pageWidth - 2 * marginX;
  const bottomLimit = pageHeight - marginY;

  const kpHouses = AstroData?.kp_houses || [];

  const simplifiedHouses = kpHouses.map((house: any) => ({
    house: house.house,
    sign: house.sign,
    lord: house.lord,
    sub_lord: house.sub_lord,
    nakshatra: house.nakshatra,
    nakshatra_lord: house.nakshatra_lord,
    planets_in_house: house.planets_in_house,
    cusp_longitude: house.cusp_longitude,
    cusp_sign: house.cusp_sign,
    cusp_nakshatra: house.cusp_nakshatra,
    cusp_sub_lord: house.cusp_sub_lord,
    ashtakvarga_points: house.ashtakvarga_points,
    significators: house.significators,
  }));

  // 🧠 Custom prompt using <<<heading>>>, <<subheading>>, and <content>
  const prompts = simplifiedHouses.map((house: any) => ({
    house,
    prompt: `
You are an expert Vedic and KP astrologer.
Generate a detailed, narrative-style report for House ${house.house} using the provided KP-style data.

The report must strictly follow this XML-like tag structure (no markdown, no asterisks, no bullet points):

──────────────────────────────
<<<heading>>> Overview of House ${house.house}
<content>Describe the general meaning of the ${house.house}th house in astrology and its psychological and karmic implications for the native. Write 2–3 paragraphs with an encouraging and introspective tone.</content>

<<<heading>>> House Lords & Significance
<content>Explain the sign, lord, sub-lord, and nakshatra lord of this house. Describe how they shape this house’s expression and influence daily life and inner patterns.</content>

<<<heading>>> House Strength using Ashtakvarga
<content>Analyze Ashtakvarga points and their meaning for this house’s strength, growth areas, and potential challenges. Interpret the score in the context of life themes.</content>

<<<heading>>> Effects of Planets in Houses
<content>Discuss the planets placed in this house. Explain their impact on emotions, relationships, finances, or other areas based on traditional and KP interpretations.</content>

<<<heading>>> KP Houses & Cuspal Analysis
<content>Analyze the cusp, its sign, sub-lord, and significators. Write how this affects timing of events and the practical manifestation of this house in real life.</content>

<<<heading>>> Summary & Remedies
<content>End with an uplifting summary of how this house supports the native’s growth. Suggest relevant remedies or mindset practices for balance and harmony.</content>
──────────────────────────────

Style & Tone:
- Use only plain text, no markdown.
- Be smooth, spiritual, and psychologically rich.
- Write in ${userData.language || "English"}.
`,
  }));

  // === Generate all reports ===
  const reports = await Promise.all(
    prompts.map(async ({ house, prompt }: { house: any; prompt: string }) => {
      try {
        const text = await callBedrock(prompt, { house });
        return { house, text: sanitizeText(text) };
      } catch (err) {
        console.error(`Error generating House ${house.house}:`, err);
        return { house, text: `Report for House ${house.house} could not be generated.` };
      }
    })
  );

  // === Helper to draw frame & header/footer ===
  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
  };

  const addNewPageIfNeeded = (cursorY: number, estimatedHeight = 40) => {
    if (cursorY + estimatedHeight > bottomLimit - 10) {
      doc.addPage();
      addHeaderFooter(doc, doc.getNumberOfPages());
      drawBorder();
      return marginY + 30;
    }
    return cursorY;
  };

  // === Loop through houses ===
  for (const { house, text } of reports) {
    doc.addPage();
    addHeaderFooter(doc, doc.getNumberOfPages());
    drawBorder();

    // === Title ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`House ${house.house} Report`, pageWidth / 2, 70, { align: "center" });

    // === Image ===
    const imagePath = `/assets/houses/${house.house}.jpg`;
    const imageY = 100;
    const imageWidth = 230;
    let imageHeight = 0;

    try {
      const img = new Image();
      img.src = imagePath;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const aspectRatio = img.height / img.width;
          imageHeight = imageWidth * aspectRatio;
          const imageX = (pageWidth - imageWidth) / 2;
          doc.addImage(img, "JPG", imageX, imageY, imageWidth, imageHeight);
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      console.warn(`⚠️ No image found for House ${house.house}`);
    }

    let cursorY = imageY + imageHeight + 40;
    const lineHeight = 20;
    const usableWidth = contentWidth - 30;

    // === Tag-based text parsing ===
    const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
    const segments = text.split(tagRegex).filter(Boolean);

    let currentTag: string | null = null;

    for (const segment of segments) {
      const trimmed = sanitizeText(segment.trim());
      if (!trimmed) continue;

      // Identify tags
      if (trimmed === "<<<heading>>>") {
        currentTag = "heading";
        continue;
      } else if (trimmed === "<<subheading>>") {
        currentTag = "subheading";
        continue;
      } else if (trimmed === "<content>") {
        currentTag = "content";
        continue;
      } else if (trimmed === "</content>") {
        currentTag = null;
        continue;
      }

      // === Apply styles ===
      if (currentTag === "heading") {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(20);
        doc.setTextColor("#000");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);
        doc.text(trimmed, marginX + 10, cursorY);
        cursorY += lineHeight * 1.5;
        currentTag = null;
      } else if (currentTag === "subheading") {
        doc.setFont("NotoSans", "semibold");
        doc.setFontSize(17);
        doc.setTextColor("#a16a21");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);
        doc.text(trimmed, marginX + 12, cursorY);
        cursorY += lineHeight * 1.2;
        currentTag = null;
      } else if (currentTag === "content") {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");

        const wrappedText = doc.splitTextToSize(trimmed, usableWidth);
        for (const line of wrappedText) {
          cursorY = addNewPageIfNeeded(cursorY);
          doc.text(line, marginX + 15, cursorY);
          cursorY += lineHeight;
        }
        cursorY += lineHeight / 2;
      }
    }
  }
};

// --- Enhanced function with table content integration ---
export async function generateAndDownloadFullCosmicReportWithTable(
  name: string,
  dob: string,
  time: string,
  place: string,
  userData: UserData
) {
  try {
    const astroData = await readAstroJSON("astro_data_Vivek.json");

    // 3️⃣ Create PDF
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 26; // slightly increased spacing for bigger text

    // --- COVER PAGE SECTION ---
    const coverImageMale = "/assets/cover_male.jpg";
    const coverImageFemale = "/assets/cover_female.jpg";

    // Determine which image to use based on gender
    let selectedCoverImage = coverImageMale;
    if (userData?.sex?.toLowerCase() === "female") {
      selectedCoverImage = coverImageFemale;
    }

    // Try loading the image
    try {
      const img = new Image();
      img.src = selectedCoverImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Add cover image full-page
      doc.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.warn("Cover image failed to load:", error);
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }

    // --- TEXT ON RIGHT SIDE ---
    const marginRight = 50;
    const marginBottom = 40;
    const reportDate = new Date().toLocaleDateString(userData.language || "en-US", { year: "numeric", month: "long" });

    // Translation map for static text (you can expand for more languages)
    const translations = {
      en: { dob: "DOB", location: "Location not available" },
      hi: { dob: "जन्मतिथि", location: "स्थान उपलब्ध नहीं" },
      fr: { dob: "Date de naissance", location: "Lieu non disponible" },
      be: { dob: "Нарадзіўся", location: "Месца недаступна" },
      ka: { dob: "ಜನ್ಮದಿನ", location: "ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ" },
      ml: { dob: "ജനനത്തിയതി", location: "സ്ഥലം ലഭ്യമല്ല" }
    } as const; // <- makes keys readonly literals

    type Lang = keyof typeof translations; // "en" | "hi" | "fr" | "be" | "ka" | "ml"

    const lang: Lang = (userData?.language as Lang) || "en"; // cast to Lang
    const t = translations[lang]; // no more TS error

    // Define text lines in user’s language
    const textLines = [
      `${name || "Unknown"}`,
      `${dob ? t.dob + ": " + dob : "N/A"} ${time || ""}`,
      `${place || t.location}`,
      `${reportDate}`
    ];

    //doc.addFont("NotoSans-VariableFont_wdth,wght.ttf", "NotoSans", "normal");
    doc.setTextColor(255, 255, 255);

    const yPos = pageHeight - marginBottom - (textLines.length - 1) * lineHeight;

    textLines.forEach((line, i) => {
      if (i === 0) {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(18);
      } else if (i === textLines.length - 1) {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(18);
      } else {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(18);
      }

      doc.text(line, pageWidth - marginRight, yPos + i * lineHeight, {
        align: "right",
      });
    });
    doc.addPage();
    // --- Generate Disclaimer Page using AI ---
    const generateIntroSections = async (doc: jsPDF) => {
      const pageWidth = doc.internal.pageSize.getWidth();

      const addPageWithTitle = (title: string, useNewPage = true) => {
        if (useNewPage) doc.addPage();
        const margin = 25;
        const rectHeight = doc.internal.pageSize.getHeight() - 2 * margin;

        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(margin, margin, pageWidth - 2 * margin, rectHeight, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.setTextColor("#000");
        doc.text(title, pageWidth / 2, 60, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.setTextColor("#a16a21");

        return 100;
      };



      // 🧾 STATIC TEXT CONTENTS (replace with your own text)
      const disclaimerText = `
Disclaimer for Comprehensive Vedic Astrology Report
This comprehensive astrology report is prepared based on the principles of
Vedic Astrology, also known as Jyotisha, an ancient Indian system of
understanding the influences of celestial bodies on human life. It is important
to understand that this report is intended for informational and guidance
purposes only.
Astrology is not an exact science and should not be interpreted as providing
definitive or deterministic predictions about the future. Instead, this report
offers potential insights into your inherent tendencies, strengths, challenges,
and potential life path based on your unique birth chart.
Please be aware that astrological interpretations can vary significantly
between different astrologers and across various astrological traditions. The
interpretations presented in this report reflect the understanding and expertise
of the astrologer who prepared it and may not align perfectly with other
interpretations you may encounter.
Any remedies, suggestions, or recommendations provided within this report
are offered as potential supportive measures and should not be considered a
substitute for professional advice from qualified medical, legal, financial, or
psychological professionals. Always consult with appropriate experts for any
health concerns, legal matters, financial decisions, or mental health issues.
The results and outcomes described in this report are not guaranteed and may
vary significantly from person to person. Individual experiences are
influenced by a multitude of factors, including personal choices,
environmental influences, and free will, all of which interact with the
astrological influences in complex ways.
Astrologer shall not be liable for any direct, indirect,
incidental, consequential, or punitive damages arising out of the use of or
reliance on this astrology report. You acknowledge and agree that you are
solely responsible for your own decisions and actions.
While we endeavor to provide accurate and insightful interpretations,
remember that the cosmos operates on a grand and mysterious scale. Use this
report as a tool for self-discovery and personal growth, and embrace the
journey with an open mind and a hopeful heart. May the wisdom of the stars
illuminate your path.
  `;

      const authorText = `
Subject: Welcome to Your Personalized Cosmic Journey!
Dearest Friend,
Welcome! I'm absolutely thrilled to present you with your personalized Vedic
Astrology report. I truly believe this is more than just a document; it's a map
to a deeper understanding of yourself and your place in the grand cosmic
design.
For many years, I've been captivated by the ancient wisdom of Vedic
Astrology. It started as a personal quest for self-discovery and quickly
blossomed into a lifelong passion. I've spent countless hours studying the
intricate interplay of planets, signs, and houses, always amazed by the
profound insights they offer. It's been an honour to guide others on their
journeys using this beautiful science.
This report is a culmination of my experience, carefully blending ancient
Vedic principles with practical, modern-day interpretations. You'll find it
delves into the core aspects of your birth chart, revealing your strengths,
challenges, and potential. It's designed not just to predict, but to empower
you to make conscious choices and navigate life's path with greater clarity
and confidence.
While this report offers valuable guidance, remember that astrology is a tool,
not a definitive answer. Your intuition and personal connection to the
information are paramount. Trust your inner wisdom as you explore these
insights, and allow them to resonate with your own experiences.
The ultimate goal of this report is to foster self-awareness and personal
growth. By understanding the cosmic influences at play in your life, you can
unlock your hidden potential, overcome obstacles, and create a life that is
truly aligned with your soul's purpose.
I encourage you to approach this report with an open mind and a curious
heart. Allow the information to inspire reflection and self-discovery. This is
your journey, and I hope this report serves as a valuable companion along the
way.
Wishing you clarity, growth, and abundant blessings on your path.
Warmly,
Your Astrologer,
TrustAstrology
  `;

      const studyText = `
Unlocking Your Cosmic Blueprint: A Guide to Your Vedic Astrology Report
Welcome to a journey of self-discovery through the wisdom of Vedic
astrology! Your personalized report is more than just a document; it's a map
to understanding your inherent strengths, potential challenges, and life's
purpose. To truly unlock its value, approach it with intention and patience.
First Impressions Matter, But Subsequent Readings Reveal More: Don't
expect to grasp everything in one sitting. Read your report multiple times,
each time with a fresh perspective. The first read provides a general
overview, while subsequent readings will unveil deeper nuances and
connections.
Layers of Insight: Think of your report as an onion – each layer reveals a
new dimension of understanding. Start with the broad interpretations of
planets and houses, then delve into the more specific aspects and planetary
periods (Dashas). The true power lies in understanding how these layers
interact to shape your unique destiny.
Cultivate Calm & Focus: Before diving in, create a quiet and peaceful
environment. Take a few deep breaths, clear your mind, and approach the
report with an open heart. This will allow you to absorb the information
more effectively.
Note-Taking and Reflection: Actively engage with the report. Take notes on
key insights, recurring themes, and areas that resonate with you. Reflect on
how these insights relate to your past experiences and current circumstances.
Practical Application is Key: Don't just read the report – apply its guidance!
If the report highlights a strength in communication, look for opportunities to
use your skills. If it identifies a potential challenge in relationships, be
mindful of your interactions and work on cultivating healthier connections.
A Living Document: Your Vedic astrology report isn't a one-time read.
Revisit it periodically, especially during significant life transitions. As you
evolve, your understanding of the report will also deepen.
Empowerment Through Awareness: Ultimately, your Vedic astrology report
is a tool for self-empowerment. It provides insights to inform your decisions,
not dictate them. Use this knowledge to make conscious choices that align
with your true self and lead you toward a fulfilling life. Embrace your
cosmic blueprint and embark on your journey with confidence!
  `;

      // 🧠 Add sections to PDF
      addPageWithTitle("DISCLAIMER", false);
      addParagraphss(doc, disclaimerText, 50, 100, pageWidth - 100);

      addPageWithTitle("MESSAGE FROM THE AUTHOR", true);
      addParagraphss(doc, authorText, 50, 100, pageWidth - 100);

      addPageWithTitle("BEST WAY TO STUDY THE REPORT", true);
      addParagraphss(doc, studyText, 50, 100, pageWidth - 100);
    };

    await generateIntroSections(doc);
    // --- Generate Table of Contents using AI ---
    let tocText = `
01. Immediate Personal Insights
 1.1 Basic Birth & Ascendant Details (Moon Sign, Sun Sign, Ascendant)
 1.2 Lucky Number & Color (Nakshatra Based)
 1.3 Snapshot of Chart (Planetary Overview)
 1.4 Numerology Analysis
 1.5 Personality Traits & Characteristics

02. Houses (Bhavas)
 2.1 Overview of 12 Houses
 2.2 House Lords & Significance
 2.3 House Strength using Ashtakvarga
 2.4 Effects of Planets in Houses
 2.5 KP Houses & Cuspal Analysis

03. Planets
 3.1 Planet Placement: Which House Each Planet is In
 3.2 Planetary Aspects (Drishti)
 3.3 Planetary Strength & Nature (Shadbala & Report)
 3.4 KP Planetary Analysis
 3.5 Retrogrades & Transits 

04. Love & Marriage
 4.1 Nakshatras & Moon Signs: Emotional Needs & Compatibility
 4.2 Moon Sign (Rashi): Temperament & Emotional Expression
 4.3 Nakshatra (Lunar Mansion): Psychological Traits & Bonding
 4.4 Planetary Positions & Relationship Patterns
 4.5 Venus: Love, Romance & Attraction
 4.6 Mars: Passion, Assertiveness & Sexual Compatibility
 4.7 Jupiter: Marriage Timing & Spouse Characteristics
 4.8 Saturn: Delays, Karmic Lessons & Longevity of Bond
 4.9 7th House: Marriage, Partnership & Spouse Indications
 4.10 Planetary Aspects on 7th House
 4.11 Divisional Charts (D9 - Navamsa, D2 - Hora)
 4.12 Yogas & Doshas: Mangal, Chandra-Mangal, Venus-Mars
 4.13 Dashas Influencing Relationships (Mahadasha, Antardasha)

05. Career & Profession
 5.1 Houses Related to Career: 1st, 2nd, 6th, 10th
 5.2 Planetary Traits & Amatyakaraka Insights
 5.3 Nakshatra / Moon Sign Influence: Work Style & Profession
 5.4 Dashas & Yogas: Career Growth & Success Timing
 5.5 Divisional Chart (D10 - Dasamsa) Insights

06. Health & Wellbeing
 6.1 Doshas in Vedic Astrology: Manglik, Pitra, Kaalsarp, Papasamaya
 6.2 Planetary Influence on Health: Sun, Moon, Mars, Saturn, Rahu/Ketu
 6.3 Houses Related to Health: 1st, 6th, 8th, 12th
 6.4 Nakshatra & Moon Sign: Emotional and Mental Balance
 6.5 Ayurvedic Correlation: Vata, Pitta, Kapha Imbalances
 6.6 Remedies for Health-Related Doshas

07. Karmic & Purpose Insights
 7.1 Chara Karakas: Soul Purpose & Life Goals
 7.2 Sade Sati Journey: Phases, Challenges & Remedies
 7.3 Karmic Yogas & Mangalik Combinations
 7.4 Astrological Doshas: Karmic Blocks & Lessons
 7.5 Retrograde Planets: Past-Life Influences

08. Timing & Predictive Insights
 8.1 Mahadasha Overview: Major Life Phases
 8.2 Antardasha Details: Sub-Periods & Impact
 8.3 Paryantar & Yogini Dashas: Micro Life Events
 8.4 Transit Dates of Planets (Predictions)
 8.5 AI-Based 12-Month Prediction (Favorable vs Challenging Periods)

09. Remedies & Spiritual Guidance
 9.1 Rudraksha Guidance & Recommendations
 9.2 Gemstone Remedies & Gem Details
 9.3 Mantra Chanting & Yantra Suggestions
 9.4 Charitable Actions & Spiritual Practices
 9.5 Sade Sati & Dosha Remedies

10. Advanced Calculations & Optional Insights
 10.1 Ashtakvarga: Strength & Fortune Analysis
 10.2 Shadbala: Sixfold Planetary Strength
 10.3 Divisional Charts Summary (D1–D12 Overview)
 10.4 Pratyantar Dasha: Sub-Periods for Predictive Analysis
 10.5 Planetary Wars (Grah Yuddha) & Retrograde Impacts

11. Panchang & Astronomical Insights
 11.1 Sunrise & Sunset Timings (Birth Day Reference)
 11.2 Moonrise & Moonset Timings
 11.3 Choghadiya Muhurta: Daily Auspicious Hours
 11.4 Hora Muhurta: Planetary Hour Influences

12. Q&A & Personalized Advice
 12.1 Frequently Asked Questions
 12.2 Next Steps: Using Insights & Remedies for Personal Growth
 12.3 Personalized Astro Guidance & Conclusion
`;

    // --- PDF Rendering ---
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("Table of Contents", pageWidth / 2, 60, { align: "center" });

    // --- Variables for layout ---
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(14);
    const lines = tocText.trim().split("\n");
    let z = 100;
    const lineHeights = 18;
    const marginTop = 50;
    const marginBottoms = 50;
    const pageHeights = doc.internal.pageSize.getHeight();

    // --- Helper to add new bordered page ---
    function addNewPage() {
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      z = marginTop + 50; // Reset y for new page
    }

    // --- Draw each line ---
    lines.forEach(line => {
      if (line.trim() === "") {
        z += 10;
        return;
      }

      // Check if next line will overflow page height
      if (z + lineHeights > pageHeights - marginBottoms) {
        addNewPage();
      }

      const isSubtopic = /^\s*\d+\.\d+/.test(line);
      const x = isSubtopic ? 80 : 50;

      if (!isSubtopic) {
        doc.setFont("NotoSans", "bold");
        doc.setTextColor("#a16a21");
      } else {
        doc.setFont("NotoSans", "normal");
        doc.setTextColor("#000");
      }

      doc.text(line.trim(), x, z);
      z += lineHeights;
    });

    // --- Add Table Content Page with Real API Data ---

    await generateReusableTableContent({
      doc,
      astroData,
      userData: userData,
      title: "AVAKAHADA CHAKRA",
      showUserInfo: true
    });

    const minimalAstroData = {
      nakshatra: astroData?.nakshatra,
      planet_details: astroData?.planet_details,
      gem_suggestion: astroData?.gem_suggestion,
    };

    const fullPrompt = `
You are an expert Vedic astrologer and writer.
Generate the "Lucky Number & Color (Nakshatra Based)" section for an astrology report.

TASK:
Write 2–4 flowing paragraphs (no bullet points, no tables) describing:
1. How the Nakshatra influences auspicious colors and lucky numbers.
2. The meaning and symbolism of these choices.
3. Gemstone guidance based on planetary harmony.
4. Spiritual or lifestyle advice aligned with their Nakshatra.

Tone: spiritual, elegant, poetic but informative.
`;

    let response = await callBedrock(fullPrompt, { minimalAstroData });
    console.log("RAW BEDROCK:", response);

    let text =
      typeof response === "string"
        ? response
        : response?.outputText ||
        response?.text ||
        response?.completion?.text ||
        JSON.stringify(response, null, 2);

    if (!text || text.trim() === "") {
      text = "⚠️ No content generated by Bedrock!";
    }

    text = sanitizeText(String(text));
    text = removeMarkdown(String(text));

    console.log("After cleaning:", text);

    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.text("Lucky Number & Color (Nakshatra Based)", pageWidth / 2, 60, { align: "center" });

    addParagraphss(doc, text, 50, 100, pageWidth - 100);
    doc.addPage();

    // Generate SVG
    const allCharts = [
      "D1", "D2", "D3", "D4", "D5", "D7", "D8",
      "D9", "D10", "D12", "D16", "D20", "D24",
      "D27", "D30", "D40", "D45", "D60", "chalit", "sun", "moon",
      "kp_chalit", "transit"
    ];
    interface ChartData {
      chart_name: string;
      data: Record<string, any>;
    }
    // Filter only charts present in astroData
    const availableCharts: ChartData[] = allCharts
      .map(chartName => {
        const chartKey = `divisional_chart_${chartName}`;
        const chartData = astroData[chartKey];

        if (chartData) {
          return {
            chart_name: chartName,
            data: chartData,
          };
        }
        return null;
      })
      // ✅ Proper type guard to remove nulls safely
      .filter((c): c is ChartData => c !== null);

    await addAllDivisionalChartsFromAstroData(doc, availableCharts, astroData);

    const numerologySections = [
      "4.1 Mulank (Birth Number): Explain the influence of the Birth Number (radical_number) and its ruling planet (radical_ruler), personality traits, thinking patterns, emotional tendencies, favorable colors, metals, gemstones, friendly numbers, favorite deity, and mantra. End with how this number defines the person’s core identity and how to strengthen it.",
      "4.2 Bhagyank (Life Path Number): Describe the meaning of the Life Path (destiny) number — the person’s purpose, karmic journey, strengths, and challenges. Mention its harmony or contrast with the Birth Number and conclude with a practical insight for alignment.",
      "4.3 Success Number (Name Number): Explain how the name number influences career success, fame, and personal magnetism. Discuss compatibility using friendly, evil, and neutral numbers. Conclude with insights on how name vibrations affect destiny.",
      "4.4 Connection Number: Analyze the relationship between Birth, Destiny, and Name Numbers. Include the Personal Day Number interpretation and offer guidance for balancing energies using gemstones, colors, or affirmations. End with a motivational summary of their overall vibration."
    ];

    async function fetchNumerologySection(sectionPrompt: string) {
      const requiredKeys = [
        "numerology_prediction",
        "numero_table",
        "gem_suggestion",
        "gem_details",
        "personal_characteristics",
      ];

      // Extract only necessary data from astroData
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      const fullPrompt = `
You are an expert Numerologist and Vedic astrologer.

Using the following filtered JSON data, generate the section:
"${sectionPrompt}"

Guidelines:
- Write in 2–4 elegant, insight-rich paragraphs.
- Tone: warm, premium, and professional (avoid casual tone).
- Focus on **Birth Number**, **Destiny Number**, **Name Number**, and **Connection Number** meanings.
- Include: ruling planet, traits, strengths, emotional tendencies, friendly & evil numbers, colors, metals, gemstones, and practical guidance.
- Avoid repetition or raw data. Interpret intelligently.
- End with a smooth concluding or transitional line.
- Format output as plain text (no markdown symbols or bullet points).
- Use **bold** for key terms like **Number 3**, **Jupiter**, **Life Path 5**, etc.
- Make it PDF-ready — no lists, only short structured paragraphs.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      text = removeMarkdown(text);
      return text;
    }

    for (const sectionPrompt of numerologySections) {
      const texts = await fetchNumerologySection(sectionPrompt);

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      //const formattedText = boldTextBeforeColonString(texts);
      addParagraphss(doc, texts, 50, 100, pageWidth - 100);
    }
    const personalityPrompt = `
You are an expert Vedic astrologer and psychologist.
Based on the following astro data, generate "1.5 Personality Traits & Characteristics" 
describing personality type, behavior, strengths, and emotional tendencies.

STYLE:
- Warm, elegant tone.
- 2–3 paragraphs.
- Bold important traits.
`;

    const requiredKeys = [
      "planet_details",
      "ascendant_report",
      "personal_characteristics",
      "find_moon_sign",
      "find_sun_sign",
      "find_ascendant",
      "yoga_list",
      "jaimini_karakas"
    ];

    const filteredAstroData = Object.fromEntries(
      Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
    );

    let personalityText = await callBedrock(personalityPrompt, JSON.stringify(filteredAstroData));
    personalityText = sanitizeText(personalityText);
    personalityText = removeMarkdown(personalityText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("1.5 Personality Traits & Characteristics", pageWidth / 2, 60, { align: "center" });
    doc.setTextColor("#a16a21");
    addParagraphss(doc, personalityText, 50, 100, pageWidth - 100);

    await generateHouseReports(doc, astroData, userData);

    await generatePlanetReportsWithImages(doc, astroData, userData);
    // Add initial "Love and Marriage" page

    doc.addPage();
    const margin = 25;
    const corner = 25;

    // Draw border
    doc.setFillColor("#fdf2e9");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === OUTER GRADIENT BORDER EFFECT ===
    // Outer dark gold frame
    doc.setFillColor("#a16a21");
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin, "F");

    // Inner lighter gold layer for contrast
    doc.setFillColor("#d9b46c");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNER LINES ===
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin + 6, margin + 6, margin + 6 + corner, margin + 6);
    doc.line(margin + 6, margin + 6, margin + 6, margin + 6 + corner);

    // Top-right
    doc.line(pageWidth - margin - 6, margin + 6, pageWidth - margin - 6 - corner, margin + 6);
    doc.line(pageWidth - margin - 6, margin + 6, pageWidth - margin - 6, margin + 6 + corner);

    // Bottom-left
    doc.line(margin + 6, pageHeight - margin - 6, margin + 6 + corner, pageHeight - margin - 6);
    doc.line(margin + 6, pageHeight - margin - 6, margin + 6, pageHeight - margin - 6 - corner);

    // Bottom-right
    doc.line(pageWidth - margin - 6, pageHeight - margin - 6, pageWidth - margin - 6 - corner, pageHeight - margin - 6);
    doc.line(pageWidth - margin - 6, pageHeight - margin - 6, pageWidth - margin - 6, pageHeight - margin - 6 - corner);

    // === CENTERED TEXT ===
    doc.setFont("NotoSans", "bold");
    doc.setTextColor("#ffffff");
    doc.setFontSize(40);
    doc.text("Love and Marriage", pageWidth / 2, pageHeight / 2 - 10, { align: "center" });

    // Subtext line
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.text("A Journey of Hearts and Destiny", pageWidth / 2, pageHeight / 2 + 20, { align: "center" });

    // === OPTIONAL — ORNAMENT UNDER TITLE ===
    const ornamentWidth = 60;
    const ornamentY = pageHeight / 2 + 30;
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - ornamentWidth / 2, ornamentY, pageWidth / 2 + ornamentWidth / 2, ornamentY);
    doc.circle(pageWidth / 2, ornamentY, 2, "F");

    const loveSections = [
      "Nakshatras & Moon Signs: Provide an in-depth interpretation of the individual's Nakshatra and Moon Sign, focusing on emotional needs, compatibility tendencies, and patterns in intimate connections.",
      "Moon Sign (Rashi): Explain the emotional temperament, instinctive reactions, and expressive style in relationships as governed by the Moon sign.",
      "Nakshatra (Lunar Mansion): Discuss psychological traits, emotional bonding style, and deeper subconscious motivations influenced by the native’s Nakshatra.",
      "Planetary Positions & Relationship Patterns: Analyze how the placement and aspects of key planets (especially Venus, Mars, Jupiter, and Saturn) shape love life, attachment style, and relationship experiences.",
      "Venus: Examine love language, romantic expression, desires in partnerships, and overall capacity for affection, harmony, and attraction.",
      "Mars: Explore the native’s level of passion, assertiveness, and sexual compatibility, including the influence of Mars’ sign, house, and aspects.",
      "Jupiter: Interpret how Jupiter signifies marriage prospects, spouse qualities, wisdom in relationships, and timing of significant partnerships.",
      "Saturn: Assess karmic lessons, emotional maturity, possible delays, and endurance in long-term relationships brought by Saturn’s influence.",
      "7th House: Provide a detailed reading of the 7th house sign, lordship, and planetary placements, revealing insights into marriage, partnerships, and spouse characteristics.",
      "Planetary Aspects on 7th House: Analyze how different planets aspecting the 7th house influence relationship patterns, harmony, challenges, and spouse behavior.",
      "Divisional Charts (D9 - Navamsa, D2 - Hora): Interpret the Navamsa (D9) for depth of marriage and spiritual connection, and the Hora (D2) for financial compatibility and shared prosperity.",
      "Yogas & Doshas: Identify and explain relationship-related yogas and doshas like Mangal Dosha, Chandra–Mangal Yoga, Venus–Mars conjunctions, or Rahu–Ketu influences, including their significance, strength, and possible remedies.",
      "Dashas Influencing Relationships: Analyze the Mahadasha and Antardasha periods that activate relationship events, emotional shifts, and marriage timing, providing a clear understanding of love life progression."
    ];

    async function fetchLoveSection(sectionPrompt: string) {
      const lowerPrompt = sectionPrompt.toLowerCase();
      let requiredKeys: string[] = [];

      if (lowerPrompt.includes("moon sign") || lowerPrompt.includes("nakshatra")) {
        requiredKeys = ["find_moon_sign", "find_sun_sign", "find_ascendant", "planet_details", "personal_characteristics"];
      } else if (lowerPrompt.includes("planetary positions")) {
        requiredKeys = ["planet_details", "planetary_aspects_planets", "planetary_aspects_houses", "planets_in_houses"];
      } else if (lowerPrompt.includes("venus")) {
        requiredKeys = ["planet_report_venus", "planet_details", "planets_in_houses"];
      } else if (lowerPrompt.includes("mars")) {
        requiredKeys = ["planet_report_mars", "planet_details", "planets_in_houses"];
      } else if (lowerPrompt.includes("jupiter")) {
        requiredKeys = ["planet_report_jupiter", "planet_details", "planets_in_houses"];
      } else if (lowerPrompt.includes("saturn")) {
        requiredKeys = ["planet_report_saturn", "planet_details", "planets_in_houses"];
      } else if (lowerPrompt.includes("7th house")) {
        requiredKeys = ["planets_in_houses", "planetary_aspects_houses", "kp_houses", "find_ascendant"];
      } else if (lowerPrompt.includes("divisional chart")) {
        requiredKeys = ["divisional_chart_D9", "divisional_chart_D2", "find_moon_sign"];
      } else if (lowerPrompt.includes("yoga") || lowerPrompt.includes("dosha")) {
        requiredKeys = ["yoga_list", "mangal_dosh", "manglik_dosh", "kaalsarp_dosh", "pitra_dosh", "papasamaya"];
      } else if (lowerPrompt.includes("dasha")) {
        requiredKeys = [
          "maha_dasha", "maha_dasha_predictions", "antar_dasha",
          "char_dasha_main", "char_dasha_sub", "yogini_dasha_main", "yogini_dasha_sub"
        ];
      } else {
        requiredKeys = ["planet_details", "find_moon_sign", "find_ascendant", "planets_in_houses"];
      }

      // Filter AstroData keys
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // ✨ Clean tag-based structure prompt (no markdown)
      const fullPrompt = `
You are a professional Vedic astrologer specializing in Love, Compatibility, and Marriage Astrology.

Generate a deeply insightful, elegant, and psychologically rich report for:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown (**bold**, lists, bullet points).
- Use only these tags exactly as shown.
- Be smooth, empathetic, and clear.
- Write in ${userData.language || "English"}.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      return text;
    }
    // 🔄 Generate all sections concurrently (fast)
    const loveResults = await Promise.all(loveSections.map(fetchLoveSection));

    // 🧾 Render all sections into PDF pages
    for (let i = 0; i < loveSections.length; i++) {
      const sectionTitle = loveSections[i].split(":")[0];
      const sectionText = loveResults[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text(sectionTitle, pageWidth / 2, 60, { align: "center" });

      addParagraphs(doc, sectionText, 50, 100, pageWidth - 100);
    }

    doc.addPage();

    // Draw border
    doc.setFillColor("#0e1a2b"); // Deep navy background
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER FRAME ===
    doc.setFillColor("#1c2e4a"); // Subtle gradient effect
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin, "F");

    // === GOLDEN BORDER ===
    doc.setDrawColor("#d4af37"); // Gold tone
    doc.setLineWidth(2);

    // Decorative corner style
    doc.line(margin, margin, margin + corner, margin); // Top-left horizontal
    doc.line(margin, margin, margin, margin + corner); // Top-left vertical

    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === INNER GOLD LINE FRAME ===
    const inset = 15;
    doc.setLineWidth(0.8);
    doc.setDrawColor("#f5d06f");
    doc.rect(margin + inset, margin + inset, pageWidth - 2 * (margin + inset), pageHeight - 2 * (margin + inset));

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(40);
    doc.setTextColor("#f5d06f"); // Gold text
    doc.text("Career & Profession", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
    });

    // === SUBTITLE LINE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("The Path of Purpose and Achievement", pageWidth / 2, pageHeight / 2 + 20, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    const lineWidth = 70;
    const y = pageHeight / 2 + 30;
    doc.setLineWidth(1);
    doc.setDrawColor("#f5d06f");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");
    const careerSections = [
      "Houses Related to Career (1st, 2nd, 6th, 10th): Provide an in-depth analysis of the key houses influencing profession, reputation, income, and work stability. Discuss how these houses and their lords define the individual’s natural talents, professional strengths, and career direction.",
      "Planetary Traits & Amatyakaraka Insights: Examine how different planetary placements shape career aptitude, ambition, and leadership qualities. Include an interpretation of the Amatyakaraka planet to understand vocational purpose and career-driving motivations.",
      "Nakshatra / Moon Sign Influence: Analyze how the native’s Nakshatra and Moon sign influence work style, emotional approach to profession, decision-making, and preferred work environments.",
      "Dashas & Yogas: Evaluate the planetary periods (Mahadashas and Antardashas) that bring career growth, job changes, or recognition. Identify major yogas indicating professional success, government positions, entrepreneurship, or creative prominence.",
      "Divisional Chart (D10 - Dasamsa) Insights: Offer a comprehensive reading of the Dasamsa chart, highlighting professional reputation, authority, leadership potential, and the soul’s deeper purpose in career matters."
    ];

    async function fetchCareerSection(sectionPrompt: string) {
      // All relevant data for career insights
      const requiredKeys = [
        "planet_details", "planets_in_houses", "kp_houses", "kp_planets",
        "yoga_list", "shad_bala",
        "maha_dasha", "maha_dasha_predictions", "antar_dasha",
        "char_dasha_main", "char_dasha_sub", "yogini_dasha_main", "yogini_dasha_sub",
        "divisional_chart_D10",
        "find_ascendant", "find_moon_sign", "find_sun_sign",
        "jaimini_karakas", "ascendant_report", "personal_characteristics"
      ];

      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // ✨ Tag-structured prompt (NO markdown)
      const fullPrompt = `
You are a highly experienced Vedic astrologer and career counselor.

Generate a deeply detailed, elegant, and psychologically insightful analysis for:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown, bold markers, or bullet points.
- Write continuous, narrative paragraphs with depth and flow.
- Maintain a professional, motivational tone.
- Write in ${userData.language || "English"}.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      return text;
    }

    // Run all sections concurrently
    const results = await Promise.all(careerSections.map(fetchCareerSection));

    // Render each section into the PDF
    for (let i = 0; i < careerSections.length; i++) {
      const sectionTitle = careerSections[i].split(":")[0];
      const text = results[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // Section Header
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text(sectionTitle, pageWidth / 2, 60, { align: "center" });

      // Section Content
      addParagraphs(doc, text, 50, 100, pageWidth - 100);
    }
    doc.addPage();

    // Draw border
    doc.setFillColor("#e6f5f1"); // Soft teal background
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER FRAME ===
    doc.setFillColor("#9cd1c2"); // Subtle green overlay
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Health & Wellbeing", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Balance, Vitality, and Inner Strength", pageWidth / 2, pageHeight / 2 + 25, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#ffffff");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");

    // === OPTIONAL: SOFT LEAF OR WAVE MOTIFS ===
    // Simple curved line motifs for vitality
    // doc.setDrawColor("#ffffff");
    // doc.setLineWidth(0.8);
    // doc.curve(
    //   margin + 20, margin + 60, 
    //   margin + 40, margin + 20, 
    //   pageWidth - margin - 40, margin + 20, 
    //   pageWidth - margin - 20, margin + 60
    // );
    // doc.curve(
    //   margin + 20, pageHeight - margin - 60, 
    //   margin + 40, pageHeight - margin - 20, 
    //   pageWidth - margin - 40, pageHeight - margin - 20, 
    //   pageWidth - margin - 20, pageHeight - margin - 60
    // );
    const healthSections = [
      "Doshas in Vedic Astrology : Identify and interpret major health-related doshas, explaining their origins, planetary causes, and potential impact on physical, mental, and emotional wellbeing. Provide an overview of their intensity and possible remedies.",
      "Planetary Influence on Health : Analyze how these planets affect vitality, immunity, stress, and chronic conditions. Highlight benefic or malefic influences and how their positioning contributes to overall health and energy balance.",
      "Houses Related to Health : Provide an in-depth reading of these houses and their lords to understand physical constitution, disease tendencies, recovery capacity, and karmic health challenges.",
      "Nakshatra & Moon Sign: Examine how the Nakshatra and Moon sign influence emotional resilience, mental balance, and psychosomatic patterns that can impact physical health.",
      "Ayurvedic Correlation : Correlate planetary and elemental influences with Ayurvedic principles, identifying dominant doshas and potential imbalances affecting health and lifestyle.",
      "Remedies for Health-Related Doshas: Suggest appropriate Vedic, spiritual, and lifestyle remedies such as mantras, donations, fasting, yoga, or meditation to mitigate health doshas and strengthen overall wellbeing."
    ];

    async function fetchHealthSection(sectionPrompt: string) {
      const requiredKeys = [
        // Doshas
        "mangal_dosh", "kaalsarp_dosh", "manglik_dosh", "pitra_dosh", "papasamaya",

        // Planetary data
        "planet_details", "planetary_aspects_houses", "planetary_aspects_planets",
        "planets_in_houses", "find_sun_sign", "find_moon_sign", "find_ascendant",
        "shad_bala", "kp_houses", "kp_planets", "yoga_list", "ashtakvarga",

        // Divisional charts
        "divisional_chart_D1", "divisional_chart_D9", "divisional_chart_D10",

        // Dashas
        "maha_dasha", "antar_dasha", "paryantar_dasha", "yogini_dasha_main",
        "yogini_dasha_sub", "sade_sati_table",

        // Extended horoscope data
        "current_sade_sati", "varshapal_details", "extended_kundli_details",
      ];

      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // ✨ New tag-based, markdown-free structured prompt
      const fullPrompt = `
You are an expert Vedic astrologer and holistic wellness counselor.

Generate a detailed, 700–900 word health report for:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown (**bold**, bullet points, or symbols).
- Write continuous, elegant paragraphs only.
- Tone: compassionate, insightful, and reassuring.
- Blend Vedic Astrology, Ayurveda, and psychology seamlessly.
- Write in ${userData.language || "English"}.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      return text;
    }

    // 🧠 Generate all sections in parallel for performance
    const resultss = await Promise.all(healthSections.map(fetchHealthSection));

    // 🧾 Render all sections into PDF pages
    for (let i = 0; i < healthSections.length; i++) {
      const sectionPrompt = healthSections[i];
      const text = resultss[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // 🩺 Title setup
      const sectionTitle = sectionPrompt.split(":")[0].trim();
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      const titleFontSize = titleLines.length > 1 ? 20 : 22;
      const titleLineHeight = 24;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor("#000");

      let titleY = 60;
      titleLines.forEach((line: string, idx: number) => {
        doc.text(line, pageWidth / 2, titleY + idx * titleLineHeight, { align: "center" });
      });

      titleY += titleLines.length * titleLineHeight + 10;

      // 🧘 Content
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");

      addParagraphs(doc, text, 50, titleY + 30, pageWidth - 100);
    }
    doc.addPage();

    // Draw border
    doc.setFillColor("#4b2e83"); // Deep purple
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER GOLDEN BORDER ===
    doc.setDrawColor("#d4af37"); // Gold
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    // === INNER BACKGROUND FILL (Slightly lighter purple) ===
    doc.setFillColor("#5e3ca0");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#d4af37");
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#f5d06f"); // Gold text
    doc.text("Karmic & Purpose Insights", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Discover the Path of Your Soul and Destiny", pageWidth / 2, pageHeight / 2 + 25, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#f5d06f");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");
    const karmicSections = [
      "Chara Karakas: Soul Purpose & Life Goals — Analyze the Chara Karakas (Atmakaraka, Amatyakaraka, etc.) to reveal the soul’s deeper purpose, key life missions, and the spiritual themes guiding the individual’s journey through destiny and growth.",
      "Sade Sati Journey: Phases, Challenges & Remedies — Provide a detailed explanation of the three phases of Sade Sati, its transformative challenges, emotional tests, and karmic maturity lessons, along with effective spiritual and practical remedies.",
      "Karmic Yogas & Mangalik Combinations — Identify yogas and planetary combinations indicating past-life influences, karmic debts, and intense emotional or relational lessons, including the role of Mangal Dosha and its higher transformative purpose.",
      "Astrological Doshas: Karmic Blocks & Lessons — Examine doshas such as Kaalsarp, Pitra, and Graha Shrapa as reflections of unresolved karmic patterns. Explain their impact on different life areas and provide insights into transcending them through awareness and discipline.",
      "Retrograde Planets: Past-Life Influences — Interpret the karmic significance of retrograde planets, showing how they reveal unfinished lessons, repetitive experiences, and opportunities for healing and evolution in this lifetime."
    ];

    async function fetchKarmicSection(sectionPrompt: string) {
      const minimalData = {
        chara_karakas: astroData?.jaimini_karakas,
        sade_sati: astroData?.current_sade_sati,
        sade_sati_table: astroData?.sade_sati_table,
        yogas: astroData?.yoga_list,
        mangal_dosh: astroData?.mangal_dosh,
        kaalsarp_dosh: astroData?.kaalsarp_dosh,
        pitra_dosh: astroData?.pitra_dosh,
        retrogrades: Object.fromEntries(
          PLANETS.map((p: string) => [p, astroData[`retrogrades_${p.toLowerCase()}`]])
        ),
        planet_details: astroData?.planet_details,
        ascendant: astroData?.find_ascendant,
      };

      // ✨ Clean XML-tag based structured prompt
      const fullPrompt = `
You are an experienced Vedic astrologer specializing in karmic evolution, past-life insights, and spiritual transformation.

Generate a profound, detailed, and emotionally resonant report for the topic:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown or bullet points.
- Use only the above tag structure exactly as written.
- Write 3–4 elegant, flowing paragraphs.
- Tone: compassionate, wise, and transformative.
- Write in ${userData.language || "English"}.
`;

      let text = await callBedrock(fullPrompt, { minimalData });
      text = sanitizeText(text);
      return text;
    }

    // Run all API calls in parallel
    const resultkarmic = await Promise.all(karmicSections.map(fetchKarmicSection));

    // Now render all sections into the PDF
    for (let i = 0; i < karmicSections.length; i++) {
      const sectionPrompt = karmicSections[i];
      const text = resultkarmic[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      const sectionTitle = sectionPrompt.split("—")[0].trim(); // ✅ only use text before "—"
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      let titleY = 60;

      // Choose smaller font size if title is long
      const titleFontSize = titleLines.length > 1 ? 18 : 20;
      const titleLineHeight = 24;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor("#000");

      // Center the title lines properly
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, pageWidth / 2, titleY + i * titleLineHeight, { align: "center" });
      });

      titleY += titleLines.length * titleLineHeight + 10;


      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");
      //const formatedtext = boldTextBeforeColonString(text);
      addParagraphs(doc, text, 50, 100, pageWidth - 100);
    }

    // Generate "09 Timing & Predictive Insights" section
    doc.addPage();

    // Draw border
    doc.setFillColor("#0b1f3f"); // Dark navy/blue background
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER FRAME ===
    doc.setFillColor("#1a3a66"); // Slightly lighter blue for inner rectangle
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#c0c0c0"); // Silver
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#c0c0c0"); // Silver text
    doc.text("Timing & Predictive Insights", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Forecasting Your Path with Precision", pageWidth / 2, pageHeight / 2 + 25, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#c0c0c0");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");

    const timingSections = [
      "Mahadasha Overview: Major Life Phases — Provide a detailed overview of the native’s current and upcoming Mahadashas, interpreting their planetary themes, major life transitions, and long-term influence on career, health, relationships, and spiritual growth.",
      "Antardasha Details: Sub-Periods & Impact — Analyze the sub-periods (Antardashas) within each Mahadasha to identify specific timeframes of progress, challenges, and opportunities across key life areas.",
      "Paryantar & Yogini Dashas: Micro Life Events — Examine Paryantar and Yogini Dashas for micro-level insights, highlighting subtle shifts, short-term developments, and emotional or karmic lessons influencing daily experiences.",
      "Transit Dates of Planets (Predictions): Provide accurate planetary transit timelines for 2025, describing how each planet’s movement affects personal growth, career dynamics, financial stability, and relationship trends throughout the year.",
      "AI-Based 12-Month Prediction: Generate a data-driven, AI-supported analysis of the next 12 months, categorizing months into favorable and challenging periods with corresponding planetary reasoning and actionable guidance."
    ];

    const PAGE_HEIGHT = 842;
    //const LINE_HEIGHT = 20;
    const essentialTimingData = {
      // Dashas
      maha_dasha: astroData.maha_dasha,
      antar_dasha: astroData.antar_dasha,
      paryantar_dasha: astroData.paryantar_dasha,
      yogini_dasha_main: astroData.yogini_dasha_main,
      yogini_dasha_sub: astroData.yogini_dasha_sub,

      // Transits
      transit_dates_sun: astroData.transit_dates_sun,
      transit_dates_moon: astroData.transit_dates_moon,
      transit_dates_mars: astroData.transit_dates_mars,
      transit_dates_mercury: astroData.transit_dates_mercury,
      transit_dates_jupiter: astroData.transit_dates_jupiter,
      transit_dates_venus: astroData.transit_dates_venus,
      transit_dates_saturn: astroData.transit_dates_saturn,
      transit_dates_rahu: astroData.transit_dates_rahu,
      transit_dates_ketu: astroData.transit_dates_ketu,

      // Supporting context
      yoga_list: astroData.yoga_list,
      current_sade_sati: astroData.current_sade_sati,
      varshapal_details: astroData.varshapal_details,
      ai_12_month_prediction: astroData.ai_12_month_prediction,

      // Personality / chart reference
      find_ascendant: astroData.find_ascendant,
      find_moon_sign: astroData.find_moon_sign,
      find_sun_sign: astroData.find_sun_sign,
    };

    for (const sectionPrompt of timingSections) {
      let fullPrompt = `
You are a senior Vedic astrologer and predictive analyst. 
Generate an in-depth, elegant, and section-specific report for the following topic:
"${sectionPrompt}"

Use the following strict XML-style tag format for structure:
──────────────────────────────
<<<heading>>> Major Overview
<content>Begin with a short overview explaining the astrological theme of this section — its purpose, planetary background, and timing relevance.</content>

<<subheading>> Planetary Influences
<content>Describe how planetary energies and interactions shape the timing of events. Include planetary strengths, house rulerships, and psychological or karmic significance.</content>

<<subheading>> Dasha & Antardasha Periods
<content>For every Mahadasha and Antardasha, use <subheading> tags for the period names (e.g. "Mars Mahadasha", "Venus/Mercury Antardasha"). Follow each with <content> paragraphs explaining the effects, areas of change, and key lessons during that phase.</content>

<<subheading>> Transit & Predictive Insights
<content>Summarize how current or upcoming transits enhance or challenge these Dasha outcomes. Describe how planetary movement affects timing, transformation, and progress.</content>

<<subheading>> Spiritual Takeaways & Remedies
<content>Conclude with uplifting insights, karmic takeaways, and practical remedies (mantras, meditation, rituals, or mindset) for aligning with the planetary flow.</content>
──────────────────────────────

Formatting Rules:
- Do NOT use markdown (**bold**, asterisks, or bullets).
- Keep 3–6 cohesive paragraphs.
- Ensure every Dasha (Mahadasha, Antardasha, etc.) is formatted as:
  <<subheading>> Mars Mahadasha
  <content>Interpretation text...</content>
- Similarly for Antardashas: 
  <<subheading>> Jupiter/Mercury Antardasha
  <content>Interpretation text...</content>
- Maintain a smooth, explanatory tone — predictive yet empowering.
- Avoid Sanskrit-heavy or overly technical words.
- Write in ${userData.language || "English"}.
`;

      // ✅ Add the 12-month prediction instruction ONLY for that specific section
      if (/AI[- ]?Based\s*12[- ]?Month/i.test(sectionPrompt)) {
        fullPrompt += `
For the <<<heading>>> AI-Based 12-Month Prediction:
<content>Include a 1-paragraph overview of 2025, then write concise monthly insights (Jan–Dec 2025) under <subheading>Month Name</subheading> tags, labeling favorable vs challenging periods clearly. End with a positive, integrative closing paragraph.</content>
`;
      }

      let text = await callBedrock(fullPrompt, { essentialTimingData });
      text = sanitizeText(text);
      //text = removeMarkdown(text);
      // --- Clean title ---
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      const pageWidth = doc.internal.pageSize.getWidth();
      let cursorY = 110;

      // --- Titles ---
      let sectionTitle = sectionPrompt.split("—")[0].trim();
      sectionTitle = sectionTitle.split(":")[0].trim();
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      const titleFontSize = titleLines.length > 1 ? 18 : 20;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor("#000");
      titleLines.forEach((line: string, i: number) =>
        doc.text(line, pageWidth / 2, 60 + i * 24, { align: "center" })
      );

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");
      //doc.text(sectionPrompt.split(":")[1] || "", pageWidth / 2, 80, { align: "center" });

      // --- TABLE SECTIONS ---
      if (sectionPrompt.includes("Mahadasha")) {
        const dashas: MahaDasha[] = astroData?.maha_dasha_predictions?.dashas || [];

        const mahaData: string[][] = dashas.map((d: MahaDasha) => [
          d.dasha,
          d.dasha_start_year,
          d.dasha_end_year
        ]);

        cursorY = addPaginatedTable(
          doc,
          ["Planet", "Start Date", "End Date"],
          mahaData,
          cursorY,
          PAGE_HEIGHT
        );

        cursorY += 20;
      }

      if (sectionPrompt.includes("Antardasha")) {
        const antardashaData = astroData?.antar_dasha; // ✅ ensure correct key name
        const mahaDashas = astroData?.mahadasha_data?.mahadasha || [];

        if (!antardashaData?.antardashas?.length) {
          console.warn("No Antardasha data found.");
        }

        (antardashaData.antardashas || []).forEach((antarList: string[], index: number) => {
          const antarOrder: string[] = antardashaData.antardasha_order?.[index] || [];

          if (!antarList?.length) return;

          // ✅ Safely create rows with proper start and end date
          const antarData: string[][] = antarList.map((sub, i) => [
            sub || "N/A",
            antarOrder[i] || "N/A",
            antarOrder[i + 1] || antarOrder[i] || "—"
          ]);

          // ✅ Add title with safe page break
          if (cursorY > PAGE_HEIGHT - 150) {
            doc.addPage();
            cursorY = 60;
          }

          cursorY += 10;

          // ✅ Draw table (make sure your addPaginatedTable handles multi-page tables)
          cursorY = addPaginatedTable(
            doc,
            ["Antardasha", "Start Date", "End Date"],
            antarData,
            cursorY,
            PAGE_HEIGHT
          );

          cursorY += 30;
        });
      }

      // --- CONTENT (ALWAYS SHOW AFTER TABLES) ---
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(14);
      doc.setTextColor("#000");
      addParagraphs(doc, text, 50, cursorY, pageWidth - 100);

    }

    // --- Helper: addPaginatedTable ---
    function addPaginatedTable(
      doc: jsPDF,
      headers: string[],
      data: string[][],
      startY: number,
      pageHeight: number
    ): number {
      const tableWidth = 400;
      const colWidth = tableWidth / headers.length;
      const pageWidth = doc.internal.pageSize.getWidth();
      const startX = (pageWidth - tableWidth) / 2;

      const LINE_HEIGHT = 22;
      const PAGE_MARGIN = 50;
      const textPaddingY = 6;

      // --- DRAW BORDER AROUND PAGE ---
      const drawPageBorder = () => {
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");
      };

      // --- DRAW HEADER ROW ---
      const drawHeader = (yPos: number) => {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(16);
        doc.setFillColor(161, 106, 33);
        doc.setTextColor(255, 255, 255);
        doc.rect(startX, yPos - 7, tableWidth, LINE_HEIGHT, "F");

        headers.forEach((header, i) => {
          const centerX = startX + i * colWidth + colWidth / 2;
          doc.text(header, centerX, yPos, {
            align: "center",
            baseline: "middle",
          });
        });

        return yPos + LINE_HEIGHT;
      };

      // --- INITIALIZE PAGE ---
      drawPageBorder();
      let y = drawHeader(startY);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0);

      // --- DRAW TABLE ROWS ---
      for (let i = 0; i < data.length; i++) {
        // Check if next row fits; if not, add new page
        if (y + LINE_HEIGHT + PAGE_MARGIN > pageHeight) {
          addHeaderFooter(doc, doc.getNumberOfPages());
          doc.addPage();
          drawPageBorder();
          y = PAGE_MARGIN;
          y = drawHeader(y);
          doc.setFont("NotoSans", "normal");
          doc.setFontSize(12);
          doc.setTextColor(0);
        }

        // Alternate background
        if (i % 2 === 0) {
          doc.setFillColor(245, 232, 215);
          doc.rect(startX, y - 7, tableWidth, LINE_HEIGHT, "F");
        }

        // Row border
        doc.setDrawColor(200);
        doc.rect(startX, y - 7, tableWidth, LINE_HEIGHT);

        // Center text cells
        data[i].forEach((cell: string, j: number) => {
          const centerX = startX + j * colWidth + colWidth / 2;
          doc.text(cell, centerX, y + textPaddingY, {
            align: "center",
            baseline: "middle",
          });
        });

        y += LINE_HEIGHT;
      }

      // --- Final footer and border ---
      addHeaderFooter(doc, doc.getNumberOfPages());
      drawPageBorder();

      return y;
    }

    doc.addPage();

    // Draw border
    doc.setFillColor("#4b1f65"); // Deep violet
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER GOLDEN BORDER ===
    doc.setDrawColor("#d4af37"); // Gold
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    // === INNER BACKGROUND FILL (Slightly lighter violet) ===
    doc.setFillColor("#62379b");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#f5d06f"); // Soft gold
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#f5d06f"); // Gold
    doc.text("Remedies & Spiritual Guidance", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Pathways to Inner Peace and Transformation", pageWidth / 2, pageHeight / 2 + 25, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#f5d06f");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");

    // --- Remedies Section Definitions ---
    const remediesSections = [
      "Rudraksha Guidance & Recommendations — Provide personalized Rudraksha recommendations based on planetary afflictions, Nakshatra, and emotional balance.",
      "Gemstone Remedies & Gem Details — Suggest auspicious gemstones aligned with the native’s planetary strengths and weaknesses.",
      "Mantra Chanting & Yantra Suggestions — Recommend suitable mantras and yantras to strengthen benefic planets and reduce malefic influences.",
      "Charitable Actions & Spiritual Practices — Outline meaningful donations, fasting rituals, and meditation techniques to enhance planetary harmony.",
      "Sade Sati & Dosha Remedies — Offer targeted remedies for Sade Sati, Kaalsarp, Mangalik, or other doshas."
    ];

    // --- Essential Data: Split by Relevance to Reduce Bedrock Payload ---
    const dataMap = {
      "Rudraksha Guidance & Recommendations": {
        rudraksh_suggestion: astroData.rudraksh_suggestion,
        planet_details: astroData.planet_details,
        find_moon_sign: astroData.find_moon_sign,
        find_ascendant: astroData.find_ascendant,
      },
      "Gemstone Remedies & Gem Details": {
        gem_suggestion: astroData.gem_suggestion,
        gem_details: astroData.gem_details,
        planet_details: astroData.planet_details,
      },
      "Mantra Chanting & Yantra Suggestions": {
        yoga_list: astroData.yoga_list,
        find_moon_sign: astroData.find_moon_sign,
        find_sun_sign: astroData.find_sun_sign,
      },
      "Charitable Actions & Spiritual Practices": {
        papasamaya: astroData.papasamaya,
        pitra_dosh: astroData.pitra_dosh,
        mangal_dosh: astroData.mangal_dosh,
        kaalsarp_dosh: astroData.kaalsarp_dosh,
      },
      "Sade Sati & Dosha Remedies": {
        current_sade_sati: astroData.current_sade_sati,
        kaalsarp_dosh: astroData.kaalsarp_dosh,
        manglik_dosh: astroData.manglik_dosh,
        pitra_dosh: astroData.pitra_dosh,
      },
    };

    // --- Bedrock Section Generator with Robust Logging ---
    async function fetchRemediesSection(sectionPrompt: string) {
      const sectionTitle = sectionPrompt.split("—")[0].trim();
      const fullPrompt = `
You are a compassionate and scholarly Vedic astrologer and spiritual counselor.

Generate a deeply insightful, section-specific remedies report for:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown or asterisks.
- Use only these tags: <<<heading>>>, <<subheading>>, <content>.
- Write 4–6 flowing, paragraph-style segments with deep spiritual and practical relevance.
- Maintain a calm, empathetic, and elevating tone.
- Avoid overly technical Sanskrit terms.
- Write in ${userData.language || "English"}.
`;

      try {
        const key = sectionTitle as keyof typeof dataMap;
        const inputData = dataMap[key] || {};
        const raw = await callBedrock(fullPrompt, inputData);

        if (!raw || raw.trim().length < 100) {
          console.warn(`⚠️ Bedrock empty or short response for ${sectionTitle}`);
          return `<<<heading>>> ${sectionTitle}\n<content>No detailed guidance could be generated for this section.</content>`;
        }

        const cleaned = sanitizeText(raw);
        console.log(`✅ Cleaned Bedrock message for ${sectionTitle}:`, cleaned.slice(0, 150));
        return cleaned;
      } catch (err) {
        console.error(`❌ Error fetching ${sectionTitle}:`, err);
        return `<<<heading>>> ${sectionTitle}\n<content>Error generating remedies for this section.</content>`;
      }
    }

    // --- Sequential Execution with Progress Logging (safer than Promise.all) ---
    const resultRemedies = [];
    for (const section of remediesSections) {
      console.log(`🕉️ Generating Remedies Section → ${section.split("—")[0].trim()} ...`);
      const text = await fetchRemediesSection(section);
      resultRemedies.push(text);
    }
    console.log("✨ All Remedies Sections Generated!");

    // --- PDF Rendering ---
    for (let i = 0; i < remediesSections.length; i++) {
      const sectionPrompt = remediesSections[i];
      const text = resultRemedies[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // --- Title ---
      const sectionTitle = sectionPrompt.split("—")[0].trim();
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      const titleFontSize = titleLines.length > 1 ? 20 : 22;
      const titleLineHeight = 24;
      let titleY = 60;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor("#000");
      titleLines.forEach((line: string, idx: number) => {
        doc.text(line, pageWidth / 2, titleY + idx * titleLineHeight, { align: "center" });
      });

      titleY += titleLines.length * titleLineHeight + 20;

      // --- Content ---
      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, titleY, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, titleY);
      }
    }



    doc.addPage();

    // Draw border
    doc.setFillColor("#1a2b40"); // Deep steel-blue
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER FRAME ===
    doc.setFillColor("#2e3f5c"); // Slightly lighter inner rectangle
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#c0c0c0"); // Silver accents
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#c0c0c0"); // Silver text

    // Split text into two lines
    const line1 = "Advanced Calculations &";
    const line2 = "Optional Insights";

    const centerY = pageHeight / 2;
    const spacing = lineHeight * 1.5; // Adjust spacing between lines

    doc.text(line1, pageWidth / 2, centerY - spacing / 2, {
      align: "center",
      baseline: "middle",
    });
    doc.text(line2, pageWidth / 2, centerY + spacing / 2, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Deep Analysis for Informed Decisions", pageWidth / 2, centerY + spacing + 20, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#c0c0c0");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");

    const advancedSections = [
      "Ashtakvarga: Strength & Fortune Analysis — Provide a detailed breakdown of planetary strength through the Ashtakvarga system. Interpret bindus for each planet and house to assess luck, vitality, and the overall flow of fortune in the native’s life path.",
      "Shadbala: Sixfold Planetary Strength — Analyze the quantitative strength of each planet using the Shadbala system. Discuss how these strength levels influence success, decision-making, and performance in key life areas like career, health, and relationships.",
      "Divisional Charts Summary (D1–D12 Overview) — Offer a summarized interpretation of divisional charts D1 to D12, focusing on their respective domains (e.g., D9 for marriage, D10 for career, D12 for parental karma). Highlight the interplay of planetary strengths across these charts.",
      "Pratyantar Dasha: Sub-Periods for Predictive Analysis — Examine the Pratyantar Dasha layers within major and sub-periods to provide refined predictive insights into short-term developments, opportunities, and turning points.",
      "Planetary Wars (Grah Yuddha) & Retrograde Impacts — Explain instances of planetary war and retrogression, interpreting their effects on confidence, clarity, delays, and karmic lessons. Provide guidance on managing such planetary tensions through awareness and timing."
    ];
    const essentialAdvancedData = {
      ashtakvarga: astroData.ashtakvarga,
      shad_bala: astroData.shad_bala,
      divisional_charts: Object.fromEntries(
        Object.entries(astroData).filter(([key]) => key.startsWith("divisional_chart_"))
      ),
      paryantar_dasha: astroData.paryantar_dasha,
      antar_dasha: astroData.antar_dasha,
      maha_dasha: astroData.maha_dasha,
      retrogrades: Object.fromEntries(
        Object.entries(astroData).filter(([key]) => key.startsWith("retrogrades_"))
      ),
      transit_dates: Object.fromEntries(
        Object.entries(astroData).filter(([key]) => key.startsWith("transit_dates_"))
      ),
      planet_details: astroData.planet_details,
      planets_in_houses: astroData.planets_in_houses,
      yoga_list: astroData.yoga_list,
    };

    async function fetchAdvanceSection(sectionPrompt: string) {
      const fullPrompt = `
You are an advanced Vedic astrologer and researcher with deep expertise in mathematical, predictive, and intuitive astrology.

Generate a detailed, human-readable, and spiritually insightful report for this section:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Do NOT use markdown or symbols like **, ---, or bullets.
- Use only the tags: <<<heading>>>, <<subheading>>, <content>.
- Write 4–6 flowing paragraphs that blend analytical clarity and spiritual depth.
- Keep tone professional, empowering, and interpretive — avoid jargon-heavy Sanskrit.
- Always close with guidance or actionable wisdom.
- Write in ${userData.language || "English"}.
`;

      let text = await callBedrock(fullPrompt, { essentialAdvancedData });
      text = sanitizeText(text);
      return text;
    }
    // Run all API calls in parallel
    const resultadvance = await Promise.all(advancedSections.map(fetchAdvanceSection));

    // Now render all sections into the PDF
    for (let i = 0; i < advancedSections.length; i++) {
      const sectionPrompt = advancedSections[i];
      const text = resultadvance[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // --- Title ---
      const sectionTitle = sectionPrompt.split("—")[0].trim();
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      const titleFontSize = titleLines.length > 1 ? 20 : 22;
      const titleLineHeight = 24;
      let titleY = 60;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor("#000");
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, pageWidth / 2, titleY + i * titleLineHeight, { align: "center" });
      });

      titleY += titleLines.length * titleLineHeight + 20;

      // --- Body ---
      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, titleY, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, titleY);
      }
    }
    doc.addPage();
    doc.setFillColor("#4b1f65"); // Deep violet
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === INNER GOLDEN BORDER ===
    doc.setDrawColor("#d4af37"); // Gold
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    // === INNER BACKGROUND FILL (Slightly lighter violet) ===
    doc.setFillColor("#62379b");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === DECORATIVE CORNERS ===
    doc.setDrawColor("#f5d06f"); // Soft gold
    doc.setLineWidth(1.5);

    // Top-left
    doc.line(margin, margin, margin + corner, margin);
    doc.line(margin, margin, margin, margin + corner);

    // Top-right
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // === CENTER TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#f5d06f"); // Gold
    doc.text("Panchang & Astronomical Insights", pageWidth / 2, pageHeight / 2 - 10, {
      align: "center",
      baseline: "middle",
    });

    // === SUBTITLE ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Pathways to Inner Peace and Transformation", pageWidth / 2, pageHeight / 2 + 25, {
      align: "center",
    });

    // === DECORATIVE DIVIDER ===
    doc.setLineWidth(1);
    doc.setDrawColor("#f5d06f");
    doc.line(pageWidth / 2 - lineWidth / 2, y, pageWidth / 2 + lineWidth / 2, y);
    doc.circle(pageWidth / 2, y, 2, "F");

    const panchangSections = [
      "Sunrise & Sunset Timings (Birth Day Reference) — Provide precise sunrise and sunset timings for the native’s birth date and location. Explain their significance in determining Lagna, planetary strength, and the energetic start and end of the day.",
      "Moonrise & Moonset Timings — Offer accurate moonrise and moonset times for the birth day, describing their astrological relevance for emotional rhythms, mind stability, and lunar influences on the native’s temperament.",
      "Choghadiya Muhurta: Daily Auspicious Hours — Present the Choghadiya segments for the day of birth, classifying them as auspicious, neutral, or inauspicious. Explain how these timings influence daily decisions, events, and beginnings.",
      "Hora Muhurta: Planetary Hour Influences — Detail the planetary hours (Horas) governing the birth period, illustrating how each planetary hour impacts decision-making, productivity, and the native’s inherent timing for success."
    ];

    const essentialPanchangData = {
      sunrise: astroData.sunrise,
      sunset: astroData.sunset,
      moonrise: astroData.moonrise,
      moonset: astroData.moonset,
      choghadiya_muhurta: astroData.choghadiya_muhurta,
      hora_muhurta: astroData.hora_muhurta,
      find_moon_sign: astroData.find_moon_sign,
      find_ascendant: astroData.find_ascendant,
      current_sade_sati: astroData.current_sade_sati,
    };

    // --- Loop through each Panchang sub-section ---
    async function fetchpanchangSection(sectionPrompt: string) {
      const fullPrompt = `
You are a Vedic astrologer and Panchang expert with profound knowledge of planetary timings, Muhurtas, and the subtle energy patterns that guide daily life.

Generate a deeply insightful and well-structured astrology report for:
"${sectionPrompt}"

Output Format:
Use only the following XML-style tags anywhere in your response as needed:
<<<heading>>>
<<subheading>>
<content>

Rules:
- Use these tags naturally throughout the content — not necessarily in fixed order.
- Each heading and subheading must be unique, context-specific, and written in a natural, descriptive style (not generic like “Overview”).
- Write 4–6 rich paragraphs blending:
  1. Astronomical and calculation insights (what it is and how it works)
  2. Astrological impact (how it influences personality, emotions, or daily rhythm)
  3. Spiritual or psychological meaning (symbolism, mindfulness, inner awareness)
  4. Practical guidance (how to apply this knowledge in life, rituals, or planning)
  5. Closing reflection (a poetic or philosophical takeaway about cosmic harmony)
- Maintain a calm, wise, insightful, and readable tone.
- Avoid lists, markdown, or bullet points.
- Keep flow smooth and meditative, suitable for readers seeking clarity and depth.
- Write in ${userData.language || "English"}.
`;


      try {
        const raw = await callBedrock(fullPrompt, essentialPanchangData);
        let text = sanitizeText(raw);

        if (!text || typeof text !== "string" || text.trim() === "") {
          text = "<<<heading>>> Panchang Data\n<content>Astrological data for this section is currently unavailable.</content>";
        }

        return text;
      } catch (err) {
        console.error("⚠️ Panchang Bedrock Error:", err);
        return "<<<heading>>> Panchang Data\n<content>Astrological data for this section could not be generated.</content>";
      }
    }
    // --- Run all API calls in parallel ---
    const resultpanchang = await Promise.all(panchangSections.map(fetchpanchangSection));

    // --- Render all sections ---
    for (let i = 0; i < panchangSections.length; i++) {
      const sectionPrompt = panchangSections[i];
      const text = resultpanchang[i];

      let sectionTitle = sectionPrompt.split("—")[0].trim();

      // --- Page Setup ---
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // --- Title ---
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");

      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 100);
      let titleY = 70;
      titleLines.forEach((line: string, idx: number) => {
        doc.text(line, pageWidth / 2, titleY + idx * 24, { align: "center" });
      });

      const startY = titleY + titleLines.length * 30;

      // --- Content ---
      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, startY, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, startY);
      }
    }
    // Generate "12 Q&A & Personalized Advice" section
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // --- Generate 12–15 Personalized Questions (Categorized) ---
    async function generateSpecificQuestions() {
      // 🔹 Always use fallback questions — no Gemini API call
      return {
        CAREER: [
          "When will I achieve a major promotion or job change?",
          "Is there a chance of working abroad or switching industries soon?"
        ],
        LOVE_AND_RELATIONSHIPS: [
          "When will I get married?",
          "Will I have a stable and happy married life?"
        ],
        HEALTH: [
          "Are there any periods of health challenges coming up?",
          "Will my energy and fitness improve in the near future?"
        ],
        WEALTH: [
          "How much financial growth can I expect in the coming years?",
          "Will I be able to buy my own house or property?"
        ],
        FAME_AND_SOCIAL_RECOGNITION: [
          "Will I gain fame or public recognition for my work?",
          "Is there a period when my influence will increase?"
        ],
        SPIRITUAL_GROWTH: [
          "Do I have spiritual inclinations shown in my chart?",
          "When is a favorable period for spiritual awakening or learning?"
        ]
      };
    }

    // --- Main Function to Generate Predictive Q&A PDF ---
   async function generateQAPDF(doc: jsPDF, userLanguage = "English") {
  // ✅ Load locally stored astrology data
  const astroData = await readAstroJSON("astro_data_Vivek.json");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Layout constants
  const marginX = 50;
  const marginY = 60;
  const maxWidth = pageWidth - 2 * marginX;
  const lineHeight = 22;

  // Step 1: Generate predictive questions
  const questionSections = await generateSpecificQuestions();

  // Step 2: Generate answers
  const allSectionPromises = Object.entries(questionSections).map(async ([section, questions]) => {
    const qaPairs = await Promise.all(
      questions.map(async (question, index) => {
        await sleep(index * 200);
        const answer = await generateAnswer(question, astroData);
        return { question, answer };
      })
    );
    return { section, qaPairs };
  });

  const resolvedSections = await Promise.all(allSectionPromises);

  // 🎨 Local-only Border Drawer (Q&A pages only)
  const drawQABorder = (doc: jsPDF) => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX - 20, marginY - 30, pageWidth - 2 * (marginX - 20), pageHeight - 2 * (marginY - 30), "S");
  };

  // Step 3: Add Q&A Section Page
  doc.addPage();
  drawQABorder(doc);
  addHeaderFooter(doc, doc.getNumberOfPages());

  // Title
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(26);
  doc.setTextColor("#000");
  doc.text("Personalized Predictive Q&A", pageWidth / 2, 80, { align: "center" });

  let currentY = 120;

  for (const { section, qaPairs } of resolvedSections) {
    // 🟣 Section Heading
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(18);
    doc.setTextColor("#a16a21");
    doc.text(section.replace(/_/g, " "), marginX, currentY);
    currentY += lineHeight + 6;

    for (const { question, answer } of qaPairs) {
      // --- Question ---
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#000");
      doc.text("Question:", marginX, currentY);
      currentY += lineHeight - 4;

      const qLines = doc.splitTextToSize(question.trim(), maxWidth);
      for (const line of qLines) {
        if (currentY > pageHeight - 100) {
          doc.addPage();
          drawQABorder(doc); // 🟠 Only draw border for new Q&A pages
          addHeaderFooter(doc, doc.getNumberOfPages());
          currentY = marginY + 20;
        }
        doc.text(line, marginX + 10, currentY);
        currentY += lineHeight - 6;
      }

      currentY += 6;

      // --- Answer ---
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#000");
      doc.text("Answer:", marginX, currentY);
      currentY += lineHeight - 4;

      const aLines = doc.splitTextToSize(answer.trim(), maxWidth);
      for (const line of aLines) {
        if (currentY > pageHeight - 100) {
          doc.addPage();
          drawQABorder(doc); // 🟠 Only draw border for new Q&A pages
          addHeaderFooter(doc, doc.getNumberOfPages());
          currentY = marginY + 20;
        }
        doc.text(line, marginX + 10, currentY);
        currentY += lineHeight - 6;
      }

      currentY += 12;
    }

    currentY += 16;
  }

  // ✅ No border redraw for other (non-Q&A) pages
  return doc;
}


    async function generateAnswer(
      question: string,
      astroData: Record<string, any>,
      retryCount = 0
    ): Promise<string> {
      try {
        const q = question.toLowerCase();
        let relevantData: Record<string, any> = {};

        // 🌟 Extract relevant astro data safely
        if (q.includes("financial") || q.includes("wealth")) {
          relevantData = {
            jupiterTransit: astroData["transit_dates_jupiter"],
            saturnTransit: astroData["transit_dates_saturn"],
            dhanYogas: Array.isArray(astroData["yoga_list"])
              ? astroData["yoga_list"].filter((y: any) =>
                y?.name?.toLowerCase()?.includes("dhan")
              )
              : [],
            ashtakvarga: astroData["ashtakvarga"],
            currentDasha: Array.isArray(astroData["maha_dasha_predictions"])
              ? astroData["maha_dasha_predictions"]
              : [],
          };
        } else if (q.includes("house") || q.includes("property")) {
          relevantData = {
            jupiterTransit: astroData["transit_dates_jupiter"],
            venusDetails: astroData["planet_report_venus"],
            dhanYogas: Array.isArray(astroData["yoga_list"])
              ? astroData["yoga_list"].filter((y: any) =>
                y?.name?.toLowerCase()?.includes("dhan")
              )
              : [],
            gajaKesari: Array.isArray(astroData["yoga_list"])
              ? astroData["yoga_list"].find((y: any) =>
                y?.name?.toLowerCase()?.includes("gaja")
              )
              : null,
            saturnPeriod: Array.isArray(astroData["maha_dasha_predictions"])
              ? astroData["maha_dasha_predictions"].find(
                (d: any) => d?.planet === "Saturn"
              )
              : null,
          };
        } else if (q.includes("promotion") || q.includes("career")) {
          relevantData = {
            saturnTransit: astroData["transit_dates_saturn"],
            jupiterTransit: astroData["transit_dates_jupiter"],
            rahuTransit: astroData["transit_dates_rahu"],
            tenthHouse: Array.isArray(astroData["planets_in_houses"])
              ? astroData["planets_in_houses"].find((h: any) => h?.house_no === 10)
              : null,
            mahaDasha: Array.isArray(astroData["maha_dasha_predictions"])
              ? astroData["maha_dasha_predictions"]
              : [],
          };
        } else if (
          q.includes("married") ||
          q.includes("relationship") ||
          q.includes("love")
        ) {
          relevantData = {
            venus: astroData["planet_report_venus"],
            seventhHouse: Array.isArray(astroData["planets_in_houses"])
              ? astroData["planets_in_houses"].find((h: any) => h?.house_no === 7)
              : null,
            manglik: astroData["manglik_dosh"],
            kaalsarp: astroData["kaalsarp_dosh"],
          };
        } else if (q.includes("health")) {
          relevantData = {
            sixthHouse: Array.isArray(astroData["planets_in_houses"])
              ? astroData["planets_in_houses"].find((h: any) => h?.house_no === 6)
              : null,
            rahuKetu: astroData["transit_dates_rahu"],
            sadeSati: astroData["current_sade_sati"],
            moon: astroData["planet_report_moon"],
          };
        } else if (q.includes("spiritual")) {
          relevantData = {
            twelfthHouse: Array.isArray(astroData["planets_in_houses"])
              ? astroData["planets_in_houses"].find((h: any) => h?.house_no === 12)
              : null,
            ketu: astroData["planet_report_ketu"],
            guruTransit: astroData["transit_dates_jupiter"],
            jaiminiKarakas: astroData["jaimini_karakas"],
          };
        } else if (q.includes("fame") || q.includes("recognition")) {
          relevantData = {
            sun: astroData["planet_report_sun"],
            tenthHouse: Array.isArray(astroData["planets_in_houses"])
              ? astroData["planets_in_houses"].find((h: any) => h?.house_no === 10)
              : null,
            rajYogas: Array.isArray(astroData["yoga_list"])
              ? astroData["yoga_list"].filter((y: any) =>
                y?.name?.toLowerCase()?.includes("raja")
              )
              : [],
          };
        }

        // Convert context to safe, compact string
        const contextSummary = JSON.stringify(relevantData, null, 2).slice(0, 4000);

        // 🔮 AI prompt
        const prompt = `
You are an expert Vedic astrologer. Write a clear, predictive answer (6–8 sentences)
for the following question using the provided astro data.

Question: "${question}"

Astro Data (summary):
${contextSummary}

Guidelines:
- Mention relevant planets, dashas, or yogas that influence the topic.
- Explain the overall planetary outlook (positive/neutral/challenging).
- End with one short, practical astrological suggestion.
- Avoid generic phrases like "Without birth details".
`;

        let ans = await callBedrock(prompt, { fullData: relevantData });
        ans = sanitizeText(ans).replace(/[*_~`]/g, "");
        return ans;
      } catch (err) {
        console.error("Answer generation failed:", err);
        if (retryCount < 2) {
          await sleep(1200);
          return generateAnswer(question, astroData, retryCount + 1);
        }
        return `Answer: Unable to generate due to data error.`;
      }
    }

    // ✅ Usage
    await generateQAPDF(doc, "English");
    const essentialAstroData = {
      mangal_dosh: astroData.mangal_dosh,
      kaalsarp_dosh: astroData.kaalsarp_dosh,
      maha_dasha: astroData.maha_dasha,
      antar_dasha: astroData.antar_dasha,
      current_sade_sati: astroData.current_sade_sati,
      find_moon_sign: astroData.find_moon_sign,
      find_sun_sign: astroData.find_sun_sign,
      find_ascendant: astroData.find_ascendant,
      shad_bala: astroData.shad_bala,
      yoga_list: astroData.yoga_list,
      gem_suggestion: astroData.gem_suggestion,
      rudraksh_suggestion: astroData.rudraksh_suggestion,
    };

    const nextstepPrompt = `
You are a Vedic astrologer, life coach, and psychologist.  
Using the data below, write **"Next Steps: Using Insights & Remedies for Personal Growth"** in **3 short, warm, and inspiring paragraphs**.


GUIDELINES:
- Tone: **Empathetic, guiding, and practical.**
- Focus on **personal growth, emotional healing, and self-awareness.**
- Mention how to align with **strong planets** and improve weak ones.
- Suggest 2–3 **simple remedies** (e.g., meditation, gratitude, rituals).
- Avoid horoscope clichés. Make it **personal and actionable**.
- Use **bold** for key traits or advice.
`;

    let nextstepText = await callBedrock(nextstepPrompt, { essentialAstroData });
    nextstepText = sanitizeText(nextstepText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(
      "Next Steps: Using Insights & Remedies for Personal Growth",
      pageWidth / 2,
      60,
      {
        align: "center",
        maxWidth: pageWidth - 50, // leave some margin (25px on each side)
      }
    );
    doc.setTextColor("#a16a21");
    addParagraphss(doc, nextstepText, 50, 140, pageWidth - 100);

    const ConclusionPrompt = `
You are an expert Vedic astrologer and spiritual psychologist.
Generate **"Personalized Astro Guidance & Conclusion"** — a reflective summary of the native’s life path and inner journey.

STYLE & CONTENT REQUIREMENTS:
- Warm, wise, and encouraging tone.
- 3–4 meaningful paragraphs.
- Holistic interpretation: personality, karmic lessons, emotional evolution.
- Gentle guidance for spiritual balance and growth.
- Highlight clarity, acceptance, and empowerment.
- End with an uplifting note or blessing.
- Use **bold** for key insights.
- Avoid repetition or generic text.
`;

    let conclusionText = await callBedrock(ConclusionPrompt, { astroData });
    conclusionText = sanitizeText(conclusionText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(
      "Personalized Astro Guidance & Conclusion",
      pageWidth / 2,
      60,
      {
        align: "center",
        maxWidth: pageWidth - 50, // leave some margin (25px on each side)
      }
    );
    doc.setTextColor("#a16a21");
    addParagraphss(doc, conclusionText, 50, 100, pageWidth - 100);
    // ---------- LAST PAGE: ABOUT TRUSTASTROLOGY.AI (with SVG design) ----------
    const generateAboutCompanyPage = async (doc: jsPDF) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;

      // Add a new page
      doc.addPage();

      // ===== Decorative SVGs (top banner + footer ribbon) =====
      const topBannerSVG = createCosmicBannerSVG(pageWidth, 160);
      const footerRibbonSVG = createFooterRibbonSVG(pageWidth, 120);

      // Add SVGs if plugin available
      try {
        // Top banner (full bleed inside border)
        doc.addImage(topBannerSVG, "SVG", margin, margin, pageWidth - 2 * margin, 160);

        // Footer ribbon
        doc.addImage(footerRibbonSVG, "SVG", margin, pageHeight - margin - 120, pageWidth - 2 * margin, 120);
      } catch {
        // If SVG not supported, just continue with the layout
      }

      // ===== Elegant border =====
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

      // ===== Header =====
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor("#000");
      doc.text("About TrustAstrology.ai", pageWidth / 2, margin + 120, { align: "center" });

      // Subtitle
      doc.setFont("helvetica", "italic");
      doc.setFontSize(15);
      doc.setTextColor("#a16a21");
      doc.text("Blending Ancient Wisdom with Artificial Intelligence", pageWidth / 2, margin + 140, { align: "center" });

      // ===== Body Copy =====
      const bodyText = `
TrustAstrology.ai (TrustAstrology) is a cutting-edge AI-powered astrology platform. Our mission is to blend ancient astrological wisdom with modern artificial intelligence to provide accurate, personalized guidance for our users. With TrustAstrology, anyone can explore insights into their life's questions through an intuitive, private, and 24/7 available AI astrologer.

Our services encompass a wide range of astrological and spiritual services, all accessible online. Whether you're seeking a detailed horoscope reading, a palmistry analysis, numerology, Vastu Shastra tips for your home, relationship compatibility reports, or even AI-based face reading insights, TrustAstrology has you covered. We leverage advanced technology and reputable astrological data sources to generate real-time predictions and advice tailored to your unique profile.

At TrustAstrology, we value trust, accuracy, and user privacy. Our system is unbiased and non-judgmental—ask anything freely and confidentially. We are constantly learning and improving, updating our algorithms with the latest celestial data and user feedback. Our goal is to empower you with cosmic insights for better decision-making in life, love, career, and more—conveniently and affordably.

Join us on a journey to connect technology with the cosmos, and experience astrology like never before.
`;

      addParagraphsWithStyle(doc, bodyText, margin + 25, margin + 170, pageWidth - 2 * (margin + 25), 20, 14, "#333");

      // ===== Signature line =====
      doc.setDrawColor("#d4af37");
      doc.setLineWidth(0.6);
      doc.line(margin + 40, pageHeight - margin - 80, pageWidth - margin - 40, pageHeight - margin - 80);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor("#000");
      doc.text("— The TrustAstrology.ai Team", pageWidth / 2, pageHeight - margin - 58, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      doc.text("Empowering your journey through AI and astrology", pageWidth / 2, pageHeight - margin - 38, { align: "center" });
    };

    // ---------- Helpers ----------

    // Paragraph wrapper with word-wrap + page overflow handling
    function addParagraphsWithStyle(
      doc: jsPDF,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight = 20,
      fontSize = 14,
      color = "#333"
    ) {
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const bottomLimit = pageHeight - margin - 130; // leave room for footer SVG & signature

      doc.setFont("times", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(color);

      const words = text.trim().split(/\s+/);
      let line = "";
      let cursorY = y;

      const flushLine = () => {
        if (!line) return;
        doc.text(line, x, cursorY);
        line = "";
        cursorY += lineHeight;
      };

      for (let i = 0; i < words.length; i++) {
        const test = line + words[i] + " ";
        // Using getTextWidth on current font/size
        if (doc.getTextWidth(test) > maxWidth) {
          flushLine();
          line = words[i] + " ";
          // Handle page overflow (unlikely on this last page, but safe)
          if (cursorY > bottomLimit) {
            doc.addPage();
            // draw soft border on overflow pages to keep style consistent
            doc.setDrawColor("#e8d8bd");
            doc.setLineWidth(1);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
            cursorY = margin + 60;
          }
        } else {
          line = test;
        }
      }
      if (line) flushLine();
    }

    // Creates a starry gradient banner with subtle constellations + logo glyph
    function createCosmicBannerSVG(width: number, height: number): string {
      // Keep it responsive using viewBox; use golden accents & subtle stars
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0c1a"/>
      <stop offset="100%" stop-color="#1a1c33"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>
    <style>
      .star{ fill:#fff; opacity:.9 }
      .sml{ opacity:.65 }
      .gold{ stroke:#d4af37; stroke-width:1.2; fill:none; opacity:.7 }
      .gold-dot{ fill:#d4af37; opacity:.85 }
      .title{ fill:#f7f2e8; font-family: Helvetica, Arial, sans-serif; font-weight:700; }
      .tag{ fill:#d4af37; font-family: Helvetica, Arial, sans-serif; font-style:italic; }
    </style>
  </defs>

  <!-- background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#g1)"/>
  <ellipse cx="${width / 2}" cy="${height * 0.55}" rx="${width * 0.45}" ry="${height * 0.9}" fill="url(#glow)"/>

  <!-- scattered stars -->
  ${generateStars(width, height, 70, 2)}
  ${generateStars(width, height, 80, 1, true)}

  <!-- simple constellation lines -->
  ${constellationPath(width * 0.15, height * 0.35, 7, width * 0.12, height * 0.18)}
  ${constellationPath(width * 0.72, height * 0.25, 6, width * 0.1, height * 0.16)}

  <!-- center glyph logo (stylized astro + AI node orbit) -->
  <g transform="translate(${width / 2}, ${height * 0.52})">
    <circle r="${Math.min(width, height) * 0.07}" fill="none" stroke="#d4af37" stroke-width="2.5"/>
    <ellipse rx="${Math.min(width, height) * 0.11}" ry="${Math.min(width, height) * 0.04}" fill="none" stroke="#d4af37" stroke-width="1.5" transform="rotate(-15)"/>
    <ellipse rx="${Math.min(width, height) * 0.11}" ry="${Math.min(width, height) * 0.04}" fill="none" stroke="#d4af37" stroke-width="1.5" transform="rotate(15)"/>
    <circle r="3.2" fill="#d4af37"/>
  </g>

  <!-- optional heading inside banner (kept subtle; main text is drawn by jsPDF) -->
  <text x="${width / 2}" y="${height * 0.22}" text-anchor="middle" class="title" font-size="18">TrustAstrology.ai</text>
  <text x="${width / 2}" y="${height * 0.22 + 18}" text-anchor="middle" class="tag" font-size="12">Cosmic Intelligence, Human Clarity</text>
</svg>`;
    }

    // Ribbon footer with repeating celestial motif
    function createFooterRibbonSVG(width: number, height: number): string {
      const h = height;
      const w = width;
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2a2540"/>
      <stop offset="100%" stop-color="#1b1630"/>
    </linearGradient>
    <pattern id="motif" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="30" r="1.6" fill="#d4af37" opacity=".8"/>
      <path d="M10 30 Q30 8 50 30" stroke="#baa15a" stroke-width="0.8" fill="none" opacity=".55"/>
      <path d="M10 30 Q30 52 50 30" stroke="#baa15a" stroke-width="0.8" fill="none" opacity=".55"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#rb)"/>
  <rect x="${w * 0.02}" y="${h * 0.18}" width="${w * 0.96}" height="${h * 0.64}" rx="${h * 0.12}" fill="url(#motif)" opacity="0.35"/>
  <rect x="${w * 0.02}" y="${h * 0.18}" width="${w * 0.96}" height="${h * 0.64}" rx="${h * 0.12}" fill="none" stroke="#d4af37" stroke-width="1.4" opacity="0.8"/>
</svg>`;
    }

    // --- tiny SVG generators used above ---
    function generateStars(w: number, h: number, count: number, size = 2, small = false): string {
      const r = size;
      let s = "";
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const cls = small ? "sml star" : "star";
        const rr = small ? r * 0.6 : r;
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(Math.random() * rr * 0.7 + rr * 0.3).toFixed(2)}" class="${cls}"/>`;
      }
      return s;
    }

    function constellationPath(sx: number, sy: number, nodes: number, spreadX: number, spreadY: number): string {
      let pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < nodes; i++) {
        pts.push({
          x: sx + (Math.random() - 0.5) * spreadX * 2,
          y: sy + (Math.random() - 0.5) * spreadY * 2,
        });
      }
      let lines = "";
      for (let i = 0; i < pts.length - 1; i++) {
        lines += `<line x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${pts[i + 1].x.toFixed(1)}" y2="${pts[i + 1].y.toFixed(1)}" class="gold"/>`;
      }
      const dots = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.8" class="gold-dot"/>`).join("");
      return `<g>${lines}${dots}</g>`;
    }

    await generateAboutCompanyPage(doc);
    // --- Save PDF ---
    const fileName = `Cosmic_Report_${name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    return {
      success: true,
      fileName,
      message: "Report generated successfully with Avakahada Chakra table and AI-generated content"
    };

  } catch (err: unknown) {
    console.error("Error generating report:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
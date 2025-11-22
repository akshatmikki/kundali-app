import { jsPDF } from "jspdf";
import { generateReusableTableContent } from "./ReusableTableContent";
import "../../public/fonts/NotoSans-VariableFont_wdth,wght-normal.js";
import { readAstroJSON } from "@/server/readastrofile";
import removeMarkdown from "remove-markdown";
import { start } from "repl";
import { ToolChoice } from "@aws-sdk/client-bedrock-runtime";
console.log("📄 Loaded CosmicDMReport_Fixed.tsx");
window.DEBUG_PDF = [];
// ========================================
// 🔥 FIXED TOC & OUTLINE SYSTEM
// ========================================
interface MahaDasha {
  dasha: string;
  dasha_start_year: string;
  dasha_end_year: string;
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

// function sanitizeText(text: string): string {
//   return text
//     // Fix artifacts like t�h�e� => the
//     .replace(/([a-zA-Z])[\u0000-\u001F\u200B-\u206F\uFEFF\u00AD\uFFFD�]+([a-zA-Z])/g, "$1$2")

//     // ✅ Preserve real " & " (with spaces around it)
//     .replace(/(\s)&(\s)/g, "$1__AMP_PLACEHOLDER__$2")

//     // ✅ Remove ampersands between letters (e.g., p&r&a&c&t&i&c&e => practice)
//     .replace(/([a-zA-Z])&(?=[a-zA-Z])/g, "$1")
//     .replace(/&(?=[a-zA-Z])/g, "")
//     .replace(/([a-zA-Z])&/g, "$1")

//     // Remove any leftover isolated ampersands
//     .replace(/&+/g, "")

//     // Restore preserved " & "
//     .replace(/__AMP_PLACEHOLDER__/g, "&")

//     // Remove known HTML entities (&amp;, &#160;, etc.)
//     .replace(/&[a-zA-Z#0-9]+;/g, "")

//     // Convert smart quotes and dashes to ASCII
//     .replace(/[“”«»„]/g, '"') // Double quotes
//     .replace(/[‘’‚‛]/g, "'")  // Single quotes
//     .replace(/[–—―−]/g, "-")  // Dashes
//     .replace(/[•∙·⋅]/g, "*")  // Bullets
//     .replace(/[…]/g, "...")   // Ellipsis
//     .replace(/[°º˚]/g, "°")   // Degrees
//     .replace(/[×✕✖]/g, "x")   // Multiplication signs
//     .replace(/[‐-‒⁃]/g, "-")  // Hyphen variants

//     // Remove invisible or special spacing chars
//     .replace(/[\u200B-\u200F\uFEFF\u034F\u061C\u00AD]/g, "")

//     // Normalize composed form
//     .normalize("NFKC")

//     // Remove non-text control characters
//     .replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, "")

//     // Collapse multiple spaces/newlines
//     .replace(/[ \t]+/g, " ")
//     .replace(/\s*\n\s*/g, "\n")

//     // Trim final whitespace
//     .trim();
// }

// const PLANETS = [
//   "Sun",
//   "Moon",
//   "Mars",
//   "Mercury",
//   "Jupiter",
//   "Venus",
//   "Saturn",
//   "Rahu",
//   "Ketu",
// ];

// async function callBedrock(prompt: string, jsonData: any) {
//   const res = await fetch("/api/bedrock", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ prompt, jsonData }),
//   });

//   const text = await res.text();

//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (err) {
//     console.error("❌ Non-JSON response from /api/bedrock:", text);
//     throw new Error("Server did not return valid JSON.");
//   }

//   if (!res.ok) {
//     throw new Error(data.error || "Bedrock API failed.");
//   }

//   // 🧩 Handle both string and object message formats
//   let message =
//     typeof data.message === "string"
//       ? data.message
//       : data.message?.text ||
//       data.message?.outputText ||
//       JSON.stringify(data.message, null, 2) || // fallback
//       "";

//   // 🧹 Clean reasoning tags if message is a string
//   if (typeof message === "string") {
//     message = message.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, "").trim();
//   }


//   console.log("✅ Normalized Bedrock message:", message);
//   return message;
// }

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

function debugLog(message: string, data?: any) {
  const entry = { message, data, timestamp: new Date().toISOString() };
  window.DEBUG_PDF.push(entry);
  console.log(message, data); // Still log to console

  // Also append to page for visibility
  const debugDiv = document.getElementById('pdf-debug') || (() => {
    const div = document.createElement('div');
    div.id = 'pdf-debug';
    div.style.cssText = 'position:fixed;top:0;right:0;width:400px;height:100vh;overflow:auto;background:#000;color:#0f0;font-family:monospace;font-size:10px;padding:10px;z-index:99999;';
    document.body.appendChild(div);
    return div;
  })();

  const logLine = document.createElement('div');
  logLine.textContent = `${message} ${data ? JSON.stringify(data) : ''}`;
  debugDiv.appendChild(logLine);
  debugDiv.scrollTop = debugDiv.scrollHeight;
}
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

function drawTOCPage(doc, tocLines, startLineIndex, linesPerPage) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 110;

  // --- Always draw border for TOC pages ---
  const margin = 25;
  doc.setDrawColor("#a16a21");
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageWidth - 50, "S");

  // --- TOC Title (top of each TOC page) ---
  doc.setFont("NotoSans-VariableFont_wdth,wght", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text("TABLE OF CONTENTS", pageWidth / 2, 70, { align: "center" });

  // --- Print all lines ---
  for (let i = 0; i < linesPerPage; i++) {
    const line = tocLines[startLineIndex + i];
    if (!line) break;

    const trimmed = line.trim();
    const dotCount = (trimmed.match(/\./g) || []).length;

    if (/^\d+\./.test(trimmed) && dotCount === 1) {
      doc.setFontSize(20);
      doc.setFont("NotoSans-VariableFont_wdth,wght", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(trimmed, marginX, y);
      y += 28;
    } else if (/^\d+\.\d+/.test(trimmed)) {
      doc.setFontSize(14);
      doc.setFont("NotoSans-VariableFont_wdth,wght", "normal");
      doc.setTextColor("#a16a21");
      doc.text(trimmed, marginX + 12, y);
      y += 20;
    } else {
      doc.setFontSize(14);
      doc.setFont("NotoSans-VariableFont_wdth,wght", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(trimmed, marginX, y);
      y += 20;
    }
  }
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
    "Sun", "Moon", "Mars", "Mercury", "Jupiter",
    "Venus", "Saturn", "Rahu", "Ketu",
  ];

  // === Helper: Draw Border & Header ===
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

  // === SECTION 3.1–3.5: Sequential Planet Generation ===
  for (const planetName of PLANETS) {
    const nameKey = planetName.toLowerCase();
    const planetReport = AstroData[`planet_report_${nameKey}`];
    if (!planetReport) continue;

    const combinedData = {
      planetReport,
      retroData: AstroData[`retrogrades_${nameKey}`],
      transitData: AstroData[`transit_dates_${nameKey}`],
      aspectData: AstroData[`planetary_aspects_planets`],
      planetdetails: AstroData[`planet_details`],
      shad_bala: AstroData.shad_bala,
      maha_dasha: AstroData.maha_dasha,
      antar_dasha: AstroData.antar_dasha,
    };

    const prompt = `
You are an expert Vedic astrologer and cosmic storyteller.

Using the provided astro data, write a concise, highly relevant **250–350 word** report on ${planetName} in the native's birth chart.

STRICT RULES:
- Do NOT include KP astrology.
- Do NOT include cusps or Placidus/KP houses.
- No divisional charts (D9, D10, etc.)
- No repetitive or generic content.
- Insights must stay directly relevant to the provided astro data.

Use XML-style tags EXACTLY like this structure:

<<<heading>>> ${planetName} – Key Insights
<content>
<li><b>Role of ${planetName}:</b> Describe its natural significance and importance.</li>
<li><b>Placement Meaning:</b> Interpret sign + house placement.</li>
<li><b>Strengths & Weaknesses:</b> Based on dignity, aspects, retrograde state, shadbala, etc.</li>
<li><b>Life Impact:</b> How it influences personality, relationships, career, finances, health.</li>
<li><b>Remedies:</b> Provide 2–3 simple, practical remedies.</li>
</content>

Formatting Rules:
- Use ONLY <li> and <b> for structure.
- NO markdown, NO asterisks, NO extra formatting.
- Avoid long stories or philosophy.
- Keep the tone practical, sharp, and astrologically accurate.

Write in ${userData.language || "English"}.
`;

    let text = "";
    try {
      text = await callBedrock(prompt, combinedData);
      text = sanitizeText(text);
    } catch {
      text = `Report for ${planetName} could not be generated.`;
    }
    startSection(doc, `${planetName} Report`, `${planetName} Report`);
    // === PDF Page Setup ===
    doc.addPage();
    markSectionPage(doc);
    addHeaderFooter(doc, doc.getNumberOfPages());
    drawBorder();

    // Title
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`${planetName} Report`, pageWidth / 2, 70, { align: "center" });

    // Image
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
    } catch { }

    let cursorY = imageY + imageHeight + 40;
    const lineHeight = 20;
    const usableWidth = contentWidth - 30;

    // === Parse & Render ===
    const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
    const segments = text.split(tagRegex).filter(Boolean);
    let currentTag = null;

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      if (trimmed === "<<<heading>>>") { currentTag = "heading"; continue; }
      if (trimmed === "<<subheading>>") { currentTag = "subheading"; continue; }
      if (trimmed === "<content>") { currentTag = "content"; continue; }
      if (trimmed === "</content>") { currentTag = null; continue; }

      // === Headings ===
      if (currentTag === "heading") {
        const cleanHeading = trimmed.replace(/\*/g, "").replace(/_/g, "");
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(20);
        doc.setTextColor("#000");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);

        const wrappedHeading = doc.splitTextToSize(cleanHeading, usableWidth);
        wrappedHeading.forEach((line: string) => {
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.text(line, pageWidth / 2, cursorY, { align: "center" });
          cursorY += lineHeight * 1.1;
        });

        cursorY += lineHeight * 0.5;
        currentTag = null;
      }

      // === Subheadings ===
      else if (currentTag === "subheading") {
        const cleanSub = trimmed.replace(/\*/g, "").replace(/_/g, "");
        doc.setFont("NotoSans", "semibold");
        doc.setFontSize(17);
        doc.setTextColor("#a16a21");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);

        const wrappedSub = doc.splitTextToSize(cleanSub, usableWidth);
        wrappedSub.forEach((line: string) => {
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.text(line, pageWidth / 2, cursorY, { align: "center" });
          cursorY += lineHeight * 1.1;
        });

        cursorY += lineHeight * 0.3;
        currentTag = null;
      }

      // === Content ===
      else if (currentTag === "content") {
        const listItems = trimmed.split(/<\/?li>/).filter((t) => t.trim() !== "");
        for (let item of listItems) {
          item = item.trim();
          if (!item) continue;

          const boldParts = item.split(/<\/?b>/);
          const lineParts = [];
          let isBold = false;
          for (const part of boldParts) {
            if (part.trim() === "") {
              isBold = !isBold;
              continue;
            }
            lineParts.push({ text: part.trim(), bold: isBold });
            isBold = !isBold;
          }

          const x = marginX + 20;
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.setFont("NotoSans", "normal");
          doc.setFontSize(15);
          doc.setTextColor("#a16a21");
          doc.text("•", x - 8, cursorY);

          for (const part of lineParts) {
            const wrappedLines = doc.splitTextToSize(
              part.text.replace(/\*/g, "").replace(/_/g, ""),
              usableWidth - 10
            );
            for (const wrappedLine of wrappedLines) {
              cursorY = addNewPageIfNeeded(cursorY, lineHeight);
              doc.setFont("NotoSans", part.bold ? "bold" : "normal");
              doc.text(wrappedLine, x, cursorY);
              cursorY += lineHeight * 0.9;
            }
          }
          cursorY += lineHeight * 0.4;
        }
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
 * Generate a pure SVG Kundli (North Indian style) with Rāśi numbers and planet names.
 * Text is clipped so it never overflows outside the house diamond shape.
 */
function generateKundliSVG(chartObj: Record<string, any>, size = 500): string {
  const houses: string[][] = Array.from({ length: 12 }, () => []);
  const rasiNos: (number | null)[] = Array(12).fill(null);

  // Fill planet data for each Rāśi
  Object.keys(chartObj).forEach((k) => {
    if (!/^\d+$/.test(k)) return;
    const p = chartObj[k];
    const name = p.name || p.full_name || "";
    const display = p.retro ? `${name}(R)` : name;
    const rasiIndex =
      typeof p.house === "number" ? p.house - 1 : Number(p.house) - 1;
    if (rasiIndex >= 0 && rasiIndex < 12) {
      houses[rasiIndex].push(display);
      if (p.rasi_no != null && !rasiNos[rasiIndex]) rasiNos[rasiIndex] = p.rasi_no;
    }
  });

  // Static 1–12 labels (outer)
  const rasiNumbers = Array.from({ length: 12 }, (_, i) => ((i + 1) % 12) || 12);

  // Planet text anchor points (fixed for 500x500)
  const coords = [
    { x: 250, y: 125 }, { x: 125, y: 35 }, { x: 35, y: 125 },
    { x: 125, y: 250 }, { x: 35, y: 375 }, { x: 125, y: 460 },
    { x: 250, y: 375 }, { x: 375, y: 460 }, { x: 465, y: 375 },
    { x: 375, y: 250 }, { x: 465, y: 125 }, { x: 375, y: 35 }
  ];

  const stroke = "rgba(150,95,48,1)";
  const strokeWidth = 5;
  const planetFont = "15";
  const rasiFont = "18";

  // --- Clip paths (rectangles safely inside each house) ---
  // These are conservative boxes so text won't cross lines.
  const CLIP_W = 120;
  const CLIP_H = 70;
  const rasiClipDefs = coords
    .map((c, i) => {
      const x = c.x - CLIP_W / 2;
      const y = c.y - CLIP_H / 2;
      return `<clipPath id="clip-house-${i}">
        <rect x="${x}" y="${y}" width="${CLIP_W}" height="${CLIP_H}" rx="6" ry="6" />
      </clipPath>`;
    })
    .join("");

  // Planet text (clipped per house)
  const houseTexts = houses
    .map((items, i) => {
      const lines = items.slice(0, 4);
      const tspans = lines
        .map(
          (t, idx) =>
            `<tspan x="${coords[i].x}" dy="${idx === 0 ? "0" : "1.2em"}">${escapeXml(
              t
            )}</tspan>`
        )
        .join("");
      return `<g clip-path="url(#clip-house-${i})">
        <text x="${coords[i].x}" y="${coords[i].y}" font-family="'Poppins','Arial',sans-serif"
              font-weight="600" font-size="${planetFont}" fill="rgb(68,68,68)"
              text-anchor="middle">${tspans}</text>
      </g>`;
    })
    .join("");

  // Outer static rasi number positions
  const rasiPositions = [
    { x: 250, y: 70 }, { x: 180, y: 50 }, { x: 70, y: 100 },
    { x: 80, y: 250 }, { x: 70, y: 400 }, { x: 180, y: 445 },
    { x: 250, y: 430 }, { x: 320, y: 445 }, { x: 430, y: 400 },
    { x: 420, y: 250 }, { x: 430, y: 100 }, { x: 320, y: 50 }
  ];

  const rasiTexts = rasiPositions
    .map(
      (pos, i) => `
        <text x="${pos.x}" y="${pos.y}" font-family="'Poppins','Arial',sans-serif"
              font-size="${rasiFont}" font-weight="700"
              fill="${stroke}" text-anchor="middle">${rasiNumbers[i]}</text>`
    )
    .join("");

  // Actual rasi_no (from data) — also clipped to the house
  const actualRasiTexts = coords
    .map((pos, i) => {
      const rno = rasiNos[i];
      if (rno == null) return "";
      // place near top-right within the same clip
      const rx = pos.x + CLIP_W / 2 - 6;   // 6px padding inside box
      const ry = pos.y - CLIP_H / 2 + 16;  // 16px down for baseline
      return `<g clip-path="url(#clip-house-${i})">
        <text x="${rx}" y="${ry}" font-family="'Poppins','Arial',sans-serif"
              font-size="14" font-weight="700"
              fill="#b25713" text-anchor="end">♈ ${rno}</text>
      </g>`;
    })
    .join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 500 500">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#fff9ee"/>
        <stop offset="60%" stop-color="#f3e0b5"/>
        <stop offset="100%" stop-color="#e6cda0"/>
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="rgba(0,0,0,0.25)" />
      </filter>
      ${rasiClipDefs}
    </defs>

    <rect width="100%" height="100%" rx="20" ry="20" fill="url(#bg)" filter="url(#shadow)" />

    <!-- Chart Lines -->
    <line x1="0" y1="0" x2="500" y2="500" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="500" y1="0" x2="0" y2="500" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="250" y1="0" x2="0"   y2="250" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="250" y1="0" x2="500" y2="250" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="250" y1="500" x2="500" y2="250" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="250" y1="500" x2="0"   y2="250" stroke="${stroke}" stroke-width="${strokeWidth}" />

    <!-- Rāśi Outer Numbers -->
    ${rasiTexts}

    <!-- Actual Rāśi Numbers (from data) -->
    ${actualRasiTexts}

    <!-- Planet Names -->
    ${houseTexts}
  </svg>`.trim();

  return svg;
}

// Escape XML safely
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
const DIVISIONAL_CHART_TITLES: Record<string, string> = {
  D1: "Birth Chart (D1)",
  D2: "Hora Chart (D2 – Wealth)",
  D3: "Drekkana (D3 – Siblings & Courage)",
  D4: "Chaturthamsa (D4 – Property & Mother)",
  D5: "Panchamsa (D5 – Power, Talent, Fame)",
  D7: "Saptamsa (D7 – Children)",
  D8: "Ashtamsa (D8 – Longevity & Transformation)",
  D9: "Navamsa (D9 – Marriage, Dharma)",
  D10: "Dasamsa (D10 – Career)",
  D12: "Dwadasamsa (D12 – Parents)",
  D16: "Shodasamsa (D16 – Comforts)",
  D20: "Vimsamsa (D20 – Spiritual)",
  D24: "Chaturvimshamsa (D24 – Education)",
  D27: "Bhamsha (D27 – Strengths)",
  D30: "Trimsamsa (D30 – Misfortune)",
  D40: "Khavedamsa (D40 – Maternal Lineage)",
  D45: "Akshavedamsa (D45 – Paternal Lineage)",
  D60: "Shashtiamsa (D60 – Karma)",

  chalit: "Chalit Chart (General House Correction)",
  kp_chalit: "KP Chalit Chart",
  sun: "Sun Chart",
  moon: "Moon Chart",
  transit: "Transit Chart (Gochar)"
};


async function addAllDivisionalChartsFromAstroData(
  doc: jsPDF,
  chartList: { chart_name: string; data: Record<string, any> }[],
  astroData: Record<string, any>
) {
  const chartsPerPage = 2;
  const imgWidth = 340;
  const imgHeight = 300;
  const spacingY = 50;
  const marginTop = 120;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const borderMargin = 25;
  const textColor = "#a16a21";

  // Convert chart list to usable objects
  const divisionalCharts: DivisionalChart[] = chartList
    .map((item) => {
      if (!item.data) return null;

      const chartNum = parseInt(item.chart_name.replace(/[^0-9]/g, ""), 10) || 0;
      return {
        chart_name: item.chart_name.toUpperCase(),
        chart_num: chartNum,
        chart_data: item.data,
      };
    })
    .filter((x): x is DivisionalChart => x !== null);

  // Sort numerically (D1 → D2 → D9 → etc.)
  divisionalCharts.sort((a, b) => a.chart_num - b.chart_num);

  // Draw border helper
  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(borderMargin, borderMargin, pageWidth - 2 * borderMargin, pageHeight - 2 * borderMargin);
  };

  // MAIN LOOP
  for (let i = 0; i < divisionalCharts.length; i++) {
    const chart = divisionalCharts[i];

    // Start a new section every chart (like house)
    let cleanName = chart.chart_name.replace(".PNG", "").trim();
    const fullTitle = DIVISIONAL_CHART_TITLES[cleanName] || cleanName;

    // Register correct section name in TOC
    startSection(doc, fullTitle, fullTitle);


    // Add new page for each chart group (2 charts per page)
    if (i === 0 || i % chartsPerPage === 0) {
      doc.addPage();
      markSectionPage(doc);
      addHeaderFooter(doc, doc.getNumberOfPages());
      drawBorder();

      // Big main heading (only once per page)
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#a16a21");
      doc.text("DIVISIONAL CHARTS", pageWidth / 2, 70, { align: "center" });
    }

    // Position inside the page (first or second chart)
    const posInPage = i % chartsPerPage;
    const currentY = marginTop + posInPage * (imgHeight + spacingY);
    const xPos = (pageWidth - imgWidth) / 2;

    // Chart subtitle
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(18);
    doc.setTextColor(textColor);
    cleanName = chart.chart_name.replace(".PNG", "").trim();
    const title = DIVISIONAL_CHART_TITLES[cleanName] || `Chart - ${cleanName}`;

    doc.text(title, pageWidth / 2, currentY - 15, { align: "center" });

    // Render Kundli chart image
    try {
      const svgText = generateKundliSVG(chart.chart_data, 500);
      const base64 = await svgTextToPngBase64(svgText, imgWidth, imgHeight);
      await new Promise((r) => setTimeout(r, 30));
      doc.addImage(base64, "PNG", xPos, currentY, imgWidth, imgHeight);
    } catch (err) {
      console.error(`Error rendering chart ${chart.chart_name}`, err);
      doc.text("Chart could not be loaded", pageWidth / 2, currentY + imgHeight / 2, { align: "center" });
    }
  }

  // Add header/footer to ALL pages at the end
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

  const safe = (val: any) => (val ? val : "Not Available");

  const rasiLords: any = {
    Aries: "Mars",
    Taurus: "Venus",
    Gemini: "Mercury",
    Cancer: "Moon",
    Leo: "Sun",
    Virgo: "Mercury",
    Libra: "Venus",
    Scorpio: "Mars",
    Sagittarius: "Jupiter",
    Capricorn: "Saturn",
    Aquarius: "Saturn",
    Pisces: "Jupiter",
  };

  const getRasiLord = (sign: string) => rasiLords[sign] || "Not Available";

  const ashtakvargaTotals = AstroData?.ashtakvarga?.ashtakvarga_total || [];

  // --------------------------------------------------------------------
  // 🔥 BUILD PERFECT HOUSE OBJECT (NO UNDEFINED EVER)
  // --------------------------------------------------------------------
  const simplifiedHouses = Array.from({ length: 12 }, (_, i) => {
    const houseNo = i + 1;

    const kp = AstroData.kp_houses?.[i] || {};
    const ph = AstroData.planets_in_houses?.[houseNo] || {};

    return {
      house: houseNo,
      sign: safe(ph.zodiac),
      lord: safe(getRasiLord(ph.zodiac)),
      sub_lord: safe(kp.cusp_sub_lord),
      nakshatra: safe(kp.start_nakshatra),
      nakshatra_lord: safe(kp.start_nakshatra_lord),
      planets_in_house: ph.planets || [],
      signification: safe(ph.signification),
      ashtakvarga_points: safe(ashtakvargaTotals[i]),
    };
  });

  // --------------------------------------------------------------------
  // 🔥 PROMPTS BUILDING
  // --------------------------------------------------------------------
  const prompts = simplifiedHouses.map((house) => ({
    house,
    prompt: `
Write a clear, concise, easy-to-understand **House ${house.house} Report** (max 220–280 words)
based ONLY on the following data:

Sign: <b>${house.sign}</b>
Lord: <b>${house.lord}</b>
Sub-lord: <b>${house.sub_lord}</b>
Nakshatra: <b>${house.nakshatra}</b>
Nakshatra Lord: <b>${house.nakshatra_lord}</b>
Ashtakvarga: <b>${house.ashtakvarga_points}</b>
Planets in House: <b>${house.planets_in_house.join(", ") || "None"}</b>
Meaning: <b>${house.signification}</b>

Format strictly using these tags:

<<<heading>>> Overview of House ${house.house}
<content>
<li><b>Meaning:</b> Short simple explanation (1–2 lines).</li>
<li><b>Influence:</b> How the sign + lord affect this house (1–2 lines).</li>
<li><b>Personality Focus:</b> Behavioral effect (1–2 lines max).</li>
</content>

<<<heading>>> Strengths & Remedies
<content>
<li><b>Ashtakvarga:</b> Strength interpretation in 1–2 lines.</li>
<li><b>Planets:</b> Short effects of planets present (skip if none).</li>
<li><b>Remedy:</b> One practical spiritual remedy.</li>
</content>

Rules:
- Use ONLY <li> and <b> tags.
- NO markdown, NO asterisks.
- NO KP, NO cusps, NO Placidus.
- Keep every line short & meaningful.
- Write in ${userData.language || "English"}.
`
  }));

  // --------------------------------------------------------------------
  // 🔥 GENERATE HOUSE TEXT
  // --------------------------------------------------------------------
  const reports = await Promise.all(
    prompts.map(async ({ house, prompt }) => {
      try {
        const aiText = await callBedrock(prompt, { house });
        return { house, text: sanitizeText(aiText) };
      } catch {
        return { house, text: `Report for House ${house.house} could not be generated.` };
      }
    })
  );

  // --------------------------------------------------------------------
  // DRAWING HELPERS
  // --------------------------------------------------------------------
  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY);
  };

  const addNewPageIfNeeded = (cursorY: number, estimated = 40) => {
    if (cursorY + estimated > bottomLimit - 10) {
      doc.addPage();
      addHeaderFooter(doc, doc.getNumberOfPages());
      drawBorder();
      return marginY + 30;
    }
    return cursorY;
  };

  // --------------------------------------------------------------------
  // 🔥 RENDER ALL HOUSES TO PDF
  // --------------------------------------------------------------------
  for (const { house, text } of reports) {
    startSection(doc, `House ${house.house} Report`, `House ${house.house} Report`);
    doc.addPage();
    markSectionPage(doc);
    addHeaderFooter(doc, doc.getNumberOfPages());
    drawBorder();

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`House ${house.house} Report`, pageWidth / 2, 70, { align: "center" });

    // --- IMAGE ---
    const imagePath = `/assets/houses/${house.house}.jpg`;
    const imageY = 100;
    const imageWidth = 230;
    let imageHeight = 0;

    try {
      const img = new Image();
      img.src = imagePath;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const aspect = img.height / img.width;
          imageHeight = imageWidth * aspect;
          doc.addImage(img, "JPG", (pageWidth - imageWidth) / 2, imageY, imageWidth, imageHeight);
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch { }

    let cursorY = imageY + imageHeight + 40;
    const usableWidth = contentWidth - 30;
    const lineHeight = 20;

    const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
    const segments = text.split(tagRegex).filter(Boolean);
    let currentTag = null;

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      if (trimmed === "<<<heading>>>") { currentTag = "heading"; continue; }
      if (trimmed === "<<subheading>>") { currentTag = "subheading"; continue; }
      if (trimmed === "<content>") { currentTag = "content"; continue; }
      if (trimmed === "</content>") { currentTag = null; continue; }

      // === Headings ===
      if (currentTag === "heading") {
        const cleanHeading = trimmed.replace(/\*/g, "").replace(/_/g, "");
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(20);
        doc.setTextColor("#000");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);

        const wrappedHeading = doc.splitTextToSize(cleanHeading, usableWidth);
        wrappedHeading.forEach((line: string) => {
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.text(line, pageWidth / 2, cursorY, { align: "center" });
          cursorY += lineHeight * 1.1;
        });

        cursorY += lineHeight * 0.5;
        currentTag = null;
      }

      // === Subheadings ===
      else if (currentTag === "subheading") {
        const cleanSub = trimmed.replace(/\*/g, "").replace(/_/g, "");
        doc.setFont("NotoSans", "semibold");
        doc.setFontSize(17);
        doc.setTextColor("#a16a21");
        cursorY = addNewPageIfNeeded(cursorY, lineHeight * 2);

        const wrappedSub = doc.splitTextToSize(cleanSub, usableWidth);
        wrappedSub.forEach((line: string) => {
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.text(line, pageWidth / 2, cursorY, { align: "center" });
          cursorY += lineHeight * 1.1;
        });

        cursorY += lineHeight * 0.3;
        currentTag = null;
      }

      // === Content ===
      else if (currentTag === "content") {
        const listItems = trimmed.split(/<\/?li>/).filter((t) => t.trim() !== "");
        for (let item of listItems) {
          item = item.trim();
          if (!item) continue;

          const boldParts = item.split(/<\/?b>/);
          const lineParts = [];
          let isBold = false;
          for (const part of boldParts) {
            if (part.trim() === "") {
              isBold = !isBold;
              continue;
            }
            lineParts.push({ text: part.trim(), bold: isBold });
            isBold = !isBold;
          }

          const x = marginX + 20;
          cursorY = addNewPageIfNeeded(cursorY, lineHeight);
          doc.setFont("NotoSans", "normal");
          doc.setFontSize(15);
          doc.setTextColor("#a16a21");
          doc.text("•", x - 8, cursorY);

          for (const part of lineParts) {
            const wrappedLines = doc.splitTextToSize(
              part.text.replace(/\*/g, "").replace(/_/g, ""),
              usableWidth - 10
            );
            for (const wrappedLine of wrappedLines) {
              cursorY = addNewPageIfNeeded(cursorY, lineHeight);
              doc.setFont("NotoSans", part.bold ? "bold" : "normal");
              doc.text(wrappedLine, x, cursorY);
              cursorY += lineHeight * 0.9;
            }
          }
          cursorY += lineHeight * 0.4;
        }
      }
    }
  }
};

type SectionEntry = {
  title: string;
  anchor: string;
  page: number;
  tocLabel?: string;
  outlineParent?: string;
  finalPage?: number; // not really needed now, but kept for future use
};

const __sectionRegistry: SectionEntry[] = [];

function makeAnchor(title: string) {
  return title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Register a section BEFORE creating content
 */
function startSection(
  doc: jsPDF,
  title: string,
  tocLabel?: string,
  outlineParent?: string
) {
  const anchor = makeAnchor(title);
  const existing = __sectionRegistry.find((s) => s.anchor === anchor);
  if (existing) {
    existing.tocLabel = tocLabel || title;
    existing.outlineParent = outlineParent || existing.outlineParent;
    debugLog("Updated section:", { title: existing.title, page: existing.page, tocLabel: existing.tocLabel });
    return existing;
  }
  const entry: SectionEntry = {
    title,
    anchor,
    page: doc.getNumberOfPages() || 1,
    tocLabel: tocLabel || title,
    outlineParent,
  };
  __sectionRegistry.push(entry);
  debugLog("Registered section:", { title: entry.title, page: entry.page, tocLabel: entry.tocLabel });
  return entry;
}

/**
 * Update section page AFTER doc.addPage() / section content creation
 */
function markSectionPage(doc: jsPDF) {
  const last = __sectionRegistry[__sectionRegistry.length - 1];
  if (!last) return;
  const oldpage = last.page;
  last.page = doc.getNumberOfPages();
  debugLog("Marked section page:", { title: last.title, oldpage: oldpage, newpage: last.page, anchor: last.anchor, tocLabel: last.tocLabel });
}

/**
 * ✅ SAFE: Fill TOC into pre-reserved pages (no page reordering)
 * - Assumes:
 *   - Cover is page 1
 *   - TOC pages are from startPage to endPage (2,3,...)
 *   - Sections in __sectionRegistry already have correct .page
 */
function fillComplexTOC(doc: jsPDF, tocStart: number, tocEnd: number, tocText: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftX = 60;
  const rightX = pageWidth - 60;
  const mainTitleY = 70;
  const lineHeight = 18;

  const lines = tocText.split("\n").map(l => l.trim()).filter(Boolean);

  type TocItem = { number: string; title: string; matches: SectionEntry | null };
  const items: TocItem[] = [];

  const regex = /^(\d+(\.\d+)*)\s+(.*)$/;

  for (const line of lines) {
    const m = line.match(regex);
    if (!m) continue;
    items.push({ number: m[1], title: m[3], matches: null });
  }

  function norm(str: string) {
    return str.toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Extract short title (before em-dash, en-dash, or hyphen with spaces)
  function getShortTitle(fullTitle: string): string {
    const parts = fullTitle.split(/\s+[–—-]\s+/);
    return parts[0].trim();
  }

  // Extract section number from text (e.g., "4.1 Your Emotional Side" → "4.1")
  function extractNumber(text: string): string | null {
    const match = text.match(/^(\d+(\.\d+)*)/);
    return match ? match[1] : null;
  }

  debugLog("\n🔍 === TOC MATCHING DEBUG ===");
  debugLog(`Total TOC items: ${items.length}`);
  debugLog(`Total registered sections: ${__sectionRegistry.length}`);

  // === BULLETPROOF MATCHING ===
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemNorm = norm(item.title);
    const itemShort = getShortTitle(item.title);
    const itemShortNorm = norm(itemShort);

    debugLog(`\n🔎 [${i + 1}/${items.length}] Matching: "${item.number} ${item.title}"`);

    try {
      let bestMatch: SectionEntry | null = null;
      let bestScore = 0;
      let matchReason = "";

      for (const section of __sectionRegistry) {
        const sectionLabel = section.tocLabel || section.title;
        const sectionNorm = norm(sectionLabel);
        const sectionShort = getShortTitle(sectionLabel);
        const sectionShortNorm = norm(sectionShort);
        const sectionNumber = extractNumber(sectionLabel);

        // PRIORITY 1: Exact number + title match (100 points)
        if (sectionNumber === item.number && itemShortNorm === sectionShortNorm) {
          bestMatch = section;
          bestScore = 100;
          matchReason = "exact number + title";
          break; // Perfect match, stop searching
        }

        // PRIORITY 2: Exact number match only (95 points)
        if (sectionNumber === item.number && bestScore < 95) {
          bestMatch = section;
          bestScore = 95;
          matchReason = "exact number";
        }

        // PRIORITY 3: Exact short title match (90 points)
        if (itemShortNorm === sectionShortNorm && bestScore < 90) {
          bestMatch = section;
          bestScore = 90;
          matchReason = "exact short title";
        }

        // PRIORITY 4: Word similarity (70-85 points)
        if (bestScore < 85) {
          const itemWords = itemShortNorm.split(" ").filter(w => w.length > 2 || /^\d+$/.test(w));
          const sectionWords = sectionShortNorm.split(" ").filter(w => w.length > 2 || /^\d+$/.test(w));

          if (itemWords.length > 0 && sectionWords.length > 0) {
            const matchedWords = itemWords.filter(w => sectionWords.includes(w));
            const score = (matchedWords.length / itemWords.length) * 100;

            // Only accept if similarity is high AND lengths are similar
            // Only accept if similarity is high AND lengths are similar
            const lengthRatio = Math.min(itemWords.length, sectionWords.length) /
              Math.max(itemWords.length, sectionWords.length);

            // Require exact match for 100% score (prevents "House 1" matching "House 2")
            if (score === 100 && matchedWords.length === sectionWords.length && score > bestScore) {
              bestMatch = section;
              bestScore = score;
              matchReason = `full word match (${matchedWords.length}/${itemWords.length})`;
            } else if (score >= 80 && lengthRatio >= 0.8 && score > bestScore) {
              bestMatch = section;
              bestScore = score;
              matchReason = `word overlap (${matchedWords.length}/${itemWords.length})`;
            }
          }
        }
      }

      if (bestMatch && bestScore >= 70) {
        item.matches = bestMatch;
        debugLog(`   ✅ MATCHED (${matchReason}, score: ${bestScore.toFixed(0)}): "${getShortTitle(bestMatch.tocLabel || bestMatch.title)}" → page ${bestMatch.page}`);
      } else {
        debugLog(`   ❌ NO MATCH (best score: ${bestScore.toFixed(0)})`);
      }

    } catch (err) {
      debugLog(`   ⚠️ ERROR: ${err}`);
    }
  }

  // === DEBUG SUMMARY ===
  const matchedCount = items.filter(i => i.matches).length;
  debugLog(`\n📊 === MATCHING SUMMARY ===`);
  debugLog(`Matched: ${matchedCount}/${items.length}`);

  const unmatched = items.filter(i => !i.matches);
  if (unmatched.length > 0) {
    debugLog(`\n❌ Unmatched items:`);
    unmatched.forEach(item => {
      debugLog(`   ${item.number} ${item.title}`);
    });
  }

  // Verify no duplicate page assignments
  const pageMap = new Map<number, string[]>();
  items.forEach(item => {
    if (item.matches) {
      const page = item.matches.page;
      if (!pageMap.has(page)) {
        pageMap.set(page, []);
      }
      pageMap.get(page)!.push(`${item.number} ${item.title}`);
    }
  });

  const duplicates = Array.from(pageMap.entries()).filter(([_, items]) => items.length > 1);
  if (duplicates.length > 0) {
    debugLog(`\n⚠️ DUPLICATE PAGE ASSIGNMENTS:`);
    duplicates.forEach(([page, itemTitles]) => {
      debugLog(`   Page ${page}:`);
      itemTitles.forEach(title => debugLog(`      - ${title}`));
    });
  }

  // 🎨 === RENDER THE TOC ===
  let currentPage = tocStart;
  let currentY = mainTitleY + 50;

  doc.setPage(currentPage);

  doc.setDrawColor("#a16a21");
  doc.setLineWidth(1.5);
  doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(28);
  doc.setTextColor("#000");
  doc.text("TABLE OF CONTENTS", pageWidth / 2, mainTitleY, { align: "center" });

  for (const item of items) {
    if (currentY + lineHeight > pageHeight - 70) {
      currentPage++;
      if (currentPage > tocEnd) {
        debugLog(`⚠️ TOC overflow at "${item.number} ${item.title}"`);
        break;
      }

      doc.setPage(currentPage);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");
      currentY = 60;
    }

    const isMainSection = !item.number.includes(".");

    if (isMainSection) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(15);
      doc.setTextColor("#a16a21");
      currentY += 8;
    } else {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#000");
    }

    const displayText = `${item.number} ${item.title}`;
    const maxTextWidth = rightX - leftX - 60;

    let finalText = displayText;
    if (doc.getTextWidth(displayText) > maxTextWidth) {
      finalText = displayText.substring(0, 60) + "...";
    }

    doc.text(finalText, leftX, currentY);

    if (item.matches) {
      const pageNumText = String(item.matches.page);
      const targetPage = item.matches.page;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(13);
      doc.text(pageNumText, rightX, currentY, { align: "right" });

      const textEnd = leftX + doc.getTextWidth(finalText) + 5;
      const dotsStart = textEnd;
      const dotsEnd = rightX - doc.getTextWidth(pageNumText) - 5;

      if (dotsEnd > dotsStart) {
        doc.setLineDash([2, 3]);
        doc.setDrawColor("#ccc");
        doc.setLineWidth(0.5);
        doc.line(dotsStart, currentY - 2, dotsEnd, currentY - 2);
        doc.setLineDash([]);
      }
      const linkWidth = rightX - leftX;
      const linkHeight = lineHeight;
      const linkY = currentY - lineHeight + 4;
      doc.link(leftX, linkY, linkWidth, linkHeight, { pageNumber: targetPage });
    }

    currentY += lineHeight;
  }

  for (let p = tocStart; p <= tocEnd; p++) {
    doc.setPage(p);
    addHeaderFooter(doc, p);
  }

  debugLog(`\n✅ TOC rendering complete`);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function sanitizeText(text: string): string {
  return text
    .replace(/([a-zA-Z])[\u0000-\u001F\u200B-\u206F\uFEFF\u00AD\uFFFD�]+([a-zA-Z])/g, "$1$2")
    .replace(/(\s)&(\s)/g, "$1__AMP_PLACEHOLDER__$2")
    .replace(/([a-zA-Z])&(?=[a-zA-Z])/g, "$1")
    .replace(/&(?=[a-zA-Z])/g, "")
    .replace(/([a-zA-Z])&/g, "$1")
    .replace(/&+/g, "")
    .replace(/__AMP_PLACEHOLDER__/g, "&")
    .replace(/&[a-zA-Z#0-9]+;/g, "")
    .replace(/[""«»„]/g, '"')
    .replace(/[''‚‛]/g, "'")
    .replace(/[–—―−]/g, "-")
    .replace(/[•∙·⋅]/g, "*")
    .replace(/[…]/g, "...")
    .replace(/[°º˚]/g, "°")
    .replace(/[×✕✖]/g, "x")
    .replace(/[‐-‒⁃]/g, "-")
    .replace(/[\u200B-\u200F\uFEFF\u034F\u061C\u00AD]/g, "")
    .normalize("NFKC")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function normalizeBedrockText(xmlText: string): string {
  return xmlText
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n\s*\r?\n/g, "\n")
    .replace(/\s{2,}/g, " ")
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

  let message =
    typeof data.message === "string"
      ? data.message
      : data.message?.text ||
      data.message?.outputText ||
      JSON.stringify(data.message, null, 2) ||
      "";

  if (typeof message === "string") {
    message = message.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, "").trim();
  }

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
  rawText: string,
  startX: number,
  startY: number,
  maxWidth: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const lineHeight = 20;
  const bottomLimit = pageHeight - margin;
  const usableWidth = maxWidth;
  let cursorY = startY;

  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
  };

  const addNewPageIfNeeded = () => {
    if (cursorY + lineHeight > bottomLimit) {
      doc.addPage();
      drawBorder();
      cursorY = margin + 40;
    }
  };

  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!text) return cursorY;

  const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
  const segments = text.split(tagRegex).filter(Boolean);
  let currentTag: string | null = null;

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (trimmed === "<<<heading>>>") {
      currentTag = "heading";
      continue;
    }
    if (trimmed === "<<subheading>>") {
      currentTag = "subheading";
      continue;
    }
    if (trimmed === "<content>") {
      currentTag = "content";
      continue;
    }
    if (trimmed === "</content>") {
      currentTag = null;
      continue;
    }

    // ============================
    // HEADING
    // ============================
    if (currentTag === "heading") {
      const cleanHeading = trimmed.replace(/<\/?[^>]+(>|$)/g, "");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(20);
      doc.setTextColor("#000");

      const wrappedHeading = doc.splitTextToSize(cleanHeading, usableWidth);
      wrappedHeading.forEach((line: string) => {
        addNewPageIfNeeded();
        doc.text(line, pageWidth / 2, cursorY, { align: "center" });
        cursorY += lineHeight * 1.1;
      });

      cursorY += lineHeight * 0.6;
      currentTag = null;
      continue;
    }

    // ============================
    // SUBHEADING
    // ============================
    if (currentTag === "subheading") {
      const cleanSub = trimmed.replace(/<\/?[^>]+(>|$)/g, "");
      doc.setFont("NotoSans", "semibold");
      doc.setFontSize(17);
      doc.setTextColor("#a16a21");

      const wrappedSub = doc.splitTextToSize(cleanSub, usableWidth);
      wrappedSub.forEach((line: string) => {
        addNewPageIfNeeded();
        doc.text(line, pageWidth / 2, cursorY, { align: "center" });
        cursorY += lineHeight * 1.1;
      });

      cursorY += lineHeight * 0.4;
      currentTag = null;
      continue;
    }

    // ============================
    // CONTENT LIST ITEMS
    // ============================
    // ============================
    // CONTENT LIST ITEMS (INLINE BOLD SUPPORT)
    // ============================
    if (currentTag === "content") {

      const listItems = trimmed.split(/<\/?li>/).filter(t => t.trim() !== "");

      for (let item of listItems) {
        item = item.trim();
        if (!item) continue;

        addNewPageIfNeeded();
        doc.setFontSize(15);

        // Draw bullet
        doc.setFont("NotoSans", "normal");
        doc.setTextColor("#a16a21");
        doc.text("•", startX - 8, cursorY);

        // Parse bold inline
        const parts = item.split(/(<b>.*?<\/b>)/g).filter(Boolean);

        let line = "";
        let currentX = startX;
        doc.setTextColor("#000");

        for (let p of parts) {
          const isBold = p.startsWith("<b>") && p.endsWith("</b>");
          const txt = p.replace(/<\/?b>/g, "");

          doc.setFont("NotoSans", isBold ? "bold" : "normal");

          // Split words for inline wrapping
          const words = txt.split(" ");

          for (const word of words) {
            const testLine = line + word + " ";
            const testWidth = doc.getTextWidth(testLine);

            if (testWidth > usableWidth) {
              // Draw current line
              doc.text(line, currentX, cursorY);
              cursorY += lineHeight * 0.9;
              addNewPageIfNeeded();
              line = word + " ";
            } else {
              line = testLine;
            }
          }
        }

        // Draw leftover line
        if (line.trim().length > 0) {
          doc.text(line, currentX, cursorY);
          cursorY += lineHeight * 0.9;
        }

        cursorY += lineHeight * 0.3;
      }
    }
  }

  return cursorY;
}

/* ============================================================
   FIXED addParagraphss — BOLD DOES NOT FORCE NEW PAGE
   ============================================================ */
function addParagraphss(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 14) { const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 25; const bottomLimit = pageHeight - margin; let currentY = y; const drawPageBorder = () => { doc.setDrawColor("#a16a21"); doc.setLineWidth(1.5); doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S"); }; drawPageBorder(); const paragraphs = text.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0); for (const para of paragraphs) { const segments = para.split(/(<b>.*?<\/b>)/g).filter(Boolean); for (const seg of segments) { const isBold = seg.startsWith("<b>") && seg.endsWith("</b>"); const clean = seg.replace(/<\/?b>/g, ""); doc.setFont("NotoSans", isBold ? "bold" : "normal"); doc.setFontSize(16); doc.setTextColor("#a16a21"); const lines = doc.splitTextToSize(clean, maxWidth); const adjustedLineHeight = lineHeight + 4; for (const line of lines) { if (currentY + adjustedLineHeight > bottomLimit) { doc.addPage(); drawPageBorder(); currentY = margin + 20; } doc.text(line, x, currentY); currentY += adjustedLineHeight; } } currentY += 10; } return currentY; }

const addHeaderFooter = (doc: jsPDF, pageNum: number) => {
  if (pageNum === 1) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const prevFont = doc.getFont().fontName;
  const prevStyle = doc.getFont().fontStyle;
  const prevColor = doc.getTextColor();
  const prevSize = doc.getFontSize();

  doc.setFont("Times", "normal");
  doc.setTextColor("#a16a21");
  doc.setFontSize(12);

  doc.text(
    "© 2025 TrustAstrology. All rights reserved.",
    pageWidth / 2,
    pageHeight - 30,
    { align: "center" }
  );

  doc.setFont(prevFont, prevStyle);
  doc.setFontSize(prevSize);
  doc.setTextColor(prevColor);
};

// ========================================
// MAIN PDF GENERATION FUNCTION
// ========================================

export async function generateAndDownloadFullCosmicReportWithTable(
  name: string,
  dob: string,
  time: string,
  place: string,
  userData: UserData
) {
  try {
    // reset section registry for each generation
    __sectionRegistry.length = 0;

    const astroData = await readAstroJSON("astro_data_Saurabh.json");
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ========== COVER PAGE ==========
    startSection(doc, "Cover Page", "Cover");

    const coverImageMale = "/assets/cover_male.jpg";
    const coverImageFemale = "/assets/cover_female.jpg";
    let selectedCoverImage = coverImageMale;
    if (userData?.sex?.toLowerCase() === "female") {
      selectedCoverImage = coverImageFemale;
    }

    try {
      const img = new Image();
      img.src = selectedCoverImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      doc.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
    } catch (error) {
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }


    const marginRight = 50;
    const marginBottom = 40;
    const lineHeight = 26;
    const reportDate = new Date().toLocaleDateString(userData.language || "en-US", {
      year: "numeric",
      month: "long",
    });

    const translations = {
      en: { dob: "DOB", location: "Location not available" },
      hi: { dob: "जन्मतिथि", location: "स्थान उपलब्ध नहीं" },
    } as const;

    type Lang = keyof typeof translations;
    const lang: Lang = (userData?.language as Lang) || "en";
    const t = translations[lang];

    const textLines = [
      `${name || "Unknown"}`,
      `${dob ? t.dob + ": " + dob : "N/A"} ${time || ""}`,
      `${place || t.location}`,
      `${reportDate}`,
    ];

    doc.setTextColor(255, 255, 255);
    const yPos = pageHeight - marginBottom - (textLines.length - 1) * lineHeight;

    textLines.forEach((line, i) => {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(18);
      doc.text(line, pageWidth - marginRight, yPos + i * lineHeight, {
        align: "right",
      });
    });
    // ========= CUSTOM TABLE OF CONTENTS (RESERVE PAGES AFTER COVER) =========
    const tocText = `
1. About You

1.1 Your Basic Birth Details
1.2 Your Lucky Number & Color
1.3 Mulank (Birth Number)
1.4 Bhagyank (Life Path Number)
1.5 Success Number (Name Number)
1.6 Connection Number
1.7 Your Personality Traits
1.8 Chara Karakas & Life Purpose

2. Chart
2.1 Birth Chart (D1)
2.2 Hora Chart (D2 – Wealth)
2.3 Drekkana (D3 – Siblings & Courage)
2.4 Chaturthamsa (D4 – Property & Mother)
2.5 Panchamsa (D5 – Power, Talent, Fame)
2.6 Saptamsa (D7 – Children)
2.7 Ashtamsa (D8 – Longevity & Transformation)
2.8 Navamsa (D9 – Marriage, Dharma)
2.9 Dasamsa (D10 – Career)
2.10 Dwadasamsa (D12 – Parents)
2.11 Shodasamsa (D16 – Comforts)
2.12 Vimsamsa (D20 – Spiritual)
2.13 Chaturvimshamsa (D24 – Education)
2.14 Bhamsha (D27 – Strengths)
2.15 Trimsamsa (D30 – Misfortune)
2.16 Khavedamsa (D40 – Maternal Lineage)
2.17 Akshavedamsa (D45 – Paternal Lineage)
2.18 Shashtiamsa (D60 – Karma)

3. Your Houses

3.1 House 1 Report
3.2 House 2 Report
3.3 House 3 Report
3.4 House 4 Report
3.5 House 5 Report
3.6 House 6 Report
3.7 House 7 Report
3.8 House 8 Report
3.9 House 9 Report
3.10 House 10 Report
3.11 House 11 Report
3.12 House 12 Report

4. Your Planets and Their Impact

4.1 Sun Report
4.2 Moon Report
4.3 Mars Report
4.4 Mercury Report
4.5 Jupiter Report
4.6 Venus Report
4.7 Saturn Report
4.8 Rahu Report
4.9 Ketu Report

5. Love, Emotions & Relationships

5.1 Your Emotional Side
5.2 Your Compatibility
5.3 Your Relationship Style
5.4 Planets of Love
5.5 Marriage & Partnership
5.6 Timing in Love
5.7 Lessons in Love
5.8 Darakaraka & Soulmate Planet

6. Career & Success

6.1 Your Career Strengths
6.2 Ideal Work Style
6.3 Success Factors
6.4 Turning Points
6.5 Your Professional Future

7. Health & Wellbeing

7.1 Overall Health Picture
7.2 Planet Influence on Health
7.3 Mind-Body Connection
7.4 Stress Triggers
7.5 Simple Remedies
7.6 Sade Sati & Mangalik Analysis

8. Life Lessons & Purpose

8.1 Your Life Purpose
8.2 Growth Phases
8.3 Past-Life Connections
8.4 Key Turning Points
8.5 Learning Through Challenges
8.6 Rahu-Ketu Axis

9. Timing & Future Outlook

9.1 Major Life Phases
9.2 Upcoming Events
9.3 Year Ahead Forecast
9.4 Planet Movements
9.5 Overall Outlook

10. Remedies & Positive Actions

10.1 Lucky Stones & Crystals
10.2 Powerful Mantras
10.3 Helpful Rituals
10.4 Good Deeds & Charity
10.5 Protection & Peace Tips

11. Deeper Insights

11.1 Your Strength Map
11.2 Planet Power Levels
11.3 Detailed Life Charts
11.4 Fine Timing Review
11.5 Special Planet Effects
11.6 Raj Yogas & Karmic Doshas

12. Important Timings

12.1 Sunrise & Sunset on Birth Day
12.2 Moonrise & Moonset
12.3 Auspicious Hours
12.4 Planetary Hours

13. Your Personal Guidance

13.1 Common Questions Answered
13.2 Next Steps: Using Insights & Remedies for Personal Growth
13.3 Personalized Astro Guidance & Conclusion
`;

    // decide how many TOC pages we need
    const tocLines = tocText
      .trim()
      .split("\n")
      .filter((l) => l.trim() !== "");

    // ============= FIXED TOC GENERATION =============
    const tocLineHeight = 18;
    const firstLineY = 110;
    const bottomMarginTOC = 60;
    const usableHeight = pageHeight - firstLineY - bottomMarginTOC;
    const linesPerPage = Math.max(1, Math.floor(usableHeight / tocLineHeight));
const tocPageStart = doc.getNumberOfPages() + 1;
    const tocPagesCount = Math.ceil(tocLines.length / linesPerPage);

    let currentLineIndex = 0;

    // --- CREATE TOC PAGES PROPERLY ---
    for (let page = 0; page < tocPagesCount; page++) {
      doc.addPage(); 
      doc.setPage(tocPageStart + page);                        // <---- FIX #1
      drawTOCPage(doc, tocLines, currentLineIndex, linesPerPage);
      currentLineIndex += linesPerPage;
    }

    const tocPageEnd = doc.getNumberOfPages();


    doc.addPage();

    const margin = 25;
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("DISCLAIMER", pageWidth / 2, 60, { align: "center" });

    const disclaimerText = `
Disclaimer for Comprehensive Vedic Astrology Report

This comprehensive astrology report is prepared based on the principles of Vedic Astrology, also known as Jyotisha, an ancient Indian system of understanding the influences of celestial bodies on human life. It is important to understand that this report is intended for informational and guidance purposes only.

Astrology is not an exact science and should not be interpreted as providing definitive or deterministic predictions about the future. Instead, this report offers potential insights into your inherent tendencies, strengths, challenges, and potential life path based on your unique birth chart.

Please be aware that astrological interpretations can vary significantly between different astrologers and across various astrological traditions. The interpretations presented in this report reflect the understanding and expertise of the astrologer who prepared it and may not align perfectly with other interpretations you may encounter.

Any remedies, suggestions, or recommendations provided within this report are offered as potential supportive measures and should not be considered a substitute for professional advice from qualified medical, legal, financial, or psychological professionals.

The results and outcomes described in this report are not guaranteed and may vary significantly from person to person. Individual experiences are influenced by a multitude of factors, including personal choices, environmental influences, and free will.
    `;

    addParagraphss(doc, disclaimerText, 50, 100, pageWidth - 100);

    // ========== AUTHOR MESSAGE ==========
    startSection(doc, "Message from Author", "Author's Message");
    doc.addPage();
    markSectionPage(doc);

    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("MESSAGE FROM THE AUTHOR", pageWidth / 2, 60, { align: "center" });

    const authorText = `
Welcome! I'm absolutely thrilled to present you with your personalized Vedic Astrology report. I truly believe this is more than just a document; it's a map to a deeper understanding of yourself and your place in the grand cosmic design.

For many years, I've been captivated by the ancient wisdom of Vedic Astrology. It started as a personal quest for self-discovery and quickly blossomed into a lifelong passion. I've spent countless hours studying the intricate interplay of planets, signs, and houses, always amazed by the profound insights they offer.

This report is a culmination of my experience, carefully blending ancient Vedic principles with practical, modern-day interpretations. You'll find it delves into the core aspects of your birth chart, revealing your strengths, challenges, and potential.

While this report offers valuable guidance, remember that astrology is a tool, not a definitive answer. Your intuition and personal connection to the information are paramount. Trust your inner wisdom as you explore these insights.

Warmly,
Your Astrologer,
TrustAstrology
    `;

    addParagraphss(doc, authorText, 50, 100, pageWidth - 100);

    // ========== STUDY GUIDE ==========
    startSection(doc, "How to Study This Report", "Study Guide");
    doc.addPage();
    markSectionPage(doc);

    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("BEST WAY TO STUDY THE REPORT", pageWidth / 2, 60, { align: "center" });

    const studyText = `
Unlocking Your Cosmic Blueprint: A Guide to Your Vedic Astrology Report

Welcome to a journey of self-discovery through the wisdom of Vedic astrology! Your personalized report is more than just a document; it's a map to understanding your inherent strengths, potential challenges, and life's purpose.

First Impressions Matter: Don't expect to grasp everything in one sitting. Read your report multiple times, each time with a fresh perspective. The first read provides a general overview, while subsequent readings will unveil deeper nuances.

Layers of Insight: Think of your report as an onion – each layer reveals a new dimension of understanding. Start with the broad interpretations of planets and houses, then delve into the more specific aspects.

Cultivate Calm & Focus: Before diving in, create a quiet and peaceful environment. Take a few deep breaths, clear your mind, and approach the report with an open heart.

Note-Taking and Reflection: Actively engage with the report. Take notes on key insights, recurring themes, and areas that resonate with you. Reflect on how these insights relate to your experiences.

Practical Application is Key: Don't just read the report – apply its guidance! Use this knowledge to make conscious choices that align with your true self.
    `;

    addParagraphss(doc, studyText, 50, 100, pageWidth - 100);
    //  startSection(doc, "Disclaimer", "Disclaimer");
    // ========== BASIC TABLE ==========
    startSection(doc, "Your Basic Birth Details", "Your Basic Birth Details");
    await generateReusableTableContent({
      doc,
      astroData,
      userData: userData,
      title: "AVAKAHADA CHAKRA",
      showUserInfo: true
    });
    markSectionPage(doc);

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

Use the provided data (nakshatra, planet_details, gem_suggestion) below.
Whenever you use any data (like Nakshatra name, planet name, gemstone, number, or color), 
automatically wrap it in <b>...</b> tags.

Tone: spiritual, elegant, poetic but informative.

FORMATTING RULES:
- Use <b>...</b> HTML tags around important words like planets (Sun, Moon, Mars, Jupiter, Venus, etc.), 
  numbers (1–9), colors, gemstones, and key traits (Confidence, Harmony, Energy, Balance, Wisdom, etc.).
- Do NOT use markdown (** or *).
- Output must be plain text with <b> tags only for emphasis.
- Do not write headings or labels — only narrative paragraphs.

DATA:
${JSON.stringify(minimalAstroData, null, 2)}
`;

    const response = await callBedrock(fullPrompt, { minimalAstroData });
    // debugLog("RAW BEDROCK:", response);

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

    // debugLog("After cleaning:", text);

    startSection(doc, "Your Lucky Number & Color", "Your Lucky Number & Color");
    doc.addPage();
    markSectionPage(doc);
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.text("Lucky Number & Color (Nakshatra Based)", pageWidth / 2, 70, { align: "center" });

    addParagraphss(doc, text, 50, 100, pageWidth - 100);
    // doc.addPage();
    const numerologySections = [
      "Mulank (Birth Number): Explain the influence of the Birth Number (radical_number) and its ruling planet (radical_ruler), personality traits, thinking patterns, emotional tendencies, favorable colors, metals, gemstones, friendly numbers, favorite deity, and mantra. End with how this number defines the person’s core identity and how to strengthen it.",
      "Bhagyank (Life Path Number): Describe the meaning of the Life Path (destiny) number — the person’s purpose, karmic journey, strengths, and challenges. Mention its harmony or contrast with the Birth Number and conclude with a practical insight for alignment.",
      "Success Number (Name Number): Explain how the name number influences career success, fame, and personal magnetism. Discuss compatibility using friendly, evil, and neutral numbers. Conclude with insights on how name vibrations affect destiny.",
      "Connection Number: Analyze the relationship between Birth, Destiny, and Name Numbers. Include the Personal Day Number interpretation and offer guidance for balancing energies using gemstones, colors, or affirmations. End with a motivational summary of their overall vibration."
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

GUIDELINES:
- Write in 2–4 elegant, flowing paragraphs (no bullet points, no lists).
- Tone: warm, premium, spiritual, and professional.
- Explain the influence of the number — its ruling planet, key personality traits, 
  emotional nature, strengths, friendly and challenging numbers, lucky colors, 
  suitable gemstones, and guiding energy.
- End with an uplifting line about harmony and personal growth.

FORMATTING RULES:
- Use <b>...</b> HTML tags around important elements such as:
  • Number names (e.g., <b>Number 3</b>, <b>Life Path 5</b>)
  • Planet names (e.g., <b>Jupiter</b>, <b>Saturn</b>)
  • Core qualities (e.g., <b>Confidence</b>, <b>Wisdom</b>, <b>Creativity</b>)
  • Key words (e.g., <b>Lucky Color</b>, <b>Gemstone</b>, <b>Purpose</b>)
- Avoid markdown symbols or tables.
- Output only formatted narrative paragraphs.
`;


      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      text = removeMarkdown(text);
      return text;
    }

    for (const sectionPrompt of numerologySections) {
      const texts = await fetchNumerologySection(sectionPrompt);
      const sectionTitle = sectionPrompt.split(":")[0].trim();
      startSection(doc, `${sectionTitle}`, `${sectionTitle}`);
      doc.addPage();
      markSectionPage(doc);
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
- Warm, elegant, human-centered tone.
- 2–3 smooth paragraphs (no bullet points).
- Focus on emotional depth, thinking patterns, and core nature.

FORMATTING RULES:
- Use <b>...</b> HTML tags around key traits and characteristics such as:
  <b>Confidence</b>, <b>Empathy</b>, <b>Determination</b>, <b>Creativity</b>, <b>Discipline</b>, <b>Intuition</b>.
- Bold planetary influences (e.g., <b>Sun</b> for vitality, <b>Moon</b> for emotion).
- Output must be plain text with <b> tags only — no markdown or lists.
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
    startSection(doc, "Your Personality Traits", "Your Personality Traits");
    doc.addPage();
    markSectionPage(doc);
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("1.4 Personality Traits & Characteristics", pageWidth / 2, 70, { align: "center" });
    doc.setTextColor("#a16a21");
    addParagraphss(doc, personalityText, 50, 100, pageWidth - 100);

    // === 1.6 CHARA KARAKAS & LIFE PURPOSE ===

    const charaPrompt = `
You are an expert Vedic astrologer and spiritual psychologist.
Based on the following astro data, generate "1.6 Chara Karakas & Life Purpose" 
explaining the deeper meaning of the seven Jaimini Karakas (Atmakaraka, Amatyakaraka, Bhratrikaraka, Matrikaraka, Putrakaraka, Gnatikaraka, and Darakaraka).
Describe how these planetary indicators reveal the person's inner nature, soul direction, emotional lessons, and ultimate life path.

STYLE:
- Warm, elegant, and human-centered tone.
- 2–3 flowing paragraphs (no bullet points, no lists).
- Integrate psychological depth and spiritual purpose.
- Mention how <b>Atmakaraka</b> defines the soul’s mission, <b>Amatyakaraka</b> guides career and dharma, and others shape relationships and evolution.

FORMATTING RULES:
- Use <b>...</b> HTML tags around key traits and planetary influences such as:
  <b>Sun</b>, <b>Moon</b>, <b>Mercury</b>, <b>Venus</b>, <b>Mars</b>, <b>Jupiter</b>, <b>Saturn</b>, <b>Rahu</b>, <b>Ketu</b>.
- Also bold spiritual and emotional qualities like <b>Purpose</b>, <b>Wisdom</b>, <b>Transformation</b>, <b>Discipline</b>, <b>Devotion</b>, <b>Empathy</b>, <b>Balance</b>.
- Do NOT use markdown (** or *), only HTML <b>...</b> tags.
- Output must be narrative only — no headings, lists, or bullet points.
`;

    // Filter the relevant keys (important for Jaimini Karaka interpretation)
    const charaKeys = [
      "jaimini_karakas",
      "planet_details",
      "ascendant_report",
      "find_moon_sign",
      "find_sun_sign",
      "find_ascendant",
      "yoga_list"
    ];

    const filteredCharaData = Object.fromEntries(
      Object.entries(astroData).filter(([key]) => charaKeys.includes(key))
    );

    // === Call the model for this section ===
    let charaText = await callBedrock(charaPrompt, JSON.stringify(filteredCharaData));
    charaText = sanitizeText(charaText);
    charaText = removeMarkdown(charaText);

    // === Render the section ===
    startSection(doc, "Chara Karakas & Life Purpose", "Chara Karakas & Life Purpose");
    doc.addPage();
    markSectionPage(doc);
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("1.5 Chara Karakas & Life Purpose", pageWidth / 2, 70, { align: "center" });
    doc.setTextColor("#a16a21");
    addParagraphss(doc, charaText, 50, 100, pageWidth - 100);
    //doc.addPage();

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

    await generateHouseReports(doc, astroData, userData);

    await generatePlanetReportsWithImages(doc, astroData, userData);

    // ===== PART 2 =====

    doc.addPage();
    const corner = 25;

    // === BACKGROUND ===
    doc.setFillColor("#fdf2e9");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // === OUTER FRAME ===
    doc.setFillColor("#a16a21");
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin, "F");

    // === INNER FRAME ===
    doc.setFillColor("#d9b46c");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // === CORNER LINES ===
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.5);
    const drawCorner = (x: number, y: number, isTop: boolean, isRight: boolean) => {
      const dx = isRight ? -corner : corner;
      const dy = isTop ? corner : -corner;
      doc.line(x, y, x + dx, y);
      doc.line(x, y, x, y + dy);
    };

    // Four corners
    drawCorner(margin + 6, margin + 6, true, false);
    drawCorner(pageWidth - margin - 6, margin + 6, true, true);
    drawCorner(margin + 6, pageHeight - margin - 6, false, false);
    drawCorner(pageWidth - margin - 6, pageHeight - margin - 6, false, true);

    // === TITLE ===
    doc.setFont("NotoSans", "bold");
    doc.setTextColor("#ffffff");
    doc.setFontSize(40);
    doc.text("Love, Emotions & Relationships", pageWidth / 2, pageHeight / 2 - 10, { align: "center" });

    // === SUBTEXT ===
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.text("A Journey Through the Heart and Soul", pageWidth / 2, pageHeight / 2 + 20, { align: "center" });

    // === ORNAMENT ===
    const ornamentWidth = 60;
    const ornamentY = pageHeight / 2 + 30;
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - ornamentWidth / 2, ornamentY, pageWidth / 2 + ornamentWidth / 2, ornamentY);
    doc.circle(pageWidth / 2, ornamentY, 2, "F");

    // === SUB-SECTIONS ===
    const loveSections = [
      "4.1 Your Emotional Side – How you express and handle feelings",
      "4.2 Your Compatibility – How you connect with others",
      "4.3 Your Relationship Style – What you need in love",
      "4.4 Planets of Love – What Venus and Mars say about romance and attraction",
      "4.5 Marriage & Partnership – What your chart says about long-term bonds",
      "4.6 Timing in Love – When love and marriage are most likely to happen",
      "4.7 Lessons in Love – What you learn through relationships",
      "4.8 Darakaraka & Soulmate Planet – The celestial force that defines your life partner"
    ];

    // === ENHANCED BEDROCK GENERATION ===
    async function fetchLoveSection(sectionPrompt: string) {
      const lowerPrompt = sectionPrompt.toLowerCase();
      let requiredKeys: string[] = [];

      if (lowerPrompt.includes("emotional")) {
        requiredKeys = ["find_moon_sign", "find_ascendant", "nakshatra_report", "planet_details"];
      } else if (lowerPrompt.includes("compatibility")) {
        requiredKeys = ["planet_details", "planetary_aspects_houses", "planetary_aspects_planets"];
      } else if (lowerPrompt.includes("relationship style")) {
        requiredKeys = ["planet_report_venus", "planet_report_mars", "planet_details"];
      } else if (lowerPrompt.includes("planets of love")) {
        requiredKeys = ["planet_report_venus", "planet_report_mars", "planet_report_jupiter"];
      } else if (lowerPrompt.includes("marriage")) {
        requiredKeys = ["planets_in_houses", "kp_houses", "planet_report_jupiter", "find_ascendant"];
      } else if (lowerPrompt.includes("timing")) {
        requiredKeys = ["maha_dasha", "antar_dasha", "yogini_dasha_main", "yogini_dasha_sub"];
      } else if (lowerPrompt.includes("lessons")) {
        requiredKeys = ["planet_report_saturn", "planet_report_rahu", "planet_report_ketu"];
      }
      // 🆕 Handle 4.8 Darakaraka & Soulmate Planet
      else if (lowerPrompt.includes("darakaraka") || lowerPrompt.includes("soulmate")) {
        requiredKeys = [
          "chara_karakas",
          "planet_report_venus",
          "planet_report_jupiter",
          "find_ascendant",
          "planet_details"
        ];
      } else {
        requiredKeys = ["planet_details", "find_moon_sign", "find_ascendant"];
      }

      // Filter astroData by relevant keys
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // === Generate contextual prompt ===
      const fullPrompt = `
You are a compassionate Vedic astrologer writing for a reader who seeks understanding of their heart and relationships.
Write a warm, emotionally intelligent, poetic reading for:
"${sectionPrompt}"

Astro Data (for context only):
${JSON.stringify(filteredData, null, 2)}

Output Format:
Use only the following XML-style tags in your response:
<<<heading>>>
<<subheading>>
<content>
... your text here ...
</content>

Inside <content>:
- Use <b>...</b> to highlight important spiritual lessons, qualities, or realizations.
- Use <li>...</li> for gentle, poetic bullet points — such as lessons, insights, or guidance steps.
- Write naturally and emotionally — like speaking to the user with wisdom and kindness.

Rules:
- Do NOT use markdown, asterisks (*), or other symbols.
- Do NOT include words like "Introduction" or "Summary".
- Write smooth, connected paragraphs with natural flow.
- Keep tone: comforting, spiritual, and empowering.
- Write in ${userData.language || "English"}.
- Avoid technical astrology jargon. Translate planets and cycles into emotional and real-life meanings.
- Focus on what the person can <b>learn, heal, and grow</b> from, and how challenges turn into strength.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      text = sanitizeText(text);
      text = normalizeBedrockText(text);
      return text;
    }

    // === GENERATE ALL LOVE SECTIONS ===
    const loveResults = await Promise.all(loveSections.map(fetchLoveSection));

    // === RENDER SECTIONS TO PDF ===
    for (let i = 0; i < loveSections.length; i++) {
      const sectionTitle = loveSections[i].split("–")[0].trim();
      const sectionText = loveResults[i];
      startSection(doc, `${sectionTitle}`, `${sectionTitle}`);
      doc.addPage();
      markSectionPage(doc);
      // Draw border
      const margin = 25;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

      // // Add section title
      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(24);
      // doc.setTextColor("#000");
      // doc.text(sectionTitle, pageWidth / 2, 70, { align: "center" });

      // Render AI text
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
      "5.1 Your Career Strengths – Analyze the native’s natural talents, skills, and professional strengths. Discuss how planetary placements and house influences reveal their core abilities and what fields they are naturally drawn toward.",
      "5.2 Ideal Work Style – Explore the individual’s approach to work, their preferred environments, and how they handle responsibility, teamwork, and leadership. Explain what kind of professional setting best supports their emotional and intellectual fulfillment.",
      "5.3 Success Factors – Identify the planetary influences and time periods that bring professional growth, promotions, recognition, and financial success. Describe how luck, effort, and timing combine to shape career progress.",
      "5.4 Turning Points – Examine the planetary periods (Dashas, Yogas, and transits) that signal job changes, business opportunities, or major career transitions. Highlight when key breakthroughs or challenges are most likely to occur.",
      "5.5 Your Professional Future – Offer a holistic, future-oriented view of the person’s long-term professional journey, leadership potential, and overall success indicators. Conclude with motivating insights on how they can align with their soul’s true vocational path."
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
You are an experienced Vedic astrologer and career guide.

Write a detailed, clear, and inspiring explanation for:
"${sectionPrompt}"

Context:
This part belongs to the "Career & Success" section of a personal astrology report.
Your goal is to mix Vedic astrology insights with practical and motivational career advice.

Output Format:
Use only the following XML-style tags in your response:
<<<heading>>>
<<subheading>>
<content>
... your text here ...
</content>

Inside <content>:
- Use <b>...</b> to highlight important spiritual lessons, qualities, or realizations.
- Use <li>...</li> for gentle, poetic bullet points — such as lessons, insights, or guidance steps.
- Write naturally and emotionally — like speaking to the user with wisdom and kindness.

Rules:
- Do NOT use markdown, asterisks (*), or other symbols.
- Do NOT include words like "Introduction" or "Summary".
- Write smooth, connected paragraphs with natural flow.
- Keep tone: comforting, spiritual, and empowering.
- Write in ${userData.language || "English"}.
- Avoid technical astrology jargon. Translate planets and cycles into emotional and real-life meanings.
- Focus on what the person can <b>learn, heal, and grow</b> from, and how challenges turn into strength.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      text = normalizeBedrockText(text);
      return text;
    }

    // Run all sections concurrently
    const results = await Promise.all(careerSections.map(fetchCareerSection));

    // Render each section into the PDF
    for (let i = 0; i < careerSections.length; i++) {
      const sectionTitle = careerSections[i].split(":")[0];
      const text = results[i];
      startSection(doc, `${sectionTitle}`, `${sectionTitle}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // Section Header
      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(26);
      // doc.setTextColor("#000");
      // doc.text(sectionTitle, pageWidth / 2, 60, { align: "center" });

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
    // === TABLE OF CONTENTS ALIGNED HEALTH SECTIONS ===
    const healthSections = [
      "6.1 Overall Health Picture – Describe the user's overall health potential and natural constitution. Highlight their key strengths, healing abilities, and any areas that may need extra care. Offer gentle guidance on lifestyle balance and wellbeing.",
      "6.2 Planet Influence on Health – Explain how different planets affect the user's physical energy, immunity, stress response, and emotional balance. Mention which planets give strength and vitality, and which may create temporary health challenges.",
      "6.3 Mind-Body Connection – Show how the user's emotions, thoughts, and energy flow affect their physical health. Talk about how their Moon, Mercury, and Ascendant signs influence emotional stability, mental clarity, and inner peace.",
      "6.4 Stress Triggers – Identify what kinds of situations or patterns may lead to stress or imbalance. Offer insights on what the user should avoid and what habits or mindsets help them stay calm and focused.",
      "6.5 Simple Remedies – Provide practical, easy-to-follow suggestions to maintain good health. Include natural, spiritual, or lifestyle remedies such as meditation, breathing exercises, balanced diet, rest, or small rituals that promote overall wellbeing.",
      "6.6 Sade Sati & Mangalik Analysis – Planetary challenges and their healing lessons"
    ];


    // === FETCH HEALTH SECTION DATA ===
    async function fetchHealthSection(sectionPrompt: string) {
      const requiredKeys = [
        "mangal_dosh", "kaalsarp_dosh", "manglik_dosh", "pitra_dosh", "papasamaya",
        "planet_details", "planetary_aspects_houses", "planetary_aspects_planets",
        "planets_in_houses", "find_sun_sign", "find_moon_sign", "find_ascendant",
        "shad_bala", "kp_houses", "kp_planets", "yoga_list", "ashtakvarga",
        "divisional_chart_D1", "divisional_chart_D9", "divisional_chart_D10",
        "maha_dasha", "antar_dasha", "paryantar_dasha", "yogini_dasha_main",
        "yogini_dasha_sub", "sade_sati_table", "current_sade_sati", "varshapal_details",
        "extended_kundli_details",
      ];

      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // 🌿 Simplified and user-friendly prompt
      const fullPrompt = `
You are a kind and knowledgeable Vedic astrologer and holistic health guide.

Write a clear, friendly, and emotionally supportive reading for:
"${sectionPrompt}"

Context:
This is part of the "Health & Wellbeing" section of a personal astrology report.
You are helping the reader understand their body, emotions, and energy patterns through astrology.

Output Format:
Use only the following XML-style tags in your response:
<<<heading>>>
<<subheading>>
<content>
... your text here ...
</content>

Inside <content>:
- Use <b>...</b> to highlight important spiritual lessons, qualities, or realizations.
- Use <li>...</li> for gentle, poetic bullet points — such as lessons, insights, or guidance steps.
- Write naturally and emotionally — like speaking to the user with wisdom and kindness.

Rules:
- Do NOT use markdown, asterisks (*), or other symbols.
-Avoid markdown or Sanskrit-heavy terms.
- Do NOT include words like "Introduction" or "Summary".
- Write smooth, connected paragraphs with natural flow.
- Keep tone: comforting, spiritual, and empowering.
- Write in ${userData.language || "English"}.
- Avoid technical astrology jargon. Translate planets and cycles into emotional and real-life meanings.
- Focus on what the person can <b>learn, heal, and grow</b> from, and how challenges turn into strength.
`;

      let text = await callBedrock(fullPrompt, { filteredData });
      text = sanitizeText(text);
      text = normalizeBedrockText(text);
      return text;
    }


    // === GENERATE ALL HEALTH SECTIONS ===
    const resulthealth = await Promise.all(healthSections.map(fetchHealthSection));


    // === RENDER HEALTH SECTIONS INTO PDF ===
    for (let i = 0; i < healthSections.length; i++) {
      const sectionPrompt = healthSections[i];
      const text = resulthealth[i];
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // 🩺 Title setup
      // const sectionTitle = sectionPrompt.split("–")[0].trim();
      // const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      // const titleFontSize = titleLines.length > 1 ? 20 : 22;
      // const titleLineHeight = 24;

      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(titleFontSize);
      // doc.setTextColor("#000");

      // let titleY = 60;
      // titleLines.forEach((line: string, idx: number) => {
      //   doc.text(line, pageWidth / 2, titleY + idx * titleLineHeight, { align: "center" });
      // });

      // titleY += titleLines.length * titleLineHeight + 10;

      // 🌱 Content
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#5a4632");

      addParagraphs(doc, text, 50, 100, pageWidth - 100);
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
    // === LIFE LESSONS & PURPOSE SECTIONS (Aligned with ToC) ===
    const karmicSections = [
      "7.1 Your Life Purpose – Explain the soul’s deeper mission, the key lessons to learn in this lifetime, and what the user is meant to achieve through personal and spiritual growth. Show how the birth chart reveals their higher calling and guiding values.",
      "7.2 Growth Phases – Describe the major life phases and challenges that help the user mature emotionally and spiritually. Discuss how planetary cycles, especially Saturn and Sade Sati, shape wisdom, strength, and resilience over time.",
      "7.3 Past-Life Connections – Share insights about what past-life experiences or karmic themes might carry over into this life. Talk about patterns or emotions that repeat and how they offer chances for healing and completion.",
      "7.4 Key Turning Points – Identify the spiritual or life-changing moments that redirect the user’s path. Include major planetary transits or dashas that bring self-discovery, breakthroughs, or powerful realizations.",
      "7.5 Learning Through Challenges – Explain how difficulties, emotional tests, or delays help the user evolve. Show how every challenge teaches patience, courage, and compassion, leading them closer to inner freedom and self-awareness.",
      "7.6 Rahu-Ketu Axis – Understanding your karmic push and pull"
    ];


    // === FETCH KARMIC SECTION DATA ===
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

      // ✨ Friendly, clear, and spiritually grounded prompt
      const fullPrompt = `
You are a compassionate Vedic astrologer and spiritual life guide.

Write a warm, insightful, and easy-to-understand explanation for:
"${sectionPrompt}"

Context:
This is part of the "Life Lessons & Purpose" section in a personal astrology report.
The goal is to help the reader understand their soul journey, growth path, and spiritual evolution through astrology.

Output Format:
Use only the following XML-style tags in your response:
<<<heading>>>
<<subheading>>
<content>
... your text here ...
</content>

Inside <content>:
- Use <b>...</b> to highlight important spiritual lessons, qualities, or realizations.
- Use <li>...</li> for gentle, poetic bullet points — such as lessons, insights, or guidance steps.
- Write naturally and emotionally — like speaking to the user with wisdom and kindness.

Rules:
- Do NOT use markdown, asterisks (*), or other symbols.
- Do NOT include words like "Introduction" or "Summary".
- Write smooth, connected paragraphs with natural flow.
- Keep tone: comforting, spiritual, and empowering.
- Write in ${userData.language || "English"}.
- Avoid technical astrology jargon. Translate planets and cycles into emotional and real-life meanings.
-Avoid markdown or Sanskrit-heavy terms.
- Focus on what the person can <b>learn, heal, and grow</b> from, and how challenges turn into strength.
`;

      let text = await callBedrock(fullPrompt, { minimalData });
      text = sanitizeText(text);
      text = normalizeBedrockText(text);
      return text;
    }


    // === GENERATE ALL KARMIC SECTIONS ===
    const karmicResults = await Promise.all(karmicSections.map(fetchKarmicSection));


    // === RENDER INTO PDF ===
    for (let i = 0; i < karmicSections.length; i++) {
      const sectionPrompt = karmicSections[i];
      const text = karmicResults[i];
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // ✨ Title setup
      // const sectionTitle = sectionPrompt.split("–")[0].trim();
      // const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      // const titleFontSize = titleLines.length > 1 ? 18 : 20;
      // const titleLineHeight = 24;
      // let titleY = 60;

      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(titleFontSize);
      // doc.setTextColor("#000");

      // titleLines.forEach((line: string, idx: number) => {
      //   doc.text(line, pageWidth / 2, titleY + idx * titleLineHeight, { align: "center" });
      // });

      // titleY += titleLines.length * titleLineHeight + 10;

      // 🪶 Content
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#5a4632");

      addParagraphs(doc, text, 50, 100, pageWidth - 100);
    }


    //     // Generate "09 Timing & Predictive Insights" section
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
      "8.1 Major Life Phases – The big themes that guide your future",
      "8.2 Upcoming Events – What the next few years may bring",
      "8.3 Year Ahead Forecast – Favorable and challenging months",
      "8.4 Planet Movements – How upcoming changes may influence you",
      "8.5 Overall Outlook – What to expect in your personal and professional life"
    ];

    const PAGE_HEIGHT = 842;

    const essentialTimingData = {
      maha_dasha: astroData.maha_dasha,
      antar_dasha: astroData.antar_dasha,
      paryantar_dasha: astroData.paryantar_dasha,
      yogini_dasha_main: astroData.yogini_dasha_main,
      yogini_dasha_sub: astroData.yogini_dasha_sub,

      transit_dates_sun: astroData.transit_dates_sun,
      transit_dates_moon: astroData.transit_dates_moon,
      transit_dates_mars: astroData.transit_dates_mars,
      transit_dates_mercury: astroData.transit_dates_mercury,
      transit_dates_jupiter: astroData.transit_dates_jupiter,
      transit_dates_venus: astroData.transit_dates_venus,
      transit_dates_saturn: astroData.transit_dates_saturn,
      transit_dates_rahu: astroData.transit_dates_rahu,
      transit_dates_ketu: astroData.transit_dates_ketu,

      yoga_list: astroData.yoga_list,
      current_sade_sati: astroData.current_sade_sati,
      varshapal_details: astroData.varshapal_details,
      ai_12_month_prediction: astroData.ai_12_month_prediction,

      find_ascendant: astroData.find_ascendant,
      find_moon_sign: astroData.find_moon_sign,
      find_sun_sign: astroData.find_sun_sign,
    };

    for (const sectionPrompt of timingSections) {

      const fullPrompt = `
You are a senior Vedic astrologer and intuitive life guide with deep understanding of human emotions and destiny patterns.

Write a profound, emotionally intelligent, and spiritually warm interpretation for:
"${sectionPrompt}"

Context:
This is part of a personalized astrology report designed to help the reader understand their journey, timing influences, and soul lessons in practical, healing language.

Output Format:
Use only the following XML-style tags in your response:
<<<heading>>>
<<subheading>>
<content>
... your text here ...
</content>

Inside <content>:
- Use <b>...</b> to emphasize planets, life areas, or important realizations.
- Use <li>...</li> for listing karmic lessons, opportunities, or insights.
- Express astrology in an emotionally rich, human-centered way — translating planetary movements into personal experiences and growth lessons.

Rules:
- Do NOT use markdown, asterisks (*), or decorative symbols.
- Do NOT include labels like “Introduction”, “Overview”, or “Summary”.
- Maintain smooth, connected paragraphs with gentle flow and empathy.
- Tone should be wise, uplifting, and supportive — never mechanical.
- Write in ${userData.language || "English"}.
- Avoid Sanskrit-heavy terms or overly technical astrology jargon.
- Focus on emotional meaning, life purpose, and personal transformation.
- Every section should feel like heartfelt guidance — showing how one can <b>grow, heal, and evolve</b> through their astrological timing.

Special Addition:
If the section prompt includes “Year Ahead Forecast”, include a special forecast section like this:
<<<heading>>>AI-Based 12-Month Forecast 
<content>
Begin with a short summary of the year’s overall theme.
Then add monthly insights using <li>...</li> for each month (January to December), highlighting key emotional, professional, or spiritual tones.
Conclude with an inspiring closing paragraph that ties the year’s journey together with hope and reflection.
</content>

`;

      // --- Call the AI model ---
      let text = await callBedrock(fullPrompt, { essentialTimingData });
      text = normalizeBedrockText(text);
      text = sanitizeText(text);

      // --- Add a page for this section ---
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      const pageWidth = doc.internal.pageSize.getWidth();
      let cursorY = 110;

      // --- Section Title ---
      const sectionTitle = sectionPrompt.split("–")[0].trim();
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

      // --- Conditional Tables ---
      if (sectionPrompt.includes("Major Life Phases")) {
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

      if (sectionPrompt.includes("Upcoming Events")) {
        const antardashaData = astroData?.antar_dasha;
        (antardashaData.antardashas || []).forEach((antarList: string[], index: number) => {
          const antarOrder: string[] = antardashaData.antardasha_order?.[index] || [];
          const antarData: string[][] = antarList.map((sub, i) => [
            sub || "N/A",
            antarOrder[i] || "N/A",
            antarOrder[i + 1] || antarOrder[i] || "—"
          ]);

          if (cursorY > PAGE_HEIGHT - 150) {
            doc.addPage();
            cursorY = 60;
          }

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

      // --- Render HTML as text blocks (preserve <b> and <li> emphasis) ---
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

    // === 9. Remedies & Positive Actions ===
    const remediesSections = [
      "9.1 Lucky Stones & Crystals – Best choices for your energy",
      "9.2 Powerful Mantras – Chants that calm and strengthen you",
      "9.3 Helpful Rituals – Easy daily or weekly practices",
      "9.4 Good Deeds & Charity – Acts that improve your karma",
      "9.5 Protection & Peace Tips – Simple ways to stay positive"
    ];

    // --- Minimal Astro Data Mappings ---
    const dataMap = {
      "Lucky Stones & Crystals": {
        gem_suggestion: astroData?.gem_suggestion,
        gem_details: astroData?.gem_details,
        planet_details: astroData?.planet_details,
      },
      "Powerful Mantras": {
        yoga_list: astroData?.yoga_list,
        find_moon_sign: astroData?.find_moon_sign,
        find_sun_sign: astroData?.find_sun_sign,
      },
      "Helpful Rituals": {
        kaalsarp_dosh: astroData?.kaalsarp_dosh,
        manglik_dosh: astroData?.manglik_dosh,
        pitra_dosh: astroData?.pitra_dosh,
      },
      "Good Deeds & Charity": {
        papasamaya: astroData?.papasamaya,
        sade_sati: astroData?.current_sade_sati,
        planet_details: astroData?.planet_details,
      },
      "Protection & Peace Tips": {
        current_sade_sati: astroData?.current_sade_sati,
        manglik_dosh: astroData?.manglik_dosh,
        kaalsarp_dosh: astroData?.kaalsarp_dosh,
        pitra_dosh: astroData?.pitra_dosh,
      },
    };

    // === Friendly, Tag-Based Prompt ===
    async function fetchRemediesSection(sectionPrompt: string) {
      const sectionTitle = sectionPrompt.split("–")[0].trim();

      const fullPrompt = `
You are a compassionate Vedic astrologer and spiritual life guide.

Write a heart-centered, clear, and hopeful explanation for:
"${sectionPrompt}"

Context:
This is part of the "9. Remedies & Positive Actions" section in a personal astrology report.
Your goal is to gently help the reader restore balance, peace, and confidence through astrological remedies.

Output Format:
Use only these XML-style tags:
<<<heading>>>
<<subheading>>
<content>

Inside <content>:
- Use <b>...</b> for gemstones, mantras, or key guidance.
- Use <li>...</li> for bullet-style practical steps.
- Maintain an uplifting, peaceful, and empathetic tone.

Rules:
- Do NOT use markdown symbols (*, **, #, etc.).
- Avoid complex Sanskrit or technical astrology jargon — explain simply.
- Keep 3–5 coherent paragraphs or sections with emotional warmth.
- Relate each remedy to inner growth, harmony, and mindfulness.
- Always connect physical remedies to emotional and spiritual balance.
- Write in ${userData.language || "English"}.

Structure Example:
──────────────────────────────
<<<heading>>> ${sectionTitle}
<content>
Begin with a gentle introduction about this type of remedy and its purpose.
<li>Describe how this remedy helps balance energies or ease emotional tension.</li>
<li>Explain how it can be practiced daily or weekly in a simple way.</li>
<li>End with a reflective insight about growth or healing.</li>
</content>

<<subheading>> How It Helps
<content>
<li>Explain which <b>planet</b> or <b>life area</b> this remedy aligns with.</li>
<li>Describe emotional and karmic benefits it brings.</li>
<li>Give a relatable example or scenario where it helps in real life.</li>
</content>

<<subheading>> Practice & Mindset
<content>
<li>Offer tips for consistency, awareness, and positive mindset.</li>
<li>Encourage gratitude, patience, and faith while following the remedy.</li>
</content>
──────────────────────────────
`;

      try {
        type RemediesKey = keyof typeof dataMap;

        const key = Object.keys(dataMap).find((k) =>
          sectionTitle.includes(k)
        ) as RemediesKey | undefined;

        const inputData = key ? dataMap[key] : {};
        let raw = await callBedrock(fullPrompt, inputData);

        if (!raw || raw.trim().length < 80) {
          console.warn(`⚠️ No sufficient content generated for ${sectionTitle}`);
          return `<<<heading>>> ${sectionTitle}\n<content>No detailed guidance available for this section.</content>`;
        }

        raw = normalizeBedrockText(raw);
        return sanitizeText(raw);
      } catch (err) {
        console.error(`❌ Error generating ${sectionTitle}:`, err);
        return `<<<heading>>> ${sectionTitle}\n<content>Error generating content for this section.</content>`;
      }
    }

    // === Sequential Generation ===
    const resultRemedies: string[] = [];
    for (const section of remediesSections) {
      const text = await fetchRemediesSection(section);
      resultRemedies.push(text);
    }

    // === PDF Rendering ===
    for (let i = 0; i < remediesSections.length; i++) {
      const sectionPrompt = remediesSections[i];
      const text = resultRemedies[i];
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      const pageWidth = doc.internal.pageSize.getWidth();
      // const sectionTitle = `9.${i + 1} ${sectionPrompt}`;
      // const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      // const titleFontSize = titleLines.length > 1 ? 18 : 20;

      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(titleFontSize);
      // doc.setTextColor("#000");
      // titleLines.forEach((line: string, idx: number) =>
      //   doc.text(line, pageWidth / 2, 60 + idx * 22, { align: "center" })
      // );

      // const contentY = 60 + titleLines.length * 22 + 20;
      // doc.setFont("NotoSans", "normal");
      // doc.setFontSize(14);
      // doc.setTextColor("#000");

      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, 100, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, 30);
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

    // === 10. Deeper Insights ===
    const advancedSections = [
      "10.1 Your Strength Map – Where your natural power lies",
      "10.2 Planet Power Levels – How much influence each planet has",
      "10.3 Detailed Life Charts – In-depth look at all life areas",
      "10.4 Fine Timing Review – Small changes and their meanings",
      "10.5 Special Planet Effects – When two planets compete or combine",
      "10.6 Raj Yogas & Karmic Doshas – Combinations that bring fame or challenges"
    ];

    // === Essential Data for This Section ===
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

    // === Friendly, Analytical, Spiritually Balanced Prompt ===
    async function fetchAdvancedSection(sectionPrompt: string) {
      const sectionTitle = sectionPrompt.split("–")[0].trim();

      const fullPrompt = `
You are a senior Vedic astrologer and analytical guide with deep insight into predictive and spiritual astrology.  
Write a deeply insightful and easy-to-understand explanation for:
"${sectionPrompt}"

Context:
This is part of the "10. Deeper Insights" chapter of a personal astrology report.
It should blend precision (planetary analytics) with soulful understanding (guidance, awareness, and empowerment).

Output Format:
Use only the following XML-style tags:
<<<heading>>>
<<subheading>>
<content>

Inside <content>:
- Use <b>...</b> to emphasize key ideas, planets, or houses.
- Use <li>...</li> for structured insights, lists, or examples.
- Maintain a balanced tone: informative, calm, and encouraging.

Rules:
- Do NOT use markdown symbols (*, **, #, etc.).
- Avoid overly technical Sanskrit; interpret concepts intuitively.
- Include 3–5 segments (each with a heading, subheading, and content).
- Write in ${userData.language || "English"}.
- End each section with uplifting, actionable wisdom.

Structure Example:
──────────────────────────────
<<<heading>>> ${sectionTitle}</heading>
<content>
Begin with a clear overview explaining the main astrological theme of this section.
<li>Summarize how this aspect reveals deeper self-knowledge.</li>
<li>Include insights from Ashtakvarga, Shadbala, or Divisional Charts when relevant.</li>
<li>Close with one empowering thought about embracing these energies.</li>
</content>

<<subheading>> Planetary Highlights</subheading>
<content>
<li>Highlight which <b>planets</b> show dominant strength or influence.</li>
<li>Describe what their high or low strength means for success, health, or emotions.</li>
<li>Include an easy, practical interpretation for each insight.</li>
</content>

<<subheading>> Spiritual Takeaways</subheading>
<content>
<li>Offer reflective lessons about self-awareness and patience.</li>
<li>Encourage trust in timing and inner resilience.</li>
<li>End with an affirming message about growth and balance.</li>
</content>
──────────────────────────────
`;

      let text = await callBedrock(fullPrompt, { essentialAdvancedData });
      text = sanitizeText(text);
      text = normalizeBedrockText(text);
      return text;
    }

    // === Generate All Subsections Sequentially ===
    const resultAdvanced: string[] = [];
    for (const section of advancedSections) {
      debugLog(`🔭 Generating Deeper Insights → ${section.split("–")[0].trim()} ...`);
      const text = await fetchAdvancedSection(section);
      resultAdvanced.push(text);
    }
    debugLog("✨ All Deeper Insights sections generated successfully!");

    // === Render All Sections in PDF ===
    for (let i = 0; i < advancedSections.length; i++) {
      const sectionPrompt = advancedSections[i];
      const text = resultAdvanced[i];
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      const pageWidth = doc.internal.pageSize.getWidth();
      // const sectionTitle = `10.${i + 1} ${sectionPrompt}`;
      // const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      // const titleFontSize = titleLines.length > 1 ? 18 : 20;
      // const titleLineHeight = 24;

      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(titleFontSize);
      // doc.setTextColor("#000");
      // titleLines.forEach((line: string, idx: number) =>
      //   doc.text(line, pageWidth / 2, 60 + idx * titleLineHeight, { align: "center" })
      // );

      // const contentY = 60 + titleLines.length * titleLineHeight + 20;
      // doc.setFont("NotoSans", "normal");
      // doc.setFontSize(14);
      // doc.setTextColor("#000");

      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, 100, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, 30);
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

    // === 11. Important Timings ===
    const panchangSections = [
      "11.1 Sunrise & Sunset on Birth Day – How they shaped your energy",
      "11.2 Moonrise & Moonset – Your emotional timing",
      "11.3 Auspicious Hours – Your naturally lucky times of day",
      "11.4 Planetary Hours – Best hours for decisions and activities",
    ];

    // === Panchang Data Context ===
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

    // === Section Generator ===
    async function fetchPanchangSection(sectionPrompt: string) {
      const sectionTitle = sectionPrompt.split("–")[0].trim();

      const fullPrompt = `
You are a Vedic astrologer and Panchang expert with deep spiritual awareness and practical insight.

Generate an elegant, structured, and easy-to-understand explanation for:
"${sectionPrompt}"

Context:
This section belongs to “11. Important Timings” in a personal astrology report.
It explains the timing patterns surrounding the native’s birth — when the Sun, Moon, and planetary hours shaped their natural rhythm.

Output Format:
Use only the following XML-style tags:
<<<heading>>>
<<subheading>>
<content>

Inside <content>:
- Use <b>...</b> to highlight planetary names, timings, or key themes.
- Use <li>...</li> to list important insights or practical suggestions.
- Maintain a calm, meditative tone that blends science, astrology, and inner wisdom.

Rules:
- Do NOT use markdown symbols (*, **, etc.).
- Each heading or subheading should feel descriptive and human (not generic like “Overview”).
- Include 3–5 structured parts, each with explanation and meaning.
- Avoid Sanskrit-heavy language; use intuitive explanations.
- Close with a brief reflective paragraph on harmony, timing, or self-alignment.
- Write in ${userData.language || "English"}.

Structure Example:
──────────────────────────────
<<<heading>>> ${sectionTitle}</heading>
<content>
Begin with a short overview describing what this timing means and how it influences personality or mood.
<li>Explain the scientific or astronomical basis briefly.</li>
<li>Describe the astrological interpretation (e.g., <b>Sunrise</b> = vitality, <b>Sunset</b> = closure).</li>
<li>Offer a daily life reflection about energy cycles and awareness.</li>
</content>

<<subheading>> Planetary or Energetic Influence</subheading>
<content>
<li>Explain which <b>planet</b> or <b>element</b> governs this timing and its emotional or mental effect.</li>
<li>Discuss balance or imbalance patterns based on these timings.</li>
<li>Offer simple awareness or mindfulness practices aligned with them.</li>
</content>

<<subheading>> Practical Guidance</subheading>
<content>
<li>Share 2–3 easy suggestions for using these hours for meditation, creativity, or decision-making.</li>
<li>Highlight how respecting these natural rhythms improves harmony and productivity.</li>
</content>
──────────────────────────────
`;

      try {
        const raw = await callBedrock(fullPrompt, essentialPanchangData);
        let text = sanitizeText(raw);
        text = normalizeBedrockText(text);

        if (!text || typeof text !== "string" || text.trim() === "") {
          text = `<<<heading>>> ${sectionTitle}\n<content>No Panchang data could be generated for this section.</content>`;
        }

        return text;
      } catch (err) {
        console.error("⚠️ Panchang Bedrock Error:", err);
        return `<<<heading>>> ${sectionTitle}\n<content>Error generating this Panchang section.</content>`;
      }
    }

    // === Parallel Generation for All Subsections ===
    const resultPanchang = await Promise.all(panchangSections.map(fetchPanchangSection));

    // === PDF Rendering ===
    for (let i = 0; i < panchangSections.length; i++) {
      const sectionPrompt = panchangSections[i];
      const text = resultPanchang[i];
      startSection(doc, `${sectionPrompt}`, `${sectionPrompt}`);
      doc.addPage();
      markSectionPage(doc);
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      const pageWidth = doc.internal.pageSize.getWidth();
      // const sectionTitle = `11.${i + 1} ${sectionPrompt}`;
      // const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      // const titleFontSize = titleLines.length > 1 ? 18 : 20;
      // const titleLineHeight = 24;

      // doc.setFont("NotoSans", "bold");
      // doc.setFontSize(titleFontSize);
      // doc.setTextColor("#000");
      // titleLines.forEach((line: string, idx: number) =>
      //   doc.text(line, pageWidth / 2, 60 + idx * titleLineHeight, { align: "center" })
      // );

      // const contentY = 60 + titleLines.length * titleLineHeight + 20;
      // doc.setFont("NotoSans", "normal");
      // doc.setFontSize(14);
      // doc.setTextColor("#000");

      if (text && text.trim().length > 0) {
        addParagraphs(doc, text, 50, 100, pageWidth - 100);
      } else {
        doc.setFont("NotoSans", "italic");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("⚠️ No content generated for this section.", 50, 30);
      }
    }

    //     // Generate "12 Q&A & Personalized Advice" section
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
      startSection(doc, `Common Questions Answered`, `Common Questions Answered`);
      doc.addPage();
      markSectionPage(doc);
      drawQABorder(doc);
      addHeaderFooter(doc, doc.getNumberOfPages());

      // Title
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text("Personalized Predictive Q&A", pageWidth / 2, 70, { align: "center" });

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

    //     // ✅ Usage
    await generateQAPDF(doc, "English");
    // === Section Titles ===
    // === Section Titles ===
    // ========== TYPE DEFINITIONS ==========

    interface AstroData {
      mangal_dosh?: any;
      kaalsarp_dosh?: any;
      maha_dasha?: any;
      antar_dasha?: any;
      current_sade_sati?: any;
      find_moon_sign?: any;
      find_sun_sign?: any;
      find_ascendant?: any;
      shad_bala?: any;
      yoga_list?: any;
      gem_suggestion?: any;
      rudraksh_suggestion?: any;
    }

    // Declare reusable functions/types (import from elsewhere in your project)


    // ========== MAIN FUNCTION ==========

    async function generateGrowthSections(
      doc: any,
      astroData: AstroData
    ): Promise<void> {
      const pageWidth = doc.internal.pageSize.getWidth();

      // === Section Titles ===
      const growthSections: string[] = [
        "Next Steps: Using Insights & Remedies for Personal Growth",
        "Personalized Astro Guidance & Conclusion",
      ];

      // === Context Data ===
      const essentialAstroData: Record<string, any> = {
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

      // === Prompt Generator ===
      const getGrowthPrompt = (sectionTitle: string): string => {
        if (sectionTitle.includes("Next Steps")) {
          return `
You are a Vedic astrologer, life coach, and psychologist.  
Using the data below, write **"Next Steps: Using Insights & Remedies for Personal Growth"** in **3 short, warm, and inspiring paragraphs**.

GUIDELINES:
- Tone: **Empathetic, guiding, and practical.**
- Focus on **personal growth, emotional healing, and self-awareness.**
- Mention how to align with **strong planets** and improve weak ones.
- Suggest 2–3 **simple remedies** (e.g., meditation, gratitude, rituals).
- Avoid horoscope clichés. Make it **personal and actionable**.
- Use **bold** for key traits or advice.`;
        }

        if (sectionTitle.includes("Conclusion")) {
          return `
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
- Avoid repetition or generic text.`;
        }

        return "You are a Vedic astrologer. Generate insightful guidance text.";
      };

      // === Section Generator ===
      const fetchGrowthSection = async (sectionTitle: string): Promise<string> => {
        const fullPrompt = getGrowthPrompt(sectionTitle);

        try {
          const contextData = sectionTitle.includes("Next Steps")
            ? { essentialAstroData }
            : JSON.stringify(astroData);

          const raw = await callBedrock(fullPrompt, contextData);
          let text = removeMarkdown(raw || "");
          text = sanitizeText(text);
          text = normalizeBedrockText(text);
          text = text.replace(/&[a-z]+;/gi, "").replace(/[�]/g, "").trim();

          if (!text || typeof text !== "string" || text.trim() === "") {
            text = `<<<heading>>> ${sectionTitle}\n<content>No data could be generated for this section.</content>`;
          }

          return text;
        } catch (err) {
          console.error(`⚠️ Growth Section Error [${sectionTitle}]:`, err);
          return `<<<heading>>> ${sectionTitle}\n<content>Error generating this section.</content>`;
        }
      };

      // === Parallel Section Generation ===
      const resultGrowth: string[] = await Promise.all(
        growthSections.map((section) => fetchGrowthSection(section))
      );

      // === PDF Rendering ===
      for (let i = 0; i < growthSections.length; i++) {
        const sectionTitle = growthSections[i];
        const text = resultGrowth[i];
        startSection(doc, `${sectionTitle}`, `${sectionTitle}`);
        doc.addPage();
        markSectionPage(doc);
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(25, 25, 545, 792, "S");

        // === Title ===
        // === Title ===
        const maxTitleWidth = pageWidth - 120;

        // Split into lines normally
        let titleLines = doc.splitTextToSize(sectionTitle, maxTitleWidth);

        // Force maximum 2 lines ONLY
        if (titleLines.length > 2) {
          const firstLine = titleLines[0];

          // Merge all remaining text into 2nd line
          let secondLineText = titleLines.slice(1).join(" ");

          // Re-wrap second line to fit inside width
          let secondLine = doc.splitTextToSize(secondLineText, maxTitleWidth)[0];

          // If still too long, trim and add ellipsis
          if (secondLine.length > 80) {
            secondLine = secondLine.substring(0, 77) + "...";
          }

          titleLines = [firstLine, secondLine];
        }

        // Pick safe font size
        const titleFontSize = titleLines.length === 1 ? 24 : 20;
        const titleLineHeight = 26;

        doc.setFont("NotoSans", "bold");
        doc.setFontSize(titleFontSize);
        doc.setTextColor("#000");

        // Center both lines safely
        titleLines.forEach((line: string, idx: number) => {
          const yPos = 60 + idx * titleLineHeight;
          doc.text(line, pageWidth / 2, yPos, { align: "center" });
        });


        // doc.setFont("NotoSans", "bold");
        // doc.setFontSize(titleFontSize);
        // doc.setTextColor("#000");

        // // Center both lines
        // titleLines.forEach((line: string, idx: number) => {
        //   const yPos = 60 + idx * titleLineHeight;
        //   doc.text(line, pageWidth / 2, yPos, { align: "center" });
        // });

        // === Body ===
        if (text && text.trim().length > 0) {
          doc.setTextColor("#a16a21");
          addParagraphss(doc, text, 50, 120, pageWidth - 100);
        } else {
          doc.setFont("NotoSans", "italic");
          doc.setFontSize(15);
          doc.setTextColor("#a16a21");
          doc.text("⚠️ No content generated for this section.", 50, 120);
        }
      }
    }

    await generateGrowthSections(doc, astroData);
    // ---------- LAST PAGE: ABOUT TRUSTASTROLOGY.AI (with SVG design) ----------
    const generateAboutCompanyPage = async (doc: jsPDF) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      startSection(doc, "About TrustAstrology.ai", "About Us");
      // Add a new page
      doc.addPage();
      markSectionPage(doc);

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
      const pts: Array<{ x: number; y: number }> = [];
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

    // ========== FINALIZE: FILL TOC & SAVE ==========
    const filename = `Cosmic_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Fill the reserved TOC pages (page 2,3)
    fillComplexTOC(doc, tocPageStart, tocPageEnd, tocText);

    doc.save(filename);

    return { success: true };
  } catch (err: unknown) {
    console.error("Error generating report:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// (Optional leftover helpers, no longer used directly, safe to keep/remove)
function normalizeLabel(lbl: string) {
  return String(lbl || "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function findSectionForLabel(label: string) {
  if (!Array.isArray(__sectionRegistry)) return null;
  const norm = normalizeLabel(label);
  let found = __sectionRegistry.find(
    (e) => normalizeLabel(e.tocLabel || e.title) === norm
  );
  if (found) return found;
  found = __sectionRegistry.find((e) => {
    const s = normalizeLabel(e.tocLabel || e.title);
    return s.startsWith(norm) || norm.startsWith(s);
  });
  if (found) return found;
  found = __sectionRegistry.find((e) => {
    const s = normalizeLabel(e.tocLabel || e.title);
    return s.includes(norm) || norm.includes(s);
  });
  return found || null;
}

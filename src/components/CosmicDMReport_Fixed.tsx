import { jsPDF } from "jspdf";
import { generateReusableTableContent } from "./ReusableTableContent";
import removeMarkdown from "remove-markdown";
import Default from "../app/data/Default.json";
import "../../public/fonts/NotoSans-VariableFont_wdth,wght-normal.js";
import { readAstroJSON } from "@/server/readastrofile";

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

// Define specific keys for all data sections using mapped types
type AstroData = {
  [K in PlanetName as `planet_report_${K}`]: object;
} & {
  [K in PlanetName as `retrogrades_${K}`]: object;
} & {
  [K in PlanetName as `transit_dates_${K}`]: object;
} & {
  [`planetary_aspects_planets`]: object;
} & {
  [`planet_details`]: object;
};

function sanitizeText(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—|–/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/\u00A0/g, " ") // non-breaking spaces
    .replace(/\s+\n/g, "\n") // trim trailing spaces before newlines
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E]/g, "") // remove non-printable chars only
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

  const text = await res.text(); // first get text

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

  // 🧹 Remove reasoning tag
  const cleanedMessage = data.message?.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, "").trim() || "";
  console.log("🪄 Bedrock Output:", cleanedMessage);
  return cleanedMessage;
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

  // ✅ Draw first border
  drawPageBorder();

  const cleanMarkdown = (txt: string) =>
    txt.replace(/[*#_>|]/g, "").trim();

  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = cleanMarkdown(lines[i]);
    if (!line) continue;

    // ✅ Detect subheadings (full uppercase with colon)
    const isSubheading = /^[A-Z\s]+:$/.test(line);

    if (isSubheading) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(15);
      doc.setTextColor("#000");
    } else {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");
    }

    // ✅ Safely wrap long text within maxWidth
    const wrappedLines = doc.splitTextToSize(line, maxWidth);

    for (const wrappedLine of wrappedLines) {
      if (currentY + lineHeight > bottomLimit) {
        doc.addPage();
        drawPageBorder();
        addHeaderFooter(doc, doc.getNumberOfPages());
        currentY = getPageStartY();
      }

      // --- Markdown-style bold detection + UPPERCASE detection ---
      const parts = wrappedLine.split(/(\*\*.*?\*\*|\*.*?\*|#.*?#)/g);

      let currentX = x;

      for (const part of parts) {
        if (!part.trim()) continue;

        let isBold = false;
        let clean = part;

        // ✅ Detect markdown-based bold
        if (/^\*\*.*\*\*$/.test(part)) {
          isBold = true;
          clean = part.replace(/^\*\*|\*\*$/g, "");
        } else if (/^\*.*\*$/.test(part)) {
          isBold = true;
          clean = part.replace(/^\*|\*$/g, "");
        } else if (/^#.*#$/.test(part)) {
          isBold = true;
          clean = part.replace(/^#|#$/g, "");
        }

        clean = cleanMarkdown(clean);
        if (!clean) continue;

        // ✅ Also detect fully UPPERCASE segments (e.g. “CAREER”, “MOON IN CAPRICORN”)
        const isAllCaps =
          clean.length > 1 &&
          /^[A-Z0-9\s.,'’\-()]+$/.test(clean) &&
          /[A-Z]/.test(clean); // ensure at least one A–Z

        if (isAllCaps) {
          doc.setFont("NotoSans", "bold");
          doc.setTextColor("#000");
        } else {
          doc.setFont("NotoSans", "normal");
          doc.setTextColor("#a16a21");
        }

        // ✅ Ensure text doesn’t overflow horizontally
        const availableWidth = pageWidth - margin - currentX;
        const subLines = doc.splitTextToSize(clean, availableWidth);

        for (const subLine of subLines) {
          if (currentY + lineHeight > bottomLimit) {
            doc.addPage();
            drawPageBorder();
            addHeaderFooter(doc, doc.getNumberOfPages());
            currentY = getPageStartY();
          }

          doc.text(subLine, currentX, currentY);
          currentY += lineHeight;
          currentX = x; // reset to start of line
        }
      }

      currentY += 4; // add space between paragraphs
    }

    currentY += isSubheading ? 6 : 2;
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

  // === Step 1: Prepare Promises for all planets ===
  const planetPromises = PLANETS.map(async (planetName) => {
    const nameKey = planetName.toLowerCase() as PlanetName;

    const planetReport = AstroData[`planet_report_${nameKey}`];
    const retroData = AstroData[`retrogrades_${nameKey}`];
    const transitData = AstroData[`transit_dates_${nameKey}`];
    const aspectData = AstroData[`planetary_aspects_planets`];
    const planetdetails = AstroData[`planet_details`];

    if (!planetReport) {
      console.warn(`⚠️ No planet report found for ${planetName}`);
      return { planetName, text: `Report for ${planetName} not available.` };
    }

    const combinedData = {
      planetReport,
      retroData: retroData || null,
      transitData: transitData || null,
      aspectData: aspectData || null,
      planetdetails,
    };

    const prompt = `
You are an expert Vedic astrologer and storyteller.
Generate a structured, detailed report for ${planetName} based on the following combined data.

3.1 Planet Placement  
→ From "planetReport", describe its house, zodiac, degree, and Nakshatra.  
→ Interpret personality, focus, and life themes.

3.2 Planetary Aspects (Drishti)  
→ Explain which houses/zodiacs are aspected and how they affect life areas.

3.3 Planetary Strength & Nature (Shadbala & Report)  
→ Use "planetReport" data to describe its strength and nature (benefic/malefic).

3.4 KP Planetary Analysis  
→ Based on "planetReport" and general KP principles, analyze its significations and sublord influence.

3.5 Retrogrades & Transits  
→ Mention current retrograde or transit effects for 2025.

End with a short, uplifting **summary** of lessons and strengths.

Language: ${userData.language || "English"}
`;

    try {
      const text = await callBedrock(prompt, {combinedData});
      return { planetName, text: sanitizeText(text) };
    } catch (err) {
      console.error(`Error generating ${planetName} report:`, err);
      return { planetName, text: `Report for ${planetName} could not be generated.` };
    }
  });

  // === Step 2: Wait for all promises to finish ===
  const planetReports = await Promise.all(planetPromises);

  // === Step 3: Render each report sequentially into PDF ===
  for (const { planetName, text } of planetReports) {
    doc.addPage();
    addHeaderFooter(doc, doc.getNumberOfPages());
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`${planetName} Report`, pageWidth / 2, 95, { align: "center" });

    const nameKey = planetName.toLowerCase();
    const imageCode = nameKey.slice(0, 2);
    const imagePath = `/assets/planets/${imageCode}.jpg`;
    const imageY = 120;
    let imageHeight = 200;

    try {
      doc.addImage(imagePath, "JPG", pageWidth / 2 - 100, imageY, 200, imageHeight);
    } catch {
      console.warn(`⚠️ Image not found for ${planetName}`);
      imageHeight = 0;
    }

    let cursorY = imageY + imageHeight + 25;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#a16a21");

    const lineHeight = doc.getFontSize() * 1.5;
    const textWidth = contentWidth - 20;
    const lines = doc.splitTextToSize(text, textWidth);

    for (const line of lines) {
      if (cursorY + lineHeight > bottomLimit - 10) {
        doc.addPage();
        addHeaderFooter(doc, doc.getNumberOfPages());
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
        cursorY = marginY + 20;
      }
      doc.text(line, marginX + 10, cursorY);
      cursorY += lineHeight;
    }
  }
};
// Helper: convert SVG text to an HTMLImageElement (using Blob URL)
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

// Convert an SVG string directly to a PNG data URL (calls loadSVGTextAsImage)
async function svgTextToPngBase64(svgText: string, width: number, height: number): Promise<string> {
  const img = await loadSVGTextAsImage(svgText, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

/**
 * Generate a pure SVG string for a Kundli (D1) using the divisional chart object.
 * @param {Record<string, any>} chartObj - mapping numeric keys -> planet entries (like your JSON)
 * @param {number} size - pixel size for the SVG square (default 500)
 * @returns {string} SVG string (500x500 by default)
 */
function generateKundliSVG(chartObj: Record<string, any>, size = 500): string {
  // Build houses (12) with planet short names + (R) when retro
  const houses = Array.from({ length: 12 }, () => []);
  // note: chartObj keys are strings "0","1",...
  Object.keys(chartObj).forEach(k => {
    // skip non numeric keys like "chart" or "chart_name"
    if (!/^\d+$/.test(k)) return;
    const p = chartObj[k];
    // display short name and retro marker if retrofit
    const name = p.name || p.full_name || "";
    const display = p.retro ? `${name}(R)` : name;
    const houseIndex = (typeof p.house === "number") ? (p.house - 1) : (Number(p.house) - 1);
    if (!Number.isNaN(houseIndex) && houseIndex >= 0 && houseIndex < 12) {
      houses[houseIndex].push(display);
    }
  });

  // positions (x,y) roughly mapped from your previous left/top CSS rectangles (center points)
  const coords = [
    { x: 250, y: 125 }, // house 1
    { x: 125, y: 35 },  // house 2
    { x: 35, y: 125 },  // house 3
    { x: 125, y: 250 }, // house 4
    { x: 35, y: 375 },  // house 5
    { x: 125, y: 460 }, // house 6
    { x: 250, y: 375 }, // house 7
    { x: 375, y: 460 }, // house 8
    { x: 465, y: 375 }, // house 9
    { x: 375, y: 250 }, // house 10
    { x: 465, y: 125 }, // house 11
    { x: 375, y: 35 }   // house 12
  ];

  // create lines / border similar to your existing svg markup
  const stroke = "rgb(0,164,255)";
  const strokeWidth = 5;

  // build <text> tspans for each house (multi line)
  const houseTexts = houses.map((items, i) => {
    const lines = items.length ? items : [""]; // keep empty if none
    // join with tspan to place each on new line (dy increments)
    const tspans = lines.map((t, idx) =>
      `<tspan x="${coords[i].x}" dy="${idx === 0 ? '0' : '1.2em'}">${escapeXml(t)}</tspan>`
    ).join("");
    // large group with same font family and anchor middle
    return `<text x="${coords[i].x}" y="${coords[i].y}" font-family="Lucida Sans, Arial, Helvetica, sans-serif" font-size="14" fill="#535353" text-anchor="middle">${tspans}</text>`;
  }).join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="100%" height="100%" fill="#ffffff" />
    <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="3" y1="0" x2="3" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="${size - 3}" x2="${size}" y2="${size - 3}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size - 3}" y1="${size}" x2="${size - 3}" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="3" x2="${size}" y2="3" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="0" x2="0" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="0" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="${size}" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    <line x1="${size / 2}" y1="${size}" x2="0" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    ${houseTexts}
  </svg>`.trim();

  return svg;
}

// Simple XML-escape helper for placing text inside SVG safely
function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function addAllDivisionalChartsFromAstroData(doc: jsPDF, chartList: { chart_name: string }[], astroData: any) {
  const chartsPerPage = 2;
  const imgWidth = 340;
  const imgHeight = 300;
  const spacingY = 50;
  const marginTop = 100;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textColor = "#a16a21";

  // Step 1️⃣ — Filter only charts that exist in astrdata
  let divisionalCharts = chartList
    .map((item) => {
      const key = `divisional_chart_${item.chart_name.toLowerCase()}`;
      const chartData = astroData[key];
      if (!chartData) return null; // skip missing
      const chartNum = parseInt(item.chart_name.replace(/[^0-9]/g, ""), 10) || 0;
      return {
        chart_name: item.chart_name.toUpperCase(),
        chart_num: chartNum,
        chart_data: chartData
      };
    })
    .filter(Boolean);

  // Step 2️⃣ — Sort by number if available (so D1, D2, D9 etc. stay in order)
  divisionalCharts.sort((a, b) => a.chart_num - b.chart_num);

  // Step 3️⃣ — Render all charts
  for (let i = 0; i < divisionalCharts.length; i++) {
    const chartData = divisionalCharts[i];

    // New page every 2 charts
    if (i % chartsPerPage === 0) {
      if (i > 0) doc.addPage();

      // Border + Title
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#a16a21");
      doc.text("DIVISIONAL CHARTS", pageWidth / 2, 60, { align: "center" });
    }

    const positionInPage = i % chartsPerPage;
    const currentY = marginTop + positionInPage * (imgHeight + spacingY);

    // Chart label
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(16);
    doc.setTextColor(textColor);
    doc.text(`DIVISIONAL CHART - ${chartData.chart_name}`, pageWidth / 2, currentY - 10, { align: "center" });

    try {
      // Convert chart JSON → SVG → PNG
      const svgText = generateKundliSVG(chartData.chart_data, 500);
      const base64 = await svgTextToPngBase64(svgText, imgWidth, imgHeight);

      const xPos = (pageWidth - imgWidth) / 2;
      doc.addImage(base64, "PNG", xPos, currentY, imgWidth, imgHeight);
    } catch (err) {
      console.error(`Error rendering chart ${chartData.chart_name}`, err);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.text("Chart could not be loaded", pageWidth / 2, currentY + imgHeight / 2, { align: "center" });
    }
  }

  // Step 4️⃣ — Add header/footer to each page
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    addHeaderFooter(doc, pageNum);
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

  // ✅ Step 1: Extract only necessary fields
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

  // ✅ Step 2: Prepare structured prompts
  const prompts = simplifiedHouses.map((house: any) => ({
    house,
    prompt: `
You are an expert Vedic and KP astrologer.  
Generate a **well-structured, story-like analysis (700–1000 words)** for **House ${house.house}**, using this simplified KP-style JSON data.

Follow this exact section structure:
──────────────────────────────
2.1 Overview of 12 Houses  
2.2 House Lords & Significance  
2.3 House Strength using Ashtakvarga  
2.4 Effects of Planets in Houses  
2.5 KP Houses & Cuspal Analysis  
──────────────────────────────
Language: ${userData.language || "English"}.
`,
  }));

  // ✅ Step 3: Generate reports concurrently via AWS Bedrock API
const reports = await Promise.all(
  prompts.map(async ({ house, prompt }: { house: string; prompt: string }) => {
    const text = await callBedrock(prompt, {house});
    return { house, text: sanitizeText(text) };
  })
);


  // ✅ Step 4: Render each house report into the PDF
  for (const { house, text } of reports) {
    doc.addPage();
    addHeaderFooter(doc, doc.getNumberOfPages());

    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text(`House ${house.house}`, pageWidth / 2, 70, { align: "center" });

    // 🖼️ Load & render image
    const imagePath = `/assets/houses/${house.house}.jpg`;
    const imageY = 100;
    const imageWidth = 250;

    const imageHeight = await new Promise<number>((resolve) => {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        const height = imageWidth * aspectRatio;
        const imageX = (pageWidth - imageWidth) / 2;
        doc.addImage(img, "JPG", imageX, imageY, imageWidth, height);
        resolve(height);
      };
      img.onerror = () => resolve(0);
    });

    let cursorY = imageY + imageHeight + 25;
    const lineHeight = 24;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#a16a21");
    const usableWidth = contentWidth - 30;
    const lines = doc.splitTextToSize(text, usableWidth);

    for (const line of lines) {
      if (cursorY + lineHeight > bottomLimit - 10) {
        doc.addPage();
        addHeaderFooter(doc, doc.getNumberOfPages());
        doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
        cursorY = marginY + 30;
      }
      doc.text(line, marginX + 15, cursorY);
      cursorY += lineHeight;
    }
  }
};

// --- Enhanced function with table content integration ---
export async function generateAndDownloadFullCosmicReportWithTable(
  name: string,
  dob: string,
  time: string,
  place: string,
  lat: number,
  lon: number,
  userData: UserData
) {
  try {
    const astroData = await readAstroJSON("Saurabh_astro_data.json");

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
    const generateIntroSections = async (doc: jsPDF, userData: UserData) => {
      const pageWidth = doc.internal.pageSize.getWidth();

      // Helper for PDF layout
      const addPageWithTitle = (title: string, useNewPage = true) => {
        if (useNewPage) doc.addPage();
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(25, 25, 545, 792, "S");
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(26);
        doc.setTextColor("#000");
        doc.text(title, pageWidth / 2, 60, { align: "center" });
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(16);
        doc.setTextColor("#a16a21");
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
      addParagraphs(doc, disclaimerText, 50, 100, pageWidth - 100);

      addPageWithTitle("MESSAGE FROM THE AUTHOR", true);
      addParagraphs(doc, authorText, 50, 100, pageWidth - 100);

      addPageWithTitle("BEST WAY TO STUDY THE REPORT", true);
      addParagraphs(doc, studyText, 50, 100, pageWidth - 100);
    };

    await generateIntroSections(doc, userData);
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

// ✅ Structured payload — JSON and prompt separated
let text = await callBedrock(fullPrompt, {minimalAstroData});
text = sanitizeText(text);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.text("Lucky Number & Color (Nakshatra Based)", pageWidth / 2, 60, { align: "center" });
    addParagraphs(doc, text, 50, 100, pageWidth - 100);
    doc.addPage();

    // Generate SVG
    await addAllDivisionalChartsFromAstroData(doc, [
      { chart_name: "chalit" },
      { chart_name: "d9" },
      { chart_name: "d10" },
      { chart_name: "d7" },
      { chart_name: "d45" },
      { chart_name: "d27" },
      { chart_name: "d5" },
      { chart_name: "d8" },
      { chart_name: "d20" },
      { chart_name: "d4" },
      { chart_name: "d1" },
      { chart_name: "d2" },
      { chart_name: "d12" },
      { chart_name: "d16" },
      { chart_name: "d30" },
      { chart_name: "d60" },
      { chart_name: "d3s" },
      { chart_name: "d3" },
      { chart_name: "sun" },
      { chart_name: "moon" },
      { chart_name: "kp_chalit" },
      { chart_name: "transit" },
    ], astroData);

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

      let text = await callBedrock(fullPrompt, {filteredData});
      text = sanitizeText(text);
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
      addParagraphs(doc, texts, 50, 100, pageWidth - 100);
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

   let personalityText = await callBedrock(personalityPrompt, {astroData}); 
   personalityText = sanitizeText(personalityText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("1.5 Personality Traits & Characteristics", pageWidth / 2, 60, { align: "center" });
    doc.setTextColor("#a16a21");
    addParagraphs(doc, personalityText, 50, 100, pageWidth - 100);

    await generateHouseReports(doc, astroData, userData);

    await generatePlanetReportsWithImages(doc, astroData, userData);
    // Add initial "Love and Marriage" page

    function boldTextBeforeColonString(text: string): string {
      return text.replace(/(^|\n)([^:\n]+):/g, (_, prefix, beforeColon) => {
        return `${prefix}**${beforeColon.trim()}**:`; // mark bold section
      });
    }

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

    const sections = [
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

      // Dynamically select JSON keys relevant to this section
      let requiredKeys = [];

      if (lowerPrompt.includes("moon sign") || lowerPrompt.includes("nakshatra")) {
        requiredKeys = [
          "find_moon_sign",
          "find_sun_sign",
          "find_ascendant",
          "planet_details",
          "personal_characteristics",
        ];
      } else if (lowerPrompt.includes("planetary positions")) {
        requiredKeys = [
          "planet_details",
          "planetary_aspects_planets",
          "planetary_aspects_houses",
          "planets_in_houses",
          "kp_planets",
          "kp_houses",
        ];
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
        requiredKeys = [
          "yoga_list",
          "mangal_dosh",
          "manglik_dosh",
          "kaalsarp_dosh",
          "pitra_dosh",
          "papasamaya",
        ];
      } else if (lowerPrompt.includes("dasha")) {
        requiredKeys = [
          "maha_dasha",
          "maha_dasha_predictions",
          "antar_dasha",
          "char_dasha_main",
          "char_dasha_sub",
          "yogini_dasha_main",
          "yogini_dasha_sub",
        ];
      } else {
        // Default fallback keys
        requiredKeys = [
          "planet_details",
          "find_moon_sign",
          "find_ascendant",
          "planets_in_houses",
        ];
      }

      // Filter astroData to include only necessary keys
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // Compose a short, efficient prompt
      const fullPrompt = `
You are a Vedic astrologer specializing in Love and Marriage astrology.

Generate a professional, unique, and section-specific report for this topic:
"${sectionPrompt}"

Follow these rules:
- If NOT the "Yogas & Doshas" section, ignore yoga_list or dosha data.
- Focus only on this section’s topic (no overlap or repetition).
- Use natural subheadings written in uppercase and wrapped in double asterisks.
- Write 2–4 concise paragraphs (no markdown or list syntax).
- Avoid heavy Sanskrit; keep explanations practical and clear.
- Make it PDF-ready (no #, *, or special markdown symbols).

User Language: ${userData.language}

`;

      let text = await callBedrock(fullPrompt, {filteredData});
      text = sanitizeText(text);
      return text;
    }

    // Add new page for this section
    const resultlove = await Promise.all(sections.map(fetchLoveSection));

    // Now render all sections into the PDF
    for (let i = 0; i < sections.length; i++) {
      const sectionPrompt = sections[i];
      const text = resultlove[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      // Render text with styled subheadings
      //const formatedtext = boldTextBeforeColonString(text);
      addParagraphs(doc, text, 50, 100, pageWidth - 100);
      //drawHtmlLikeText(doc, text, 50, 100, 8, pageWidth - 100);
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
      const requiredKeys = [
        // Key Houses, Planets, and Yogas
        "planet_details",
        "planets_in_houses",
        "kp_houses",
        "kp_planets",
        "yoga_list",
        "shad_bala",

        // Career & Dashas
        "maha_dasha",
        "maha_dasha_predictions",
        "antar_dasha",
        "char_dasha_main",
        "char_dasha_sub",
        "yogini_dasha_main",
        "yogini_dasha_sub",

        // Divisional Chart (D10)
        "divisional_chart_D10",

        // Core Identity and Traits
        "find_ascendant",
        "find_moon_sign",
        "find_sun_sign",
        "jaimini_karakas",
        "ascendant_report",
        "personal_characteristics",
      ];

      // Filter only required parts from astroData
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      // Construct compact but informative prompt
      const fullPrompt = `
You are an expert Vedic astrologer specializing in professional and career astrology.

Generate a **unique and section-specific** report for this topic:
"${sectionPrompt}"

Guidelines:
- Focus only on this section’s theme (no overlap or repetition with other sections).
- Use plain, structured sentences or short bullet points.
- Avoid long paragraphs and Sanskrit-heavy terms.
- Suitable for PDF display (no markdown symbols).
- Use clear **UPPERCASE SUBHEADINGS** wrapped in double asterisks.
- Keep analysis insightful, practical, and concise.

User Language: ${userData.language}

`;

      let text= await callBedrock(fullPrompt, {filteredData});
      text = sanitizeText(text);
      return text;
    }

    // Run all API calls in parallel
    const results = await Promise.all(careerSections.map(fetchCareerSection));

    // Now render all sections into the PDF
    for (let i = 0; i < careerSections.length; i++) {
      const sectionPrompt = careerSections[i];
      const text = results[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");
      //const formatedtext = boldTextBeforeColonString(text);
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
      "Doshas in Vedic Astrology (Manglik, Pitra, Kaalsarp, Papasamaya): Identify and interpret major health-related doshas, explaining their origins, planetary causes, and potential impact on physical, mental, and emotional wellbeing. Provide an overview of their intensity and possible remedies.",
      "Planetary Influence on Health (Sun, Moon, Mars, Saturn, Rahu/Ketu): Analyze how these planets affect vitality, immunity, stress, and chronic conditions. Highlight benefic or malefic influences and how their positioning contributes to overall health and energy balance.",
      "Houses Related to Health (1st, 6th, 8th, 12th): Provide an in-depth reading of these houses and their lords to understand physical constitution, disease tendencies, recovery capacity, and karmic health challenges.",
      "Nakshatra & Moon Sign: Examine how the Nakshatra and Moon sign influence emotional resilience, mental balance, and psychosomatic patterns that can impact physical health.",
      "Ayurvedic Correlation (Vata, Pitta, Kapha Imbalances): Correlate planetary and elemental influences with Ayurvedic principles, identifying dominant doshas and potential imbalances affecting health and lifestyle.",
      "Remedies for Health-Related Doshas: Suggest appropriate Vedic, spiritual, and lifestyle remedies such as mantras, donations, fasting, yoga, or meditation to mitigate health doshas and strengthen overall wellbeing."
    ];

    async function fetchhealthsection(sectionPrompt: string) {
      const requiredKeys = [
        "mangal_dosh",
        "kaalsarp_dosh",
        "manglik_dosh",
        "pitra_dosh",
        "papasamaya",
        "planet_details",
        "find_moon_sign",
        "find_ascendant",
        "shad_bala",
        "kp_houses",
        "kp_planets",
        "yoga_list",
      ];

      // Filter astroData to only include necessary keys
      const filteredData = Object.fromEntries(
        Object.entries(astroData).filter(([key]) => requiredKeys.includes(key))
      );

      const fullPrompt = `
You are an expert Vedic astrologer specializing in health and wellbeing.
Using the provided JSON input, generate a professional, unique, and insightful health astrology report for this section:
${sectionPrompt}

Guidelines:
- Write clearly and concisely in short points or structured lines.
- Avoid repetition across sections.
- Make content suitable for clean PDF display (no markdown or special characters).
- Emphasize practical insights and remedies.
Formatting for Bold Text:
- Use double asterisks (**) around important terms or headings.
User Language: ${userData.language}

`;

     let text = await callBedrock(fullPrompt, {filteredData});
     text = sanitizeText(text);
      return text;
    }

    // Run all API calls in parallel
    const resulthealth = await Promise.all(healthSections.map(fetchhealthsection));

    // Now render all sections into the PDF
    for (let i = 0; i < healthSections.length; i++) {
      const sectionPrompt = healthSections[i];
      const text = resulthealth[i];

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      const sectionTitle = sectionPrompt.split(":")[0].trim(); // ✅ only use text before "—"
      const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 120);
      let titleY = 60;

      // Choose smaller font size if title is long
      const titleFontSize = titleLines.length > 1 ? 20 : 22;
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
        ascendant: astroData?.find_ascendant
      };

      const fullPrompt = `
You are an expert Vedic astrologer specializing in karmic evolution and life purpose.

Section: "${sectionPrompt}"

Write a detailed, client-ready report using the JSON data.
Focus on karmic meanings, emotional patterns, soul lessons, remedies, and transformation.
Avoid repetition across sections.

Tone & Format:
- Warm, spiritual yet practical.
- Use short paragraphs or bullet-style clarity.
- No markdown.
- Use **DOUBLE ASTERISKS** around subheadings or key terms for bold formatting.

language: ${userData.language}

`;

      let text = await callBedrock(fullPrompt, {minimalData});
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
      const fullPrompt = `
You are a Vedic astrologer. 
Generate a concise, insightful astrology report section titled:
"${sectionPrompt}"

Guidelines:
- Keep the tone warm, professional, and readable (no markdown or symbols).
- Use short paragraphs or structured lines instead of bulky text.
- Avoid repeating details across sections.
- Highlight **major planetary timings**, **themes**, and **practical insights**.
- Use double asterisks for bold text (**TERM**) to mark subheadings in PDF.
Language: ${userData.language}

`;

      let text = await callBedrock(fullPrompt, {essentialTimingData});
      text = sanitizeText(text);
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
        const mahaData =
          Default?.mahadasha_data?.mahadasha?.map((planet, i) => [
            planet,
            Default?.mahadasha_data?.mahadasha_order?.[i] ?? "N/A"
          ]) || [];

        cursorY = addPaginatedTable(doc, ["Planet", "Start Date"], mahaData, cursorY, PAGE_HEIGHT);
        cursorY += 20; // spacing after table
      }

      if (sectionPrompt.includes("Antardasha")) {
        (Default?.antardasha_data?.antardashas || []).forEach((antar, index) => {
          const antarData = antar.map((sub, i) => [
            sub,
            Default?.antardasha_data?.antardasha_order?.[index]?.[i] ?? "N/A"
          ]);
          const mahaName =
            Default?.mahadasha_data?.mahadasha?.[index] ?? `Mahadasha ${index + 1}`;

          cursorY = addPaginatedTable(
            doc,
            [`Antardasha ${mahaName}`, "Start Date"],
            antarData,
            cursorY,
            PAGE_HEIGHT
          );
          cursorY += 20;
        });
      }
      // --- Bold Mahadasha and Antardasha headings ---
      function applyTimingBolds(text: string) {
        let formatted = text;

        // 1️⃣ Bold Mahadasha / Antardasha headings (e.g., Mars Mahadasha, Rahu/Jupiter/Jupiter)
        formatted = formatted.replace(
          /\b([A-Za-z]+(?:\/[A-Za-z]+){0,2}\s+Mahadasha(?:\s+Insights)?|\b[A-Za-z]+\/[A-Za-z]+(?:\/[A-Za-z]+)?)\b/g,
          '**$1**'
        );

        // 2️⃣ Bold all date ranges inside parentheses
        formatted = formatted.replace(
          /\((Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+[A-Za-z]{3,9}\s+\d{1,2}\s+\d{4}\s*-\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+[A-Za-z]{3,9}\s+\d{1,2}\s+\d{4}\)/g,
          '**$&**'
        );

        // 3️⃣ Bold month-year ranges (e.g., October 2025 - November 2025)
        formatted = formatted.replace(
          /\b([A-Za-z]+\s+\d{4}\s*-\s*[A-Za-z]+\s+\d{4})\b/g,
          '**$1**'
        );

        // 4️⃣ Bold "Dasha:" and its immediate planetary combination
        formatted = formatted.replace(/(Dasha:\s*[A-Za-z\s\/]+)/g, '**$1**');

        // 5️⃣ Bold Transit headers (e.g., Sun Transits, Capricorn (Jan ...))
        formatted = formatted.replace(/\b([A-Za-z]+\s+Transits?)\b/g, '**$1**');
        formatted = formatted.replace(
          /\b([A-Za-z]+\s*\([A-Za-z]+\s*\d{1,2},\s*\d{4}\s*-\s*[A-Za-z]+\s*\d{1,2},\s*\d{4}\))\b/g,
          '**$1**'
        );

        // 6️⃣ Bold AI-based predictions section headers
        formatted = formatted.replace(
          /\b(AI[- ]?Based\s*12[- ]?Month\s*(Prediction|Forecast|Analysis)[^:]*)/gi,
          '**$1**'
        );

        // 7️⃣ Bold “Remedy”, “Career”, “Finance”, “Health”, “Relationship”, “Family”, etc.
        formatted = formatted.replace(
          /\b(Remedy|Career|Finance|Health|Relationship|Family|Actionable Guidance)\s*:/g,
          '**$1:**'
        );

        return formatted;
      }

      // --- CONTENT (ALWAYS SHOW AFTER TABLES) ---
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(14);
      doc.setTextColor("#000");
      const formattedText = boldTextBeforeColonString(applyTimingBolds(text));
      addParagraphs(doc, formattedText, 50, cursorY, pageWidth - 100);
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
      //const pageNumber = () => doc.getNumberOfPages();
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

      // --- DRAW FOOTER WITH PAGE NUMBER ---
      // const drawFooter = () => {
      //   addHeaderFooter(doc,);
      //   const footerY = pageHeight - 20;
      //   doc.setFont("NotoSans", "italic");
      //   doc.setFontSize(10);
      //   doc.setTextColor("#999");
      //   doc.text(
      //     `Page ${pageNumber()}`,
      //     pageWidth / 2,
      //     footerY,
      //     { align: "center" }
      //   );
      // };

      // --- DRAW HEADER ROW ---
      const drawHeader = (yPos: number) => {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(16);
        doc.setFillColor(161, 106, 33);
        doc.setTextColor(255, 255, 255);
        doc.rect(startX, yPos - 7, tableWidth, LINE_HEIGHT, "F");

        headers.forEach((header, i) => {
          doc.text(header, startX + i * colWidth + 10, yPos, {
            align: "left",
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

        // Text cells
        data[i].forEach((cell: string, j: number) => {
          const align = j === 1 ? "right" : "left";
          doc.text(cell, startX + j * colWidth + 10, y + textPaddingY, {
            align,
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

    const remediesSections = [
      "Rudraksha Guidance & Recommendations — Provide personalized Rudraksha recommendations based on planetary afflictions, Nakshatra, and emotional balance. Explain the significance of each Rudraksha bead and how it supports healing, protection, and spiritual growth.",
      "Gemstone Remedies & Gem Details — Suggest auspicious gemstones aligned with the native’s planetary strengths and weaknesses. Include details such as gemstone type, weight, metal, wearing day, and purification process for optimal energy alignment.",
      "Mantra Chanting & Yantra Suggestions — Recommend suitable mantras and yantras to strengthen benefic planets, reduce malefic influences, and promote inner peace. Describe correct chanting procedures, frequencies, and yantra placement guidelines.",
      "Charitable Actions & Spiritual Practices — Outline meaningful donations, fasting rituals, or service acts associated with specific planets or doshas. Provide suggestions for meditation, pranayama, and other practices that enhance spiritual evolution and planetary harmony.",
      "Sade Sati & Dosha Remedies — Offer targeted remedies to mitigate the effects of Sade Sati, Kaalsarp, Mangalik, or other doshas. Include gemstone, mantra, and lifestyle solutions aimed at restoring balance and reducing karmic obstacles."
    ];
    const essentialRemediesData = {
      // Core Horoscope
      planet_details: astroData.planet_details,
      find_moon_sign: astroData.find_moon_sign,
      find_sun_sign: astroData.find_sun_sign,
      find_ascendant: astroData.find_ascendant,
      current_sade_sati: astroData.current_sade_sati,
      yoga_list: astroData.yoga_list,

      // Doshas
      mangal_dosh: astroData.mangal_dosh,
      kaalsarp_dosh: astroData.kaalsarp_dosh,
      manglik_dosh: astroData.manglik_dosh,
      pitra_dosh: astroData.pitra_dosh,
      papasamaya: astroData.papasamaya,

      // Dashas
      maha_dasha: astroData.maha_dasha,
      antar_dasha: astroData.antar_dasha,
      paryantar_dasha: astroData.paryantar_dasha,

      // Remedies & Extended
      gem_suggestion: astroData.gem_suggestion,
      rudraksh_suggestion: astroData.rudraksh_suggestion,
      gem_details: astroData.gem_details,
      varshapal_details: astroData.varshapal_details,
    };

    // --- Loop through each remedies sub-section ---
    async function fetchRemediesSection(sectionPrompt: string) {
      const fullPrompt = `
You are a compassionate and experienced Vedic astrologer.
Write a short, natural-language remedies section titled:
"${sectionPrompt}"

Guidelines:
- 2–3 clear paragraphs, no markdown or lists.
- Use **DOUBLE ASTERISKS** around important words for PDF bolding.
- Keep a warm and hopeful tone.
- Focus on *why* each remedy works, not only *what* it is.
- Avoid repetition across sections.

Language: ${userData.language}
`;

      let text = await callBedrock(fullPrompt, {essentialRemediesData}); 
      text= sanitizeText(text); 
      return text;
    }

    // Run all API calls in parallel
    const resultremedic = await Promise.all(remediesSections.map(fetchRemediesSection));

    // Now render all sections into the PDF
    for (let i = 0; i < remediesSections.length; i++) {
      const sectionPrompt = remediesSections[i];
      const text = resultremedic[i];

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

    // --- Loop through each advanced calculation sub-section ---
    async function fetchAdvanceSection(sectionPrompt: string) {
      const fullPrompt = `
You are a skilled Vedic astrologer.
Write a concise, insightful analysis titled:
"${sectionPrompt}"

Focus on clarity, accuracy, and a warm tone.
Use 2–3 short paragraphs, optionally grouped by subtopics like "Strength:", "Impact:", or "Guidance:".
No markdown or symbols — only plain text.
Use **DOUBLE ASTERISKS** for bold words (converted later to PDF bold text).
Avoid repetition and fictional data.

Language: ${userData.language}
`;
      // --- API Call ---
    let text = await callBedrock(fullPrompt, {essentialAdvancedData});
    text= sanitizeText(text);
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
      // --- Section Title (cleaner layout) ---
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

      titleY += titleLines.length * titleLineHeight + 10; // add extra gap below title
      // move Y down for next content

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");
      //const formatedtext = boldTextBeforeColonString(text);
      addParagraphs(doc, text, 50, 100, pageWidth - 100);
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
You are a kind, skilled Vedic astrologer.
Write a short, insightful narrative section titled:
"${sectionPrompt}"

Use warm, clear language and 2–3 compact paragraphs.
No markdown, lists, or symbols. Use **DOUBLE ASTERISKS** around subheadings or key words for bold text.
Avoid repeating info from other sections.

Language: ${userData.language}
`;

  try {
    let text = await callBedrock(fullPrompt, essentialPanchangData);
    text = sanitizeText(text);

    if (!text || typeof text !== "string" || text.trim() === "") {
      text = "Astrological data for this section is currently unavailable.";
    }
    return text;
  } catch (err) {
    console.error("⚠️ Panchang Bedrock Error:", err);
    return "Astrological data for this section is currently unavailable.";
  }
}

// --- Run all API calls in parallel ---
const resultpanchang = await Promise.all(panchangSections.map(fetchpanchangSection));

// --- Render all sections ---
for (let i = 0; i < panchangSections.length; i++) {
  const sectionPrompt = panchangSections[i];
  let text = resultpanchang[i];

  let sectionTitle = sectionPrompt.split("—")[0].trim();
  sectionTitle = sectionTitle.replace(/[-:]+$/, "").trim();

  const firstLine = text.split("\n")[0].trim();
  if (firstLine.toLowerCase().includes(sectionTitle.toLowerCase())) {
    text = text.split("\n").slice(1).join("\n").trim();
  }

  doc.addPage();
  doc.setDrawColor("#a16a21");
  doc.setLineWidth(1.5);
  doc.rect(25, 25, 545, 792, "S");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#000");

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleLines = doc.splitTextToSize(sectionTitle, pageWidth - 100);
  let titleY = 70;

  titleLines.forEach((line:string, index:number) => {
    doc.text(line, pageWidth / 2, titleY + index * 24, { align: "center" });
  });

  const startY = titleY + titleLines.length * 30;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#a16a21");

  addParagraphs(doc, text, 50, startY, pageWidth - 100);
}


    // Generate "12 Q&A & Personalized Advice" section
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // --- Generate 12–15 Personalized Questions (Categorized) ---
    async function generateSpecificQuestions(fullData: Record<string, any>, userLanguage: string) {
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
      const astroData = await readAstroJSON("astro_data.json");

      const pageWidth = doc.internal.pageSize.getWidth();

      // Step 1: Generate predictive questions
      const questionSections = await generateSpecificQuestions(astroData, userLanguage);

      // Step 2: Generate answers in parallel
      const allSectionPromises = Object.entries(questionSections).map(async ([section, questions]) => {
        const questionAnswerPairs = await Promise.all(
          questions.map(async (question, index) => {
            await sleep(index * 200);
            const answer = await generateAnswer(question, astroData);
            return `**Question:** ${question}\n**Answer:** ${answer}\n`;
          })
        );
        return `${section}:\n${questionAnswerPairs.join("\n")}`;
      });

      const resolvedSections = await Promise.all(allSectionPromises);
      const fullQA = resolvedSections.join("\n\n");

      // Step 3: Add Q&A Page
      doc.addPage();
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#000");
      doc.text("Personalized Predictive Q&A", pageWidth / 2, 60, { align: "center" });

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21")
      addParagraphs(doc, fullQA, 50, 100, pageWidth - 100);

      // Step 5: Footer for all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 830, { align: "center" });
      }

      return doc;
    }

    async function generateAnswer(question: string, fullData: Record<string, any>, retryCount = 0): Promise<string> {
      const prompt = `
You are a Vedic astrologer. Answer briefly and clearly in 6–8 sentences.

Question: "${question}"
Language: English

Guidelines:
- Give a predictive answer based on the data.
- Mention key planets or yogas influencing the outcome if visible.
- Avoid long explanations or lists.
- End with one short, practical suggestion if suitable.

`;

      try {
        let ans = await callBedrock(prompt, {fullData});
        ans = sanitizeText(ans);
        return ans.replace(/[*_~`]/g, "");
      } catch (err) {
        if (retryCount < 2) {
          await sleep(1500);
          return generateAnswer(question, fullData, retryCount + 1);
        }
        return `Answer: Unable to generate due to network error.`;
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

    let nextstepText= await callBedrock(nextstepPrompt, {essentialAstroData});
    nextstepText= sanitizeText(nextstepText);
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
    addParagraphs(doc, nextstepText, 50, 140, pageWidth - 100);

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

   let conclusionText= await callBedrock(ConclusionPrompt, {astroData});
   conclusionText= sanitizeText(conclusionText);
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
    addParagraphs(doc, conclusionText, 50, 100, pageWidth - 100);
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
import { jsPDF } from "jspdf";
import { generateReusableTableContent } from "./ReusableTableContent";
import "../../public/fonts/NotoSans-VariableFont_wdth,wght-normal.js";
import { readAstroJSON } from "@/server/readastrofile";
import removeMarkdown from "remove-markdown";

// ---------- AUTO-GENERATED TOC & OUTLINE HELPERS (INSERTED) ----------
type SectionEntry = { title: string; anchor: string; page: number; tocLabel?: string; outlineParent?: string };

const __sectionRegistry: SectionEntry[] = [];

function makeAnchor(title: string) {
  return title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Register a section. Call BEFORE you create the page content (before doc.addPage())
 */
function startSection(doc: jsPDF, title: string, tocLabel?: string, outlineParent?: string) {
  const anchor = makeAnchor(title);
  const existing = __sectionRegistry.find(s => s.anchor === anchor);
  if (existing) {
    existing.tocLabel = tocLabel || title;
    existing.outlineParent = outlineParent || existing.outlineParent;
    return existing;
  }
  const entry: SectionEntry = { title, anchor, page: doc.getNumberOfPages() || 1, tocLabel: tocLabel || title, outlineParent };
  __sectionRegistry.push(entry);
  try { (doc as any).addNamedDestination && (doc as any).addNamedDestination(anchor); } catch(e){}
  return entry;
}

/**
 * After calling doc.addPage(), call this to update the last started section with its real page number.
 */
function markSectionPage(doc: jsPDF) {
  const last = __sectionRegistry[__sectionRegistry.length - 1];
  if (!last) return;
  last.page = doc.getNumberOfPages();
  try { (doc as any).addNamedDestination && (doc as any).addNamedDestination(last.anchor); } catch(e){}
}

/**
 * Build a clickable TOC (text on pages) AND PDF outline (sidebar) and insert TOC pages after cover.
 * afterPageIndex is the page index after which TOC should be inserted (1-based).
 */
function buildTOCAndInsertFront(doc: jsPDF, afterPageIndex = 1) {
  if (__sectionRegistry.length === 0) return;
  // Ensure entries have final page numbers (best-effort)
  __sectionRegistry.forEach(e => { if (!e.page || e.page < 1) e.page = 1; });
  // Sort by page for display
  __sectionRegistry.sort((a,b) => (a.page||0) - (b.page||0));

  // Create outline (sidebar) if supported
  try {
    if ((doc as any).outline) {
      const root = (doc as any).outline;
      // create a root group
      const tocRoot = root.add ? root.add("Table of Contents") : null;
      // map of parent anchors to nodes
      const nodeMap = {};
      for (const item of __sectionRegistry) {
        try {
          // add under parent if provided
          if (tocRoot && typeof tocRoot.add === "function") {
            const node = tocRoot.add(item.title);
            nodeMap[item.anchor] = node;
          }
        } catch(e){}
      }
    }
  } catch(e){}

  // Build TOC pages at the END first
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 18;
  const leftX = 50;
  const rightX = pageWidth - 80;

  // Create temporary array to hold created TOC page indices
  const tocPageIndices = [];

  // Function to create a new TOC page and return its page index
  function newTocPage() {
    startSection(doc, `Table of Contents`);
doc.addPage();
markSectionPage(doc);
const idx = doc.getNumberOfPages();
    tocPageIndices.push(idx);
    // border and title
    try {
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");
    } catch(e){}
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("Table of Contents", pageWidth / 2, 70, { align: "center" });
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(14);
    return { y: 100 };
  }

  // Start first TOC page
  let { y } = newTocPage();

  // Add each TOC line with clickable link and visible page number
  for (const item of __sectionRegistry) {
    if (y + lineHeight > pageHeight - 60) {
      const res = newTocPage();
      y = res.y;
    }
    const label = item.tocLabel || item.title;
    // print label and page number
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(14);
    doc.setTextColor("#000");
    doc.text(label, leftX, y, { maxWidth: pageWidth - 200 });
    doc.text(String(item.page), rightX, y);
    // clickable: prefer namedDest if available; else use link to pageNumber
    try {
      if ((doc as any).textWithLink) {
        (doc as any).textWithLink(label, leftX, y, { namedDest: item.anchor });
      } else if ((doc as any).link) {
        const w = doc.getTextWidth(label);
        (doc as any).link(leftX, y - 10, w + 4, lineHeight + 2, { pageNumber: item.page });
      }
    } catch(e){}
    y += lineHeight;
  }

  // Now attempt to move TOC pages to afterPageIndex
  try {
    const total = doc.getNumberOfPages();
    const internal = (doc as any).internal;
    const pages = internal.pages;
    // Build arrays (note: pages[0] is reserved)
    const before = pages.slice(1, afterPageIndex + 1);
    const tocPages = tocPageIndices.map(i => pages[i]);
    const rest = pages.filter((_, idx) => idx > afterPageIndex && !tocPageIndices.includes(idx));
    (doc as any).internal.pages = [pages[0], ...before, ...tocPages, ...rest];
  } catch(e) {
    // reordering may fail in some jspdf builds; ignore silently
  }

  // Final: add outline entries that point to pages (best-effort)
  try {
    const outlineRoot = (doc as any).outline;
    if (outlineRoot && typeof outlineRoot.add === "function") {
      const tocNode = outlineRoot.add ? outlineRoot.add("Table of Contents") : null;
      for (const item of __sectionRegistry) {
        try {
          if (tocNode && tocNode.add) {
            const node = tocNode.add(item.title);
            if (node && node.dest) {
              // set destination to page number if available
              // Many jspdf outline implementations accept a dest: { pageNumber }
              // This is best-effort; if not supported, it's harmless
              node.dest = { pageNumber: item.page };
            }
          }
        } catch(e){}
      }
    }
  } catch(e){}

}
// ---------- END TOC HELPERS ----------



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

function sanitizeText(text: string): string {
  return text
    // Fix artifacts like t�h�e� => the
    .replace(/([a-zA-Z])[\u0000-\u001F\u200B-\u206F\uFEFF\u00AD\uFFFD�]+([a-zA-Z])/g, "$1$2")

    // ✅ Preserve real " & " (with spaces around it)
    .replace(/(\s)&(\s)/g, "$1__AMP_PLACEHOLDER__$2")

    // ✅ Remove ampersands between letters (e.g., p&r&a&c&t&i&c&e => practice)
    .replace(/([a-zA-Z])&(?=[a-zA-Z])/g, "$1")
    .replace(/&(?=[a-zA-Z])/g, "")
    .replace(/([a-zA-Z])&/g, "$1")

    // Remove any leftover isolated ampersands
    .replace(/&+/g, "")

    // Restore preserved " & "
    .replace(/__AMP_PLACEHOLDER__/g, "&")

    // Remove known HTML entities (&amp;, &#160;, etc.)
    .replace(/&[a-zA-Z#0-9]+;/g, "")

    // Convert smart quotes and dashes to ASCII
    .replace(/[“”«»„]/g, '"') // Double quotes
    .replace(/[‘’‚‛]/g, "'")  // Single quotes
    .replace(/[–—―−]/g, "-")  // Dashes
    .replace(/[•∙·⋅]/g, "*")  // Bullets
    .replace(/[…]/g, "...")   // Ellipsis
    .replace(/[°º˚]/g, "°")   // Degrees
    .replace(/[×✕✖]/g, "x")   // Multiplication signs
    .replace(/[‐-‒⁃]/g, "-")  // Hyphen variants

    // Remove invisible or special spacing chars
    .replace(/[\u200B-\u200F\uFEFF\u034F\u061C\u00AD]/g, "")

    // Normalize composed form
    .normalize("NFKC")

    // Remove non-text control characters
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, "")

    // Collapse multiple spaces/newlines
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")

    // Trim final whitespace
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


  console.log("✅ Normalized Bedrock message:", message);
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
function normalizeBedrockText(xmlText: string): string {
  return xmlText
    // Remove invisible characters & excess whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n\s*\r?\n/g, "\n") // collapse multiple newlines
    .replace(/\s{2,}/g, " ") // compress spaces
    .trim();
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

  // -------------------------------
  // Draw border for new page
  // -------------------------------
  const drawBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
  };

  // -------------------------------
  // Page break helper
  // Returns the (possibly updated) cursorY so callers can assign it.
  // -------------------------------
  const addNewPageIfNeeded = (estimatedHeight = 40): number => {
    if (cursorY + estimatedHeight > bottomLimit - 10) {
      doc.addPage();
      if (typeof addHeaderFooter === "function") {
        addHeaderFooter(doc, doc.getNumberOfPages());
      }
      drawBorder();
      cursorY = margin + 40;
    }
    return cursorY;
  };

  // -------------------------------
  // Clean raw text but KEEP tags
  // -------------------------------
  const text = rawText
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (!text) return cursorY;

  // Tag regex
  const tagRegex = /(<<<heading>>>|<<subheading>>|<content>|<\/content>)/g;
  const segments = text.split(tagRegex).filter(Boolean);

  let currentTag: string | null = null;

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // -------------------------------
    // Detect tags
    // -------------------------------
    if (trimmed === "<<<heading>>>") { currentTag = "heading"; continue; }
    if (trimmed === "<<subheading>>") { currentTag = "subheading"; continue; }
    if (trimmed === "<content>") { currentTag = "content"; continue; }
    if (trimmed === "</content>") { currentTag = null; continue; }

    // -------------------------------
    // HEADINGS
    // -------------------------------
    if (currentTag === "heading") {
      const cleanHeading = trimmed.replace(/<\/?[^>]+(>|$)/g, "");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(20);
      doc.setTextColor("#000");

      addNewPageIfNeeded(lineHeight * 2);

      const wrappedHeading = doc.splitTextToSize(cleanHeading, usableWidth);
      wrappedHeading.forEach((line:string) => {
        cursorY = addNewPageIfNeeded(lineHeight);
        doc.text(line, pageWidth / 2, cursorY, { align: "center" });
        cursorY += lineHeight * 1.1;
      });

      cursorY += lineHeight * 0.6;
      currentTag = null;
      continue;
    }

    // -------------------------------
    // SUBHEADINGS
    // -------------------------------
    if (currentTag === "subheading") {
      const cleanSub = trimmed.replace(/<\/?[^>]+(>|$)/g, "");

      doc.setFont("NotoSans", "semibold");
      doc.setFontSize(17);
      doc.setTextColor("#a16a21");

      addNewPageIfNeeded(lineHeight * 2);

      const wrappedSub = doc.splitTextToSize(cleanSub, usableWidth);
      wrappedSub.forEach((line:string) => {
        cursorY = addNewPageIfNeeded(lineHeight);
        doc.text(line, pageWidth / 2, cursorY, { align: "center" });
        cursorY += lineHeight * 1.1;
      });

      cursorY += lineHeight * 0.4;
      currentTag = null;
      continue;
    }

    // -------------------------------
    // CONTENT
    // -------------------------------
    if (currentTag === "content") {
      const listItems = trimmed.split(/<\/?li>/).filter((t) => t.trim() !== "");

      for (let item of listItems) {
        item = item.trim();
        if (!item) continue;

        // Extract bold segments
        const boldParts = item.split(/<\/?b>/);
        const lineParts: { text: string; bold: boolean }[] = [];
        let isBold = false;

        for (const part of boldParts) {
          if (part.trim() === "") {
            isBold = !isBold;
            continue;
          }
          lineParts.push({ text: part.trim(), bold: isBold });
          isBold = !isBold;
        }

        // --------------------
        // Bullet
        // --------------------
        const x = startX;

        addNewPageIfNeeded(lineHeight);

        doc.setFont("NotoSans", "normal");
        doc.setFontSize(15);
        doc.setTextColor("#a16a21");
        doc.text("•", x - 8, cursorY);

        // --------------------
        // Text of item
        // --------------------
        for (const part of lineParts) {
          const wrappedLines = doc.splitTextToSize(
            part.text,
            usableWidth - 25
          );

          for (const wLine of wrappedLines) {
            addNewPageIfNeeded(lineHeight);

            doc.setFont("NotoSans", part.bold ? "bold" : "normal");
            doc.setFontSize(15);
            doc.setTextColor("#000");

            doc.text(wLine, x, cursorY);
            cursorY += lineHeight * 0.9;
          }
        }

        cursorY += lineHeight * 0.4;
      }
    }
  }

  return cursorY;
}


function addParagraphss(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 14
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const bottomLimit = pageHeight - margin;
  let currentY = y;

  // --- Draw border on first page ---
  const drawPageBorder = () => {
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");
  };

  drawPageBorder();

  // --- Split paragraphs by double line breaks ---
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/) // preserve real paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const para of paragraphs) {
    // handle bold segments inside paragraph
    const segments = para.split(/(<b>.*?<\/b>)/g).filter(Boolean);

    for (const seg of segments) {
      const isBold = seg.startsWith("<b>") && seg.endsWith("</b>");
      const clean = seg.replace(/<\/?b>/g, "");

      doc.setFont("NotoSans", isBold ? "bold" : "normal");
      doc.setFontSize(16);
      doc.setTextColor("#a16a21");

      const lines = doc.splitTextToSize(clean, maxWidth);

      const adjustedLineHeight = lineHeight + 4;

      for (const line of lines) {
        if (currentY + adjustedLineHeight > bottomLimit) {
          doc.addPage();
          drawPageBorder();
          currentY = margin + 20;
        }

        doc.text(line, x, currentY);
        currentY += adjustedLineHeight;
      }
    }

    // paragraph spacing
    currentY += 10;
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

    // === PDF Page Setup ===
    doc.addPage();
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
      if (i > 0) startSection(doc, `DIVISIONAL CHARTS`);
doc.addPage();
markSectionPage(doc);
doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(26);
      doc.setTextColor("#a16a21");
      doc.text("DIVISIONAL CHARTS", pageWidth / 2, 70, { align: "center" });
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

    doc.addPage();
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


// --- Enhanced function with table content integration ---
export async function generateAndDownloadFullCosmicReportWithTable(
  name: string,
  dob: string,
  time: string,
  place: string,
  userData: UserData
) {
  try {
    const astroData = await readAstroJSON("astro_data_Saurabh.json");

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
    const tocText = `
1. About You

1.1 Your Basic Birth Details 
1.2 Your Lucky Number & Color 
1.3 Numerology Insights 
1.4 Your Personality Traits 
1.5 Chara Karakas & Life Purpose
1.6 Your Planet Overview 

2. Your Life Areas

2.1 The 12 Life Areas 
2.2 Main Influences 
2.3 Your Life Balance
2.4 Planet Effects 
2.5 Detailed Life Area Review 

3. Your Planets and Their Impact

3.1 Where Your Planets Are 
3.2 How They Work Together 
3.3 Your Strong Planets 
3.4 Planet Energy Review 
3.5 Planet Movements 

4. Love, Emotions & Relationships

4.1 Your Emotional Side 
4.2 Your Compatibility 
4.3 Your Relationship Style 
4.4 Planets of Love 
4.5 Marriage & Partnership 
4.6 Timing in Love 
4.7 Lessons in Love 
4.8 Darakaraka & Soulmate Planet 

5. Career & Success

5.1 Your Career Strengths 
5.2 Ideal Work Style 
5.3 Success Factors 
5.4 Turning Points 
5.5 Your Professional Future 
5.6 Mahadasha Career Influence 

6. Health & Wellbeing

6.1 Overall Health Picture 
6.2 Planet Influence on Health 
6.3 Mind-Body Connection 
6.4 Stress Triggers 
6.5 Simple Remedies 
6.6 Sade Sati & Mangalik Analysis 

7. Life Lessons & Purpose

7.1 Your Life Purpose 
7.2 Growth Phases 
7.3 Past-Life Connections 
7.4 Key Turning Points 
7.5 Learning Through Challenges 
7.6 Rahu-Ketu Axis 

8. Timing & Future Outlook

8.1 Major Life Phases 
8.2 Upcoming Events 
8.3 Year Ahead Forecast 
8.4 Planet Movements 
8.5 Overall Outlook 
9. Remedies & Positive Actions

9.1 Lucky Stones & Crystals 
9.2 Powerful Mantras 
9.3 Helpful Rituals 
9.4 Good Deeds & Charity 
9.5 Protection & Peace Tips 
9.6 Ishtdev & Yantra Guidance 
9.7 Rudraksha & Gemstone Remedies 

10. Deeper Insights 

10.1 Your Strength Map 
10.2 Planet Power Levels 
10.3 Detailed Life Charts 
10.4 Fine Timing Review 
10.5 Special Planet Effects 
10.6 Raj Yogas & Karmic Doshas 

11. Important Timings

11.1 Sunrise & Sunset on Birth Day 
11.2 Moonrise & Moonset
11.3 Auspicious Hours 
11.4 Planetary Hours 

12. Your Personal Guidance

12.1 Common Questions Answered
12.2 How to Use This Report 
12.3 Personal Growth Advice 
`;

    // --- PDF Rendering ---
    startSection(doc, `Table of Contents`);
doc.addPage();
markSectionPage(doc);
doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#000");
    doc.text("Table of Contents", pageWidth / 2, 70, { align: "center" });

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
    // console.log("RAW BEDROCK:", response);

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

    // console.log("After cleaning:", text);

    startSection(doc, `Lucky Number & Color (Nakshatra Based)`);
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
      "3.1 Mulank (Birth Number): Explain the influence of the Birth Number (radical_number) and its ruling planet (radical_ruler), personality traits, thinking patterns, emotional tendencies, favorable colors, metals, gemstones, friendly numbers, favorite deity, and mantra. End with how this number defines the person’s core identity and how to strengthen it.",
      "3.2 Bhagyank (Life Path Number): Describe the meaning of the Life Path (destiny) number — the person’s purpose, karmic journey, strengths, and challenges. Mention its harmony or contrast with the Birth Number and conclude with a practical insight for alignment.",
      "3.3 Success Number (Name Number): Explain how the name number influences career success, fame, and personal magnetism. Discuss compatibility using friendly, evil, and neutral numbers. Conclude with insights on how name vibrations affect destiny.",
      "3.4 Connection Number: Analyze the relationship between Birth, Destiny, and Name Numbers. Include the Personal Day Number interpretation and offer guidance for balancing energies using gemstones, colors, or affirmations. End with a motivational summary of their overall vibration."
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
    startSection(doc, `1.4 Personality Traits & Characteristics`);
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
    startSection(doc, `1.5 Chara Karakas & Life Purpose`);
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

    await generateHouseReports(doc, astroData, userData);

    await generatePlanetReportsWithImages(doc, astroData, userData);
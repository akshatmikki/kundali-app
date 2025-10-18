import { jsPDF } from "jspdf";
import { generateReusableTableContent, generateTableContentPrompt } from "./ReusableTableContent";
import removeMarkdown from "remove-markdown";
import Default from "../app/data/Default.json";

interface Planet {
  planetId: string; full_name: string; name: string; nakshatra: string; nakshatra_no: number; nakshatra_pada: number; retro: boolean;
};

interface House {
  house: string; rasi_no: number; zodiac: string; aspected_by_planet: string[]; aspected_by_planet_index: number[]; planets: Planet[]; cusp_sub_lord: string; cusp_sub_sub_lord: string; bhavmadhya: number;
};
const houses: House[] = [
  { house: '1', rasi_no: 10, zodiac: 'Capricorn', aspected_by_planet: [], aspected_by_planet_index: [], planets: [{ planetId: '0', full_name: 'Ascendant', name: 'As', nakshatra: 'Vishakha', nakshatra_no: 16, nakshatra_pada: 2, retro: false }, { planetId: '7', full_name: 'Saturn', name: 'Sa', nakshatra: 'Jyeshtha', nakshatra_no: 18, nakshatra_pada: 2, retro: false }], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 23.888 },
  { house: '2', rasi_no: 11, zodiac: 'Aquarius', aspected_by_planet: ['Moon', 'Rahu'], aspected_by_planet_index: [2, 8], planets: [], cusp_sub_lord: 'Rahu', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 24.682 },
  { house: '3', rasi_no: 12, zodiac: 'Pisces', aspected_by_planet: ['Mars'], aspected_by_planet_index: [3], planets: [], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 23.836 },
  { house: '4', rasi_no: 1, zodiac: 'Aries', aspected_by_planet: ['Sun', 'Jupiter', 'Rahu'], aspected_by_planet_index: [1, 5, 8], planets: [], cusp_sub_lord: 'Venus', cusp_sub_sub_lord: 'Saturn', bhavmadhya: 22.39 },
  { house: '5', rasi_no: 2, zodiac: 'Taurus', aspected_by_planet: ['Mercury', 'Venus'], aspected_by_planet_index: [4, 6], planets: [{ planetId: '8', full_name: 'Rahu', name: 'Ra', nakshatra: 'UttaraBhadra', nakshatra_no: 26, nakshatra_pada: 3, retro: true }], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Moon', bhavmadhya: 23.422 },
  { house: '6', rasi_no: 3, zodiac: 'Gemini', aspected_by_planet: ['Saturn', 'Ketu'], aspected_by_planet_index: [7, 9], planets: [{ planetId: '5', full_name: 'Jupiter', name: 'Ju', nakshatra: 'Ashvini', nakshatra_no: 1, nakshatra_pada: 2, retro: true }], cusp_sub_lord: 'Rahu', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 24.672 },
  { house: '7', rasi_no: 4, zodiac: 'Cancer', aspected_by_planet: [], aspected_by_planet_index: [], planets: [], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 23.888 },
  { house: '8', rasi_no: 5, zodiac: 'Leo', aspected_by_planet: ['Ketu'], aspected_by_planet_index: [9], planets: [], cusp_sub_lord: 'Rahu', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 24.682 },
  { house: '9', rasi_no: 6, zodiac: 'Virgo', aspected_by_planet: [], aspected_by_planet_index: [], planets: [{ planetId: '2', full_name: 'Moon', name: 'Mo', nakshatra: 'Punarvasu', nakshatra_no: 7, nakshatra_pada: 3, retro: false }], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 23.836 },
  { house: '10', rasi_no: 7, zodiac: 'Libra', aspected_by_planet: ['Ketu'], aspected_by_planet_index: [9], planets: [{ planetId: '1', full_name: 'Sun', name: 'Su', nakshatra: 'Magha', nakshatra_no: 10, nakshatra_pada: 2, retro: false }, { planetId: '3', full_name: 'Mars', name: 'Ma', nakshatra: 'Magha', nakshatra_no: 10, nakshatra_pada: 2, retro: false }, { planetId: '4', full_name: 'Mercury', name: 'Me', nakshatra: 'Magha', nakshatra_no: 10, nakshatra_pada: 2, retro: false }, { planetId: '6', full_name: 'Venus', name: 'Ve', nakshatra: 'Magha', nakshatra_no: 10, nakshatra_pada: 2, retro: false }], cusp_sub_lord: 'Sun', cusp_sub_sub_lord: 'Mercury', bhavmadhya: 22.39 },
  { house: '11', rasi_no: 8, zodiac: 'Scorpio', aspected_by_planet: ['Mars', 'Saturn'], aspected_by_planet_index: [3, 7], planets: [{ planetId: '9', full_name: 'Ketu', name: 'Ke', nakshatra: 'Hasta', nakshatra_no: 13, nakshatra_pada: 1, retro: true }], cusp_sub_lord: 'Saturn', cusp_sub_sub_lord: 'Sun', bhavmadhya: 23.422 },
  { house: '12', rasi_no: 9, zodiac: 'Sagittarius', aspected_by_planet: ['Jupiter', 'Rahu'], aspected_by_planet_index: [5, 8], planets: [], cusp_sub_lord: 'Rahu', cusp_sub_sub_lord: 'Rahu', bhavmadhya: 24.672 }
];

// --- Utilities for header/footer ---
const addHeaderFooter = (doc: jsPDF, pageNum: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Footer
  doc.text("© 2024 TrustAstrology. All rights reserved.", pageWidth / 2, pageHeight - 25, { align: "center" });
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

const generatePlanetReportsWithImages = async (doc: any, planets: Record<string, any>) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 25;
  const marginY = 25;
  const contentWidth = pageWidth - 2 * marginX;
  const bottomLimit = pageHeight - marginY;

  for (const planetKey in planets) {
    if (!planets.hasOwnProperty(planetKey)) continue;
    const planet = planets[planetKey];

    // Generate planet text using API (same as before)
    const planetPrompt = `
You are an expert Vedic astrologer and a skilled storyteller. 
Generate a detailed, immersive two-page narrative for the planet ${planet.full_name} (${planet.name}) without markdown and dont show me the page numbers also like this in page 2 or page 1. 

Include:
- Introduction and significance
- Zodiac sign and house placement
- Nakshatra, degrees, nakshatra lord and pada
- Retrograde or combust influences
- Planet’s condition (avastha) and lord status
- Personality traits, talents, struggles
- Aspects to other houses or planets
- Traditional Vedic references, mantras
- Insights on life lessons, growth, and destiny

JSON data for this planet: ${JSON.stringify(planet)}
`;
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: planetPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 3000 }
      })
    });
    const data = await response.json();
    let planetText = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      `Planet ${planet.full_name} report could not be generated.`;
    planetText = removeMarkdown(planetText);

    // Add new page
    doc.addPage();

    // Draw border
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");

    // Planet title
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text(`${planet.full_name} (${planet.name}) Report`, pageWidth / 2, 95, { align: "center" });

    // Planet image
    let imagePath = `/assets/planets/${planet.name}.jpg`;
    let imageY = 100;
    let imageHeight = 200;
    try {
      doc.addImage(imagePath, "JPG", pageWidth / 2 - 100, imageY, 200, imageHeight);
    } catch (err) {
      console.warn(`Image for planet ${planet.name} not found, skipping image.`);
      imageHeight = 0;
    }

    // Text starting after image
    let cursorY = imageY + imageHeight + 20; // padding below image
    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");
    const lineHeight = doc.getFontSize() * 1.5;

    // Split text into lines with proper width (taking left padding into account)
    const leftPadding = 10;
    const rightPadding = 10;
    const maxTextWidth = contentWidth - leftPadding - rightPadding;
    const lines = doc.splitTextToSize(planetText, maxTextWidth);

    for (const line of lines) {
      // Check bottom limit for text overflow
      if (cursorY + lineHeight > bottomLimit - 10) { // -10 for safety
        doc.addPage();
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
        cursorY = marginY + 20; // reset cursor for new page
      }
      doc.text(line, marginX + leftPadding, cursorY); // respect left padding
      cursorY += lineHeight;
    }
  }
};

// --- Utility function for paragraphs ---
// const addParagraphs = (doc: any, text: any, startX: any, startY: any) => {
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const maxWidth = pageWidth - startX - 40;
//   const lineHeight = 16;
//   const maxHeight = 750; // bottom margin cutoff
//   const lines = doc.splitTextToSize(text, maxWidth);
//   let y = startY;

//   for (let i = 0; i < lines.length; i++) {
//     if (y > maxHeight) {
//       doc.addPage();
//       doc.setDrawColor("#a16a21");
//       doc.setLineWidth(1.5);
//       doc.rect(25, 25, 545, 792, "S");
//       y = 50; // reset Y position for new page
//     }
//     doc.text(lines[i], startX, y);
//     y += lineHeight;
//   }
// };

function addParagraphs(doc: any, text: string, x: number, y: number, maxWidth: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const bottomLimit = pageHeight - margin; // space to stop before bottom
  const lineHeight = 20;
  const paragraphGap = 10;

  const paragraphs = text.split(/\n+/);

  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para.trim(), maxWidth);

    for (let i = 0; i < lines.length; i++) {
      // Check if next line will go beyond page height
      if (y + lineHeight > bottomLimit) {
        // --- Add new page ---
        doc.addPage();
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(25, 25, 545, 792, "S");

        y = margin + 10; // Reset Y position after adding new page
      }

      // Print the line
      doc.text(lines[i], x, y);
      y += lineHeight;
    }

    // Add space between paragraphs
    y += paragraphGap;
  });

  return y; // return final Y position for chaining
}

// // 1️⃣ Generate SVG chart
// function generateChartSVG(chartJson: ChartJson): string {
//   const width = 400;
//   const height = 400;
//   const border = 10;
//   const cx = width / 2;
//   const cy = height / 2;
//   const lineColor = "#a16a21";
//   const retroColor = "#c0392b";
//   const planetColor = "#f0e68c";
//   const svgBackground = "#000";

//   const svgParts: string[] = [
//     `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:${svgBackground}">`,
//     `<rect x="${border}" y="${border}" width="${width - 2 * border}" height="${height - 2 * border}" fill="none" stroke="${lineColor}" stroke-width="1.5"/>`
//   ];

//   // Draw the diamond layout (North Indian style)
//   const top = border;
//   const bottom = height - border;
//   const left = border;
//   const right = width - border;

//   svgParts.push(`
//     <line x1="${cx}" y1="${top}" x2="${right}" y2="${cy}" stroke="${lineColor}" stroke-width="1"/>
//     <line x1="${right}" y1="${cy}" x2="${cx}" y2="${bottom}" stroke="${lineColor}" stroke-width="1"/>
//     <line x1="${cx}" y1="${bottom}" x2="${left}" y2="${cy}" stroke="${lineColor}" stroke-width="1"/>
//     <line x1="${left}" y1="${cy}" x2="${cx}" y2="${top}" stroke="${lineColor}" stroke-width="1"/>
//     <line x1="${left}" y1="${cy}" x2="${right}" y2="${cy}" stroke="${lineColor}" stroke-width="1"/>
//     <line x1="${cx}" y1="${top}" x2="${cx}" y2="${bottom}" stroke="${lineColor}" stroke-width="1"/>
//   `);

//   // Define approximate house centers for text placement
//   const offset = (width - 2 * border) / 4;
//   const houseCenters: Record<number, [number, number]> = {
//     1: [cx, cy + offset * 0.8], // bottom center
//     2: [cx - offset * 0.6, cy + offset * 0.6],
//     3: [cx - offset, cy],
//     4: [cx - offset * 0.6, cy - offset * 0.6],
//     5: [cx, cy - offset * 0.8], // top center
//     6: [cx + offset * 0.6, cy - offset * 0.6],
//     7: [cx + offset, cy],
//     8: [cx + offset * 0.6, cy + offset * 0.6],
//     9: [cx + offset * 0.2, cy + offset * 0.2],
//     10: [cx, cy],
//     11: [cx - offset * 0.2, cy - offset * 0.2],
//     12: [cx - offset * 0.2, cy + offset * 0.2]
//   };

//   const houseOccupancy: Record<number, number> = {};

//   // Draw planets in their houses
//   for (const key in chartJson) {
//     if (key === "chart" || key === "chart_name") continue;
//     const planet = chartJson[key] as PlanetInfo;
//     const baseCoords = houseCenters[planet.house];
//     if (!baseCoords) continue;

//     const occupancy = houseOccupancy[planet.house] || 0;
//     const yOffset = occupancy * 14 - 8; // vertical stacking
//     houseOccupancy[planet.house] = occupancy + 1;

//     const fillColor = planet.retro ? retroColor : planetColor;

//     svgParts.push(`
//       <text 
//         x="${baseCoords[0]}" 
//         y="${baseCoords[1] + yOffset}" 
//         text-anchor="middle" 
//         font-size="12" 
//         fill="${fillColor}" 
//         font-family="Arial"
//       >
//         ${planet.name}
//       </text>
//     `);
//   }

//   // Chart title at bottom
//   svgParts.push(`
//     <text 
//       x="${cx}" 
//       y="${height - 10}" 
//       text-anchor="middle" 
//       font-size="14" 
//       fill="${lineColor}" 
//       font-weight="bold" 
//       font-family="Arial"
//     >
//       ${chartJson.chart_name || chartJson.chart || ""}
//     </text>
//   `);

//   svgParts.push(`</svg>`);
//   return svgParts.join("");
// }

// async function svgToBase64WithBackground(
//   svgText: string,
//   backgroundImagePath: string,
//   width: number,
//   height: number
// ): Promise<string> {
//   return new Promise<string>((resolve, reject) => {
//     // Create canvas
//     const canvas = document.createElement("canvas");
//     canvas.width = width;
//     canvas.height = height;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return reject("Canvas context not available");

//     // Load background image
//     const bgImg = new Image();
//     bgImg.crossOrigin = "anonymous";
//     bgImg.src = backgroundImagePath;

//     bgImg.onload = () => {
//       // Draw background
//       ctx.drawImage(bgImg, 0, 0, width, height);

//       // Create SVG image
//       const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
//       const url = URL.createObjectURL(svgBlob);
//       const svgImg = new Image();
//       svgImg.crossOrigin = "anonymous";
//       svgImg.src = url;

//       svgImg.onload = () => {
//         // Draw SVG on top of background
//         ctx.drawImage(svgImg, 0, 0, width, height);
//         URL.revokeObjectURL(url);

//         // Convert to Base64
//         const base64 = canvas.toDataURL("image/png");
//         resolve(base64);
//       };

//       svgImg.onerror = (err) => {
//         URL.revokeObjectURL(url);
//         reject("Error loading SVG image: " + err);
//       };
//     };

//     bgImg.onerror = (err) => {
//       reject("Error loading background image: " + err);
//     };
//   });
// }

// async function addAllDivisionalChartsFromJSON(
//   doc: any,
//   divisionalChartsData: any[],
//   backgroundImagePath: string
// ) {
//   const chartsPerPage = 2;
//   const imgWidth = 340;
//   const imgHeight = 300;
//   const spacingY = 50;
//   const marginTop = 100;
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const pageHeight = doc.internal.pageSize.getHeight();
//   const textColor = "#f0e68c";

//   for (let i = 0; i < divisionalChartsData.length; i++) {
//     const chartData = divisionalChartsData[i];

//     // Construct SVG URL
//     const chartType =
//       chartData.chart_name?.toLowerCase() ||
//       chartData.title?.toLowerCase() ||
//       chartData.chart?.toLowerCase() ||
//       "chalit";
//     const cleanChartType = chartType.replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
//     const svgUrl = `https://kundali.s3.ap-south-1.amazonaws.com/chart-image/d/website/${cleanChartType}/6706532ae537cb10d068d30c.svg`;

//     if (i % chartsPerPage === 0) {
//       if (i > 0) doc.addPage();
//       doc.setDrawColor("#a16a21");
//       doc.setLineWidth(1.5);
//       doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

//       // Header
//       doc.setFont("Times", "bold");
//       doc.setFontSize(22);
//       doc.setTextColor("#a16a21");
//       doc.text("DIVISIONAL CHARTS", pageWidth / 2, 60, { align: "center" });
//     }

//     const positionInPage = i % chartsPerPage;
//     const currentY = marginTop + positionInPage * (imgHeight + spacingY);

//     // Chart title
//     doc.setFont("Times", "bold");
//     doc.setFontSize(16);
//     doc.setTextColor(textColor);
//     doc.text(chartData.chart_name?.toUpperCase() || "Divisional Chart", pageWidth / 2, currentY - 10, {
//       align: "center",
//     });

//     try {
//       // Fetch SVG
//       const response = await fetch(svgUrl);
//       const svgText = await response.text();

//       // Convert SVG to Base64 with background
//       const base64 = await svgToBase64WithBackground(svgText, backgroundImagePath, imgWidth, imgHeight);

//       const xPos = (pageWidth - imgWidth) / 2;
//       doc.addImage(base64, "PNG", xPos, currentY, imgWidth, imgHeight);
//     } catch (err) {
//       console.error(`Error rendering chart ${chartData.chart_name}`, err);
//       doc.setFont("Times", "normal");
//       doc.setFontSize(14);
//       doc.text("Chart could not be loaded", pageWidth / 2, currentY + imgHeight / 2, {
//         align: "center",
//       });
//     }
//   }

//   // Add headers/footers
//   const totalPages = doc.getNumberOfPages();
//   for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
//     doc.setPage(pageNum);
//     addHeaderFooter(doc, pageNum);
//   }
// }

async function loadSVGAsImage(svgUrl: string): Promise<HTMLImageElement> {
  // Fetch the SVG as text
  const response = await fetch(svgUrl);
  if (!response.ok) throw new Error(`Failed to fetch SVG: ${response.statusText}`);
  const svgText = await response.text();

  // Encode as base64 data URL
  const base64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;

  // Create image element
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Failed to parse SVG into image: " + e));
  });
}

async function svgToBase64WithBackgroundCached(
  svgText: string,
  backgroundImage: HTMLImageElement,
  width: number,
  height: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("Canvas context not available");

    // Draw the background (which can now safely be SVG)
    ctx.drawImage(backgroundImage, 0, 0, width, height);

    // If overlay SVG exists, draw it
    if (svgText && svgText.trim() !== "") {
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const overlay = new Image();
      overlay.crossOrigin = "anonymous";
      overlay.src = url;

      overlay.onload = () => {
        ctx.drawImage(overlay, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };

      overlay.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject("Error loading overlay SVG: " + err);
      };
    } else {
      resolve(canvas.toDataURL("image/png"));
    }
  });
}

async function addAllDivisionalChartsFromJSON(
  doc: any,
  divisionalChartsData: any[]
) {
  const chartsPerPage = 2;
  const imgWidth = 340;
  const imgHeight = 300;
  const spacingY = 50;
  const marginTop = 100;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textColor = "#a16a21";

  // ✅ Fetch and convert your Google Drive SVG once
  const backgroundSvgUrl = "https://raw.githubusercontent.com/akshatmikki/chart-asset/refs/heads/main/6706532ae537cb10d068d30c.svg";
  const backgroundImage = await loadSVGAsImage(backgroundSvgUrl);

  for (let i = 0; i < divisionalChartsData.length; i++) {
    const chartData = divisionalChartsData[i];

    if (i % chartsPerPage === 0) {
      if (i > 0) doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");

      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#a16a21");
      doc.text("DIVISIONAL CHARTS", pageWidth / 2, 60, { align: "center" });
    }

    const positionInPage = i % chartsPerPage;
    const currentY = marginTop + positionInPage * (imgHeight + spacingY);

    doc.setFont("Times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(textColor);
    doc.text(chartData.chart_name?.toUpperCase() || "Divisional Chart", pageWidth / 2, currentY - 10, { align: "center" });

    try {
      // Use cached SVG background
      const overlaySvgText = chartData.svg || chartData.chart_svg || "";
      const base64 = await svgToBase64WithBackgroundCached(overlaySvgText, backgroundImage, imgWidth, imgHeight);
      const xPos = (pageWidth - imgWidth) / 2;
      doc.addImage(base64, "PNG", xPos, currentY, imgWidth, imgHeight);
    } catch (err) {
      console.error(`Error rendering chart ${chartData.chart_name}`, err);
      doc.setFont("Times", "normal");
      doc.setFontSize(14);
      doc.text("Chart could not be loaded", pageWidth / 2, currentY + imgHeight / 2, { align: "center" });
    }
  }

  // Add headers/footers
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    addHeaderFooter(doc, pageNum);
  }
}

// // Helper: Convert Blob → Base64
// async function blobToBase64(blob: Blob): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result as string);
//     reader.onerror = reject;
//     reader.readAsDataURL(blob);
//   });
// }

const generateHouseReports = async (doc: any, houses: House[]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 25;
  const marginY = 25;
  const contentWidth = pageWidth - 2 * marginX;
  const bottomLimit = pageHeight - marginY;

  // Generate reports sequentially for cleaner structure (similar to planet version)
  for (const house of houses) {
    const housePrompt = `
You are an expert astrologer and storyteller. 
Generate a detailed, story-like horoscope report (700–1000 words) for House ${house.house} (${house.zodiac}) 
from JSON data, but don't include the JSON itself or any markdown formatting.

Include:
- House Overview
- House Lord Significance
- House Strength (Ashtakvarga)
- Effects of Planets (nakshatra, retrograde, aspects)
- Personalized insights and real-life style examples
- A symbolic theme for this house (but only describe it naturally, not as “image reference”)

JSON data: ${JSON.stringify(house)}
`;

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: housePrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 2000 }
      })
    });

    const data = await response.json();
    let houseText = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      `House ${house.house} report could not be generated.`;
    houseText = removeMarkdown(houseText);

    // Add new page
    doc.addPage();

    // Draw border
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");

    // Title
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text(`House ${house.house}: ${house.zodiac}`, pageWidth / 2, 95, { align: "center" });

    // House image
    let imagePath = `/assets/houses/house${house.house}.jpg`;
    let imageY = 100;
    let imageHeight = 200;
    try {
      doc.addImage(imagePath, "JPG", pageWidth / 2 - 100, imageY, 200, imageHeight);
    } catch (err) {
      console.warn(`Image for House ${house.house} not found, skipping image.`);
      imageHeight = 0;
    }

    // Setup for text
    let cursorY = imageY + imageHeight + 20; // spacing below image
    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");

    const lineHeight = doc.getFontSize() * 1.5;
    const leftPadding = 10;
    const rightPadding = 10;
    const maxTextWidth = contentWidth - leftPadding - rightPadding;

    // Write text with automatic page breaks
    const textMarginX = marginX + 15; // small internal left margin
    const usableWidth = pageWidth - marginX * 2 - 30; // space for both 

    const lines = doc.splitTextToSize(houseText, usableWidth);

    for (const line of lines) {
      if (cursorY + lineHeight > bottomLimit - 10) {
        doc.addPage();
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(marginX, marginY, pageWidth - 2 * marginX, pageHeight - 2 * marginY, "S");
        cursorY = marginY + 30; // reset after border
      }
      doc.text(line, textMarginX, cursorY);
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
  userData: any = {}
) {
  try {

    const kundliData = {
      "gana": "rakshas",
      "yoni": "cat",
      "vasya": "Jalachara",
      "nadi": "Antya",
      "varna": "Brahmin",
      "paya": "Iron",
      "tatva": "Jal (Water)",
      "life_stone": "coral",
      "lucky_stone": "ruby",
      "fortune_stone": "yellow sapphire",
      "name_start": "Di",
      "ascendant_sign": "Aries",
      "ascendant_nakshatra": "Bharani",
      "rasi": "Cancer",
      "rasi_lord": "Moon",
      "nakshatra": "Ashlesha",
      "nakshatra_lord": "Mercury",
      "nakshatra_pada": 4,
      "sun_sign": "Capricorn",
      "tithi": "K.Pratipada",
      "karana": "Kaulava",
      "yoga": "Saubhagya"
    };
    const sunriseData = {
      "sun_rise": "6:32 AM",
      "bot_response": "Sun rises at 6:32 AM"
    };
    const sunsetData = {
      "sun_set": "6:33 PM",
      "bot_response": "Sun sets at 6:33 PM"
    };
    const moonSignData = {
      "moon_sign": "Taurus",
      "bot_response": "Your moon sign is Taurus",
      "prediction": "Taurus natives are known for being dependable, practical, strong-willed, loyal, and sensual. You love beautiful things. You are good at finances, and hence, make capable financial managers. You are generous and dependable. You can be very stubborn, self-indulgent, frugal, and lazy. You have a possessive streak."
    };
    const sunSignData = {
      "sun_sign": "Pisces",
      "prediction": "The last and 12th Sign of the zodiac, Pisces seems to take on the attributes of all the other 11 Signs. Dreamy and romantic Pisces has a creative flair. You can be compassionate and selfless towards others. Ruled by Neptune, Pisces natives live in your own world. You can be quite detached and have a spiritual bent. Peace and harmony are essential to them. Confrontation and conflict are not your cup of tea.",
      "bot_response": "Your sun sign is Pisces"
    };

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
    const marginBottom = 80;
    const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });

    // Define text lines
    const textLines = [
      `${userData?.name || "Unknown"}`,
      `${userData?.dob || "N/A"}, ${userData?.time || ""}`,
      `${userData?.place || "Location not available"}`,
      `${reportDate || "September 2025"}`
    ];

    // Set text color to white (for dark covers)
    doc.setTextColor(255, 255, 255);

    // Starting Y position from bottom
    let yPos = pageHeight - marginBottom - (textLines.length - 1) * lineHeight;

    // Draw text right-aligned with varied font sizes
    textLines.forEach((line, i) => {
      if (i === 0) {
        // Name - largest and bold
        doc.setFont("Times", "bold");
        doc.setFontSize(32);
      } else if (i === textLines.length - 1) {
        // Date - smaller and lighter
        doc.setFont("Times", "italic");
        doc.setFontSize(18);
      } else {
        // Middle lines - medium size
        doc.setFont("Times", "normal");
        doc.setFontSize(22);
      }

      doc.text(line, pageWidth - marginRight, yPos + i * lineHeight, {
        align: "right",
      });
    });

    // --- Generate Disclaimer Page using AI ---
    const disclaimerPrompt =
      "You are an expert Vedic astrologer writing a disclaimer for a comprehensive astrology report. " +
      "Write a professional, comprehensive disclaimer for a Vedic astrology report in " + (userData.language || "English") + " language. The disclaimer should: " +
      "1. Explain that the report is based on Vedic astrology principles. " +
      "2. Clarify that astrology is for guidance, not deterministic predictions. " +
      "3. Mention that interpretations may vary across astrologers and traditions. " +
      "4. State that remedies and suggestions are not substitutes for medical or legal advice. " +
      "5. Emphasize that results vary for each individual. " +
      "6. Include appropriate legal disclaimers about liability. " +
      "7. End with an encouraging, cosmic perspective message. " +
      "Write in a warm, professional tone that maintains the mystical nature of astrology while being legally sound. Keep it comprehensive but readable, around 300–400 words. " +
      "Language: " + (userData.language || "English") + ".";

    const disclaimerResponse = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: disclaimerPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      })
    });

    const disclaimerData = await disclaimerResponse.json();
    let disclaimerText = disclaimerData.candidates?.[0]?.content?.parts?.[0]?.text || "Disclaimer content could not be generated.";
    disclaimerText = removeMarkdown(disclaimerText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text("DISCLAIMER", pageWidth / 2, 60, { align: "center" });

    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");
    const leftMargin = 50;
    const rightMargin = 50;
    const usableWidth = pageWidth - leftMargin - rightMargin;

    addParagraphs(doc, disclaimerText, leftMargin, 50, usableWidth);

    // addParagraphs(doc, disclaimerText, 50, 110);

    // --- Generate Author Message using AI ---
    const authorPrompt =
      "You are a professional Vedic astrologer writing a personal message to introduce a comprehensive astrology report. " +
      "Write a warm, personal message from the author in " + (userData.language || "English") + " language for a Vedic astrology report. The message should: " +
      "1. Welcome the reader to their personalized cosmic report. " +
      "2. Share the author's experience and passion for astrology. " +
      "3. Explain how the report blends ancient wisdom with practical insights. " +
      "4. Emphasize the importance of intuition and personal connection. " +
      "5. Encourage open-minded exploration of the insights. " +
      "6. Focus on self-awareness and personal growth. " +
      "7. End with warm wishes and professional signature. " +
      "Write in a personal, warm tone that feels like a letter from a trusted astrologer. Keep it around 250–300 words. " +
      "Language: " + (userData.language || "English") + ".";

    const authorResponse = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: authorPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1000 }
      })
    });

    const authorData = await authorResponse.json();
    let authorText = authorData.candidates?.[0]?.content?.parts?.[0]?.text || "Author message could not be generated.";
    authorText = removeMarkdown(authorText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text("MESSAGE FROM THE AUTHOR", pageWidth / 2, 60, { align: "center" });

    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");

    addParagraphs(doc, authorText, 50, 50, pageWidth - 50 - 50);

    // --- Generate Study Guide using AI ---
    const studyPrompt =
      "You are an expert Vedic astrologer writing a study guide for a comprehensive astrology report. " +
      "Write a helpful study guide in " + (userData.language || "English") + " language that explains how to best read and use a Vedic astrology report. The guide should: " +
      "1. Explain the importance of reading the report multiple times. " +
      "2. Emphasize the layered nature of cosmic insights. " +
      "3. Suggest creating a calm, focused mindset before reading. " +
      "4. Recommend taking notes and reflecting on insights. " +
      "5. Explain how to apply the guidance practically. " +
      "6. Encourage revisiting the report over time. " +
      "7. Emphasize personal empowerment and decision-making. " +
      "Write in an encouraging, educational tone that helps readers maximize the value of their astrology report. Keep it around 250–300 words. " +
      "Language: " + (userData.language || "English") + ".";

    const studyResponse = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: studyPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      })
    });

    const studyData = await studyResponse.json();
    let studyText = studyData.candidates?.[0]?.content?.parts?.[0]?.text || "Study guide could not be generated.";
    studyText = removeMarkdown(studyText);
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text("BEST WAY TO STUDY THE REPORT", pageWidth / 2, 60, { align: "center" });

    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");
    addParagraphs(doc, studyText, 50, 50, pageWidth - 50 - 50);
    // --- Generate Table of Contents using AI ---
    let tocText = `
01 Immediate Personal Insights
   - Basic Details
   - Lucky Number & Color (Nakshatra Based)
   - Snapshot of Panchang (optional) and Chart

02 Houses (Bhavas)
   - Overview of 12 Houses
   - House Lords & Significance
   - House Strength using Ashtakvarga
   - Effects of Planets in Houses

03 Planets
   - Planet Placement: Which House Each Planet is In
   - Planetary Aspects (Drishti)

05 Love & Marriage
   - Nakshatras & Moon Signs: Emotional Needs, Compatibility
   - Moon Sign (Rashi): Temperament & Emotional Responses
   - Nakshatra (Lunar Mansion): Psychological Traits & Compatibility
   - Planetary Positions & Relationships
   - Venus: Love, Romance, Attraction
   - Mars: Sexual Compatibility & Assertiveness
   - Jupiter: Marriage Timing & Spouse Characteristics
   - Saturn: Delays, Challenges, Karmic Lessons
   - 7th House: Marriage & Partnerships
   - Planetary Aspects on 7th House
   - Divisional Charts (D9 - Navamsa, D2 - Hora)
   - Yogas & Doshas: Mangal, Venus-Mars, Chandra-Mangal
   - Planetary Periods: Dasha & Transits

06 Career & Profession
   - Houses Related to Career: 1st, 2nd, 6th, 10th
   - Planetary Traits & Amatyakaraka Insights
   - Nakshatra / Moon Sign Influence: Work Style & Preferred Profession
   - Dashas, Yogas & Transits: Career Success Timing

07 Health & Wellbeing
   - Doshas in Vedic Astrology: Manglik, Pitra, Kaalsarp
   - Planetary Influence on Health: Sun, Moon, Mars, Saturn, Rahu/Ketu
   - Houses Related to Health: 1st, 6th, 8th, 12th
   - Nakshatra & Moon Sign: Emotional Balance & Mental Wellbeing
   - Ayurvedic / Dosha Correlation: Vata, Pitta, Kapha Imbalances

08 Karmic & Purpose Insights
   - Chara Karakas: Soul Purpose & Life Goals
   - Sade Sati Journey: Challenges, Transformations, Remedies
   - Mangalik & Yogas: Special Planetary Combinations
   - Astrological Doshas: Karmic Blocks & Lessons

09 Timing & Predictive Insights
   - Mahadashas & Antardashas: Life Phases & Opportunities
   - Planetary Periods & Impact: Short-term & Long-term Influences
   - Favorable & Challenging Periods

10 Remedies & Spiritual Guidance
   - Rudraksha Guidance & Gemstones
   - Mantra Chanting & Yantras
   - Charitable Actions & Spiritual Practices

11 Advanced Calculations & Optional Insights
   - Ashtakvarga: Strength & Fortune Analysis
   - Shadbala: Sixfold Planetary Strength
   - Pratyantar Dasha: Sub-periods for Predictive Astrology
   - Planetary Wars (Grah Yuddha) & Special Charts (Divisional Charts)

12 Q&A & Personalized Advice
   - Frequently Asked Questions
   - Next Steps: Using Insights & Remedies for Personal Growth
`;

    tocText = removeMarkdown(tocText);

    // --- ✅ Add subheading numbers like 1.1, 1.2 ---
    const lines = tocText.split("\n");
    let currentMain = "";
    let subCount = 0;
    let finalToc = "";

    for (let line of lines) {
      line = line.trim();
      if (!line) {
        finalToc += "\n";
        continue;
      }

      // Detect main heading (starts with number)
      if (/^\d{2}/.test(line)) {
        const match = line.match(/^(\d{2})\s+(.*)/);
        if (match) {
          currentMain = String(parseInt(match[1])); // convert 01 -> 1
          subCount = 0;
          finalToc += `${currentMain}. ${match[2]}\n`;
        }
      }
      // Detect subheading (starts with "-")
      else if (line.startsWith("-")) {
        subCount++;
        const subNumber = `${currentMain}.${subCount}`;
        finalToc += `   ${subNumber} ${line.replace(/^-+\s*/, "")}\n`;
      } else {
        finalToc += `${line}\n`;
      }
    }

    tocText = finalToc;

    // --- PDF Rendering ---
    doc.addPage();
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.5);
    doc.rect(25, 25, 545, 792, "S");

    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000");
    doc.text("Table of Contents", pageWidth / 2, 60, { align: "center" });

    doc.setFont("Times", "normal");
    doc.setFontSize(13);
    doc.setTextColor("#a16a21");
    addParagraphs(doc, tocText, 50, 50, pageWidth - 50 - 50);

    // --- Add Table Content Page with Real API Data ---
    if (kundliData) {
      await generateReusableTableContent({
        doc,
        kundliData,
        sunriseData,
        sunsetData,
        moonSignData,
        sunSignData,
        userData: {
          name,
          dob,
          time,
          place,
          latitude: lat,
          longitude: lon,
          ...userData
        },
        title: "AVAKAHADA CHAKRA",
        showUserInfo: true
      });
      console.log("Avakahada Chakra table added successfully!");
    } else {
      console.warn("No kundli data available, skipping Avakahada Chakra table");
    }

    doc.addPage();
    const d1ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 15.866820172851817
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 24.383712157784657
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 14.491055785897743
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 11,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 2.5880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 21.59603241563974
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 20.98044718334978
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 8.277985344623858
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 28.855789512124545
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 14.764735922346517
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 14.764735922346517
      },
      "chart": "D1",
      "chart_name": "Lagna"
    };
    const d2ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 2.17340427697701
      },
      "1": {
        "name": "Su",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 18.767424315569315
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 28.982111571795485
      },
      "3": {
        "name": "Ma",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 5.1761060044692755
      },
      "4": {
        "name": "Me",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 13.192064831279481
      },
      "5": {
        "name": "Ju",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 1,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 11.960894366699563
      },
      "6": {
        "name": "Ve",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 16.555970689247715
      },
      "7": {
        "name": "Sa",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 27.71157902424909
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 29.529471844693035
      },
      "9": {
        "name": "Ke",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 2,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 29.529471844693035
      },
      "chart": "D2",
      "chart_name": "Hora"
    };
    const d3ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 18.260106415465515
      },
      "1": {
        "name": "Su",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 2,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 13.151136473353972
      },
      "2": {
        "name": "Mo",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 3,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 13.473167357693228
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 7,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 7.764159006703913
      },
      "4": {
        "name": "Me",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 2,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 4.788097246919051
      },
      "5": {
        "name": "Ju",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 2.9413415500492874
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 5,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 24.833956033871573
      },
      "7": {
        "name": "Sa",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 2,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 26.56736853637358
      },
      "8": {
        "name": "Ra",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 3,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 14.294207767039552
      },
      "9": {
        "name": "Ke",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 9,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 14.294207767039552
      },
      "chart": "D3",
      "chart_name": "Dreshkana"
    };
    const d3sChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 16.086702138488505
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 24.383712157784657
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 14.491055785897743
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 11,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 2.5880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 21.59603241563974
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 20.98044718334978
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 8.277985344623858
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 28.855789512124545
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 14.764735922346517
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 14.764735922346517
      },
      "chart": "D3-s",
      "chart_name": "D3-Somanatha"
    };
    const d4ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 4.34680855395402
      },
      "1": {
        "name": "Su",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 7.53484863113863
      },
      "2": {
        "name": "Mo",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 12,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 27.96422314359097
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 5,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 10.352212008938551
      },
      "4": {
        "name": "Me",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 10,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 26.384129662558962
      },
      "5": {
        "name": "Ju",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 9,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 23.921788733399126
      },
      "6": {
        "name": "Ve",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 6,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 3.1119413784954304
      },
      "7": {
        "name": "Sa",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 25.42315804849818
      },
      "8": {
        "name": "Ra",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 12,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 29.05894368938607
      },
      "9": {
        "name": "Ke",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 6,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 29.05894368938607
      },
      "chart": "D4",
      "chart_name": "Chaturthamsha"
    };
    const d5ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 20.433510692442553
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 12,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 1.918560788923287
      },
      "2": {
        "name": "Mo",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 11,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 12.455278929488713
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 1,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 12.940265011173189
      },
      "4": {
        "name": "Me",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 11,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 17.980162078198873
      },
      "5": {
        "name": "Ju",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 6,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 14.90223591674885
      },
      "6": {
        "name": "Ve",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 4,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 11.389926723119288
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 12,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 24.278947560622782
      },
      "8": {
        "name": "Ra",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 11,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 13.823679611732587
      },
      "9": {
        "name": "Ke",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 5,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 13.823679611732587
      },
      "chart": "D5",
      "chart_name": "Panchamsha"
    };
    const d7ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 22.606914969419563
      },
      "1": {
        "name": "Su",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 6,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 20.68598510449283
      },
      "2": {
        "name": "Mo",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 3,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 11.437390501284199
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 8,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 18.116371015642464
      },
      "4": {
        "name": "Me",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 6,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 1.1722269094784679
      },
      "5": {
        "name": "Ju",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 10,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 26.863130283448754
      },
      "6": {
        "name": "Ve",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 7,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 27.945897412366776
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 7,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 21.990526584871986
      },
      "8": {
        "name": "Ra",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 3,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 13.353151456425621
      },
      "9": {
        "name": "Ke",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 9,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 13.353151456425621
      },
      "chart": "D7",
      "chart_name": "Saptamsa"
    };
    const d8ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 8.69361710790804
      },
      "1": {
        "name": "Su",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 1,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 15.06969726227726
      },
      "2": {
        "name": "Mo",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 3,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 25.92844628718194
      },
      "3": {
        "name": "Ma",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 2,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 20.704424017877102
      },
      "4": {
        "name": "Me",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 2,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 22.768259325117924
      },
      "5": {
        "name": "Ju",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 2,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 17.84357746679825
      },
      "6": {
        "name": "Ve",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 12,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 6.223882756990861
      },
      "7": {
        "name": "Sa",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 2,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 20.84631609699636
      },
      "8": {
        "name": "Ra",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 3,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 28.11788737877214
      },
      "9": {
        "name": "Ke",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 3,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 28.11788737877214
      },
      "chart": "D8",
      "chart_name": "Ashtamsa"
    };
    const d9ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 24.78031924639663
      },
      "1": {
        "name": "Su",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 1,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 9.453409420062144
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 7,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 10.419502073079684
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 3,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 23.29247702011174
      },
      "4": {
        "name": "Me",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 12,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 14.364291740757835
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 3,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 8.824024650148203
      },
      "6": {
        "name": "Ve",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 11,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 14.501868101614946
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 2,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 19.70210560912119
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 7,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 12.882623301118656
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 1,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 12.88262330111911
      },
      "chart": "D9",
      "chart_name": "Navamsa"
    };
    const d10ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 10.867021384885106
      },
      "1": {
        "name": "Su",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 9,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 3.837121577846574
      },
      "2": {
        "name": "Mo",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 2,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 24.910557858977427
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 6,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 25.880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 8,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 5.960324156397746
      },
      "5": {
        "name": "Ju",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 10,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 29.8044718334977
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 6,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 22.779853446238576
      },
      "7": {
        "name": "Sa",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 10,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 18.557895121245565
      },
      "8": {
        "name": "Ra",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 2,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 27.647359223465173
      },
      "9": {
        "name": "Ke",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 8,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 27.647359223465173
      },
      "chart": "D10",
      "chart_name": "Dasamsa"
    };
    const d10rChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 10.867021384885106
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 5,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 3.837121577846574
      },
      "2": {
        "name": "Mo",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 2,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 24.910557858977427
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 6,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 25.880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 6,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 5.960324156397746
      },
      "5": {
        "name": "Ju",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 10,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 29.8044718334977
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 6,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 22.779853446238576
      },
      "7": {
        "name": "Sa",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 4,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 18.557895121245565
      },
      "8": {
        "name": "Ra",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 2,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 27.647359223465173
      },
      "9": {
        "name": "Ke",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 8,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 27.647359223465173
      },
      "chart": "D10-R",
      "chart_name": "Dasamsa-EvenReverse"
    };
    const d12ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 13.04042566186206
      },
      "1": {
        "name": "Su",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 22.60454589341589
      },
      "2": {
        "name": "Mo",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 2,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 23.892669430772912
      },
      "3": {
        "name": "Ma",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 6,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 1.056636026815653
      },
      "4": {
        "name": "Me",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 12,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 19.152388987676204
      },
      "5": {
        "name": "Ju",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 11,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 11.76536620019715
      },
      "6": {
        "name": "Ve",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 6,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 9.335824135486291
      },
      "7": {
        "name": "Sa",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 3,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 16.269474145494314
      },
      "8": {
        "name": "Ra",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 2,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 27.176831068158208
      },
      "9": {
        "name": "Ke",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 8,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 27.176831068158208
      },
      "chart": "D12",
      "chart_name": "Dwadasamsa"
    };
    const d16ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 17.38723421581608
      },
      "1": {
        "name": "Su",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 6,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 0.13939452455451828
      },
      "2": {
        "name": "Mo",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 21.856892574363883
      },
      "3": {
        "name": "Ma",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 10,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 11.408848035754204
      },
      "4": {
        "name": "Me",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 4,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 15.536518650235848
      },
      "5": {
        "name": "Ju",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 5.687154933596503
      },
      "6": {
        "name": "Ve",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 5,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 12.447765513981722
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 11.692632193992722
      },
      "8": {
        "name": "Ra",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 26.235774757544277
      },
      "9": {
        "name": "Ke",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 26.235774757544277
      },
      "chart": "D16",
      "chart_name": "Shodashamsa"
    };
    const d20ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 21.734042769770213
      },
      "1": {
        "name": "Su",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 7,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 7.674243155693148
      },
      "2": {
        "name": "Mo",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 4,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 19.821115717954854
      },
      "3": {
        "name": "Ma",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 12,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 21.761060044692755
      },
      "4": {
        "name": "Me",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 5,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 11.920648312795493
      },
      "5": {
        "name": "Ju",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 8,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 29.6089436669954
      },
      "6": {
        "name": "Ve",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 12,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 15.559706892477152
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 7.11579024249113
      },
      "8": {
        "name": "Ra",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 4,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 25.294718446930347
      },
      "9": {
        "name": "Ke",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 4,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 25.294718446930347
      },
      "chart": "D20",
      "chart_name": "Vimsamsa"
    };
    const d24ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 26.08085132372412
      },
      "1": {
        "name": "Su",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 15.209091786831777
      },
      "2": {
        "name": "Mo",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 17.785338861545824
      },
      "3": {
        "name": "Ma",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 3,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 2.113272053631306
      },
      "4": {
        "name": "Me",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 5,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 8.304777975352408
      },
      "5": {
        "name": "Ju",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 5,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 23.5307324003943
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 18.671648270972582
      },
      "7": {
        "name": "Sa",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 11,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 2.5389482909886283
      },
      "8": {
        "name": "Ra",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 24.353662136316416
      },
      "9": {
        "name": "Ke",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 24.353662136316416
      },
      "chart": "D24",
      "chart_name": "ChaturVimshamsha"
    };
    const d24rChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 26.08085132372412
      },
      "1": {
        "name": "Su",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 5,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 15.209091786831777
      },
      "2": {
        "name": "Mo",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 17.785338861545824
      },
      "3": {
        "name": "Ma",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 3,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 2.113272053631306
      },
      "4": {
        "name": "Me",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 8.304777975352408
      },
      "5": {
        "name": "Ju",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 5,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 23.5307324003943
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 18.671648270972582
      },
      "7": {
        "name": "Sa",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 2.5389482909886283
      },
      "8": {
        "name": "Ra",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 24.353662136316416
      },
      "9": {
        "name": "Ke",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 12,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 24.353662136316416
      },
      "chart": "D24-R",
      "chart_name": "D24-R"
    };
    const d27ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 14.340957739189435
      },
      "1": {
        "name": "Su",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 7,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 28.360228260185977
      },
      "2": {
        "name": "Mo",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 12,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 1.258506219238825
      },
      "3": {
        "name": "Ma",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 9.877431060335212
      },
      "4": {
        "name": "Me",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 5,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 13.092875222271687
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 5,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 26.47207395044279
      },
      "6": {
        "name": "Ve",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 6,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 13.505604304844383
      },
      "7": {
        "name": "Sa",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 11,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 29.106316827361297
      },
      "8": {
        "name": "Ra",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 12,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 8.647869903355968
      },
      "9": {
        "name": "Ke",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 12,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 8.647869903355968
      },
      "chart": "D27",
      "chart_name": "Bhamsha"
    };
    const d40ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 13.468085539540425
      },
      "1": {
        "name": "Su",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 12,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 15.348486311386296
      },
      "2": {
        "name": "Mo",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 7,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 9.642231435909707
      },
      "3": {
        "name": "Ma",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 11,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 13.52212008938551
      },
      "4": {
        "name": "Me",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 8,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 23.841296625590985
      },
      "5": {
        "name": "Ju",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 3,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 29.217887333990802
      },
      "6": {
        "name": "Ve",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 11,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 1.119413784954304
      },
      "7": {
        "name": "Sa",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 6,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 14.23158048498226
      },
      "8": {
        "name": "Ra",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 7,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 20.589436893860693
      },
      "9": {
        "name": "Ke",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 7,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 20.589436893860693
      },
      "chart": "D40",
      "chart_name": "KhaVedamsa"
    };
    const d45ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 3.9015962319822393
      },
      "1": {
        "name": "Su",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 10,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 17.267047100305717
      },
      "2": {
        "name": "Mo",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 4,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 22.097510365397284
      },
      "3": {
        "name": "Ma",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 10,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 26.46238510055869
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 6,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 11.821458703785538
      },
      "5": {
        "name": "Ju",
        "zodiac": "Taurus",
        "rasi_no": 2,
        "house": 8,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 14.120123250739198
      },
      "6": {
        "name": "Ve",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 1,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 12.509340508071546
      },
      "7": {
        "name": "Sa",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 5,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 8.510528045604588
      },
      "8": {
        "name": "Ra",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 5,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 4.41311650559237
      },
      "9": {
        "name": "Ke",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 11,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 4.413116505591461
      },
      "chart": "D45",
      "chart_name": "AkshaVedamsa"
    };
    const d60ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 5.2021283093099555
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 2,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 23.022729467080353
      },
      "2": {
        "name": "Mo",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 11,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 29.46334715386456
      },
      "3": {
        "name": "Ma",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 8,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 5.283180134078265
      },
      "4": {
        "name": "Me",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 9,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 5.761944938385568
      },
      "5": {
        "name": "Ju",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 6,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 28.826831000988022
      },
      "6": {
        "name": "Ve",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 5,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 16.679120677432365
      },
      "7": {
        "name": "Sa",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 11,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 21.34737072747157
      },
      "8": {
        "name": "Ra",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 12,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 15.88415534079104
      },
      "9": {
        "name": "Ke",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 6,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 15.88415534079104
      },
      "chart": "D60",
      "chart_name": "Shastiamsha"
    };
    const d30ChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Ascendant",
        "local_degree": 2.6010641546549778
      },
      "1": {
        "name": "Su",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 12,
        "retro": false,
        "full_name": "Sun",
        "local_degree": 11.511364733540177
      },
      "2": {
        "name": "Mo",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": false,
        "full_name": "Moon",
        "local_degree": 14.73167357693228
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 5,
        "retro": false,
        "full_name": "Mars",
        "local_degree": 17.641590067039132
      },
      "4": {
        "name": "Me",
        "zodiac": "Capricorn",
        "rasi_no": 10,
        "house": 2,
        "retro": true,
        "full_name": "Mercury",
        "local_degree": 17.880972469192784
      },
      "5": {
        "name": "Ju",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 7,
        "retro": false,
        "full_name": "Jupiter",
        "local_degree": 29.41341550049401
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 3,
        "retro": false,
        "full_name": "Venus",
        "local_degree": 8.339560338716183
      },
      "7": {
        "name": "Sa",
        "zodiac": "Scorpio",
        "rasi_no": 8,
        "house": 12,
        "retro": false,
        "full_name": "Saturn",
        "local_degree": 25.673685363735785
      },
      "8": {
        "name": "Ra",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": true,
        "full_name": "Rahu",
        "local_degree": 22.94207767039552
      },
      "9": {
        "name": "Ke",
        "zodiac": "Sagittarius",
        "rasi_no": 9,
        "house": 1,
        "retro": true,
        "full_name": "Ketu",
        "local_degree": 22.94207767039552
      },
      "chart": "D30",
      "chart_name": "Trimshamsha"
    };
    const chalitChartJson = {
      "0": {
        "pseudo_rasi_no": 3,
        "house": 1,
        "rasi_no": 3,
        "zodiac": "Gemini",
        "retro": false,
        "name": "As",
        "local_degree": 16.086702138488505
      },
      "1": {
        "rasi_no": 12,
        "zodiac": "Pisces",
        "retro": false,
        "name": "Su",
        "house": 10,
        "pseudo_rasi_no": 12
      },
      "2": {
        "rasi_no": 5,
        "zodiac": "Leo",
        "retro": false,
        "name": "Mo",
        "house": 3,
        "pseudo_rasi_no": 5
      },
      "3": {
        "rasi_no": 1,
        "zodiac": "Aries",
        "retro": false,
        "name": "Ma",
        "house": 11,
        "pseudo_rasi_no": 1
      },
      "4": {
        "rasi_no": 12,
        "zodiac": "Pisces",
        "retro": true,
        "name": "Me",
        "house": 10,
        "pseudo_rasi_no": 12
      },
      "5": {
        "rasi_no": 11,
        "zodiac": "Aquarius",
        "retro": false,
        "name": "Ju",
        "house": 9,
        "pseudo_rasi_no": 11
      },
      "6": {
        "rasi_no": 11,
        "zodiac": "Aquarius",
        "retro": false,
        "name": "Ve",
        "house": 9,
        "pseudo_rasi_no": 11
      },
      "7": {
        "rasi_no": 12,
        "zodiac": "Pisces",
        "retro": false,
        "name": "Sa",
        "house": 10,
        "pseudo_rasi_no": 12
      },
      "8": {
        "rasi_no": 5,
        "zodiac": "Leo",
        "retro": true,
        "name": "Ra",
        "house": 3,
        "pseudo_rasi_no": 5
      },
      "9": {
        "rasi_no": 11,
        "zodiac": "Aquarius",
        "retro": true,
        "name": "Ke",
        "house": 9,
        "pseudo_rasi_no": 11
      },
      "chart": "chalit",
      "chart_name": "Bhav-chalit"
    };
    const sunChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 1,
        "retro": false,
        "local_degree": 24.383712157784657
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 1,
        "retro": false,
        "local_degree": 24.383712157784657
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 6,
        "retro": false,
        "local_degree": 14.491055785897743
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 2,
        "retro": false,
        "local_degree": 2.5880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 1,
        "retro": true,
        "local_degree": 21.59603241563974
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 12,
        "retro": false,
        "local_degree": 20.98044718334978
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 12,
        "retro": false,
        "local_degree": 8.277985344623858
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 1,
        "retro": false,
        "local_degree": 28.855789512124545
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 6,
        "retro": true,
        "local_degree": 14.764735922346517
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 12,
        "retro": true,
        "local_degree": 14.764735922346517
      },
      "chart": "sun",
      "chart_name": "Sun Chart"
    };
    const moonChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "local_degree": 14.491055785897743
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": false,
        "local_degree": 24.383712157784657
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": false,
        "local_degree": 14.491055785897743
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 9,
        "retro": false,
        "local_degree": 2.5880530022346377
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": true,
        "local_degree": 21.59603241563974
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": false,
        "local_degree": 20.98044718334978
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": false,
        "local_degree": 8.277985344623858
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 8,
        "retro": false,
        "local_degree": 28.855789512124545
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 1,
        "retro": true,
        "local_degree": 14.764735922346517
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 7,
        "retro": true,
        "local_degree": 14.764735922346517
      },
      "chart": "moon",
      "chart_name": "Moon Chart"
    };
    const kpchalitChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1,
        "retro": false,
        "pseudo_rasi": "Gemini",
        "pseudo_rasi_no": 3,
        "local_degree": 16.192953312625132
      },
      "1": {
        "name": "Su",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "pseudo_rasi": "Pisces",
        "pseudo_rasi_no": 12,
        "local_degree": 24.489963331921285
      },
      "2": {
        "name": "Mo",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": false,
        "pseudo_rasi": "Leo",
        "pseudo_rasi_no": 5,
        "local_degree": 14.59730696003437
      },
      "3": {
        "name": "Ma",
        "zodiac": "Aries",
        "rasi_no": 1,
        "house": 10,
        "retro": false,
        "pseudo_rasi": "Aries",
        "pseudo_rasi_no": 1,
        "local_degree": 2.694304176371265
      },
      "4": {
        "name": "Me",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": true,
        "pseudo_rasi": "Pisces",
        "pseudo_rasi_no": 12,
        "local_degree": 21.702283589776368
      },
      "5": {
        "name": "Ju",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": false,
        "pseudo_rasi": "Aquarius",
        "pseudo_rasi_no": 11,
        "local_degree": 21.08669835748641
      },
      "6": {
        "name": "Ve",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 8,
        "retro": false,
        "pseudo_rasi": "Aquarius",
        "pseudo_rasi_no": 11,
        "local_degree": 8.384236518760485
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false,
        "pseudo_rasi": "Pisces",
        "pseudo_rasi_no": 12,
        "local_degree": 28.962040686261172
      },
      "8": {
        "name": "Ra",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": true,
        "pseudo_rasi": "Leo",
        "pseudo_rasi_no": 5,
        "local_degree": 14.870987096483145
      },
      "9": {
        "name": "Ke",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": true,
        "pseudo_rasi": "Aquarius",
        "pseudo_rasi_no": 11,
        "local_degree": 14.870987096483145
      },
      "midheaven": 12.6392021384885,
      "ascendant": 16.086702138488505,
      "chart": "kp_chalit",
      "chart_name": "KP Chalit"
    };
    const transitChartJson = {
      "0": {
        "name": "As",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1
      },
      "1": {
        "name": "Su",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 4,
        "retro": false
      },
      "2": {
        "name": "Mo",
        "zodiac": "Cancer",
        "rasi_no": 4,
        "house": 2,
        "retro": false
      },
      "3": {
        "name": "Ma",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 5,
        "retro": false
      },
      "4": {
        "name": "Me",
        "zodiac": "Libra",
        "rasi_no": 7,
        "house": 5,
        "retro": false
      },
      "5": {
        "name": "Ju",
        "zodiac": "Gemini",
        "rasi_no": 3,
        "house": 1,
        "retro": false
      },
      "6": {
        "name": "Ve",
        "zodiac": "Virgo",
        "rasi_no": 6,
        "house": 4,
        "retro": false
      },
      "7": {
        "name": "Sa",
        "zodiac": "Pisces",
        "rasi_no": 12,
        "house": 10,
        "retro": false
      },
      "8": {
        "name": "Ra",
        "zodiac": "Aquarius",
        "rasi_no": 11,
        "house": 9,
        "retro": true
      },
      "9": {
        "name": "Ke",
        "zodiac": "Leo",
        "rasi_no": 5,
        "house": 3,
        "retro": true
      },
      "chart": "transit",
      "chart_name": "Transit Chart"
    };

    await addAllDivisionalChartsFromJSON(doc, [
      { chart_name: "chalit" },
      { chart_name: "d9" },
      { chart_name: "d10" },
      { chart_name: "d7" },
      { chart_name: "d45" },
      { chart_name: "d27" },
      { chart_name: "d5" },
      { chart_name: "d8" },
      { chart_name: "d24r" },
      { chart_name: "d10r" },
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

    ]);

    doc.addPage();
    await generateHouseReports(doc, houses);

    const planetData = {
      "planets": {
        "1": {
          "name": "Su",
          "full_name": "Sun",
          "local_degree": 27.83755839588116,
          "global_degree": 297.83755839588116,
          "progress_in_percentage": 92.79186131960387,
          "rasi_no": 10,
          "zodiac": "Capricorn",
          "house": 10,
          "speed_radians_per_day": 1.170910493827214e-8,
          "retro": false,
          "nakshatra": "Dhanista",
          "nakshatra_lord": "Mars",
          "nakshatra_pada": 2,
          "nakshatra_no": 23,
          "zodiac_lord": "Saturn",
          "is_planet_set": false,
          "basic_avastha": "Mritya",
          "lord_status": "Benefic"
        },
        "2": {
          "name": "Mo",
          "full_name": "Moon",
          "local_degree": 8.18777419124902,
          "global_degree": 8.18777419124902,
          "progress_in_percentage": 27.292580637496734,
          "rasi_no": 1,
          "zodiac": "Aries",
          "house": 1,
          "speed_radians_per_day": 1.6538708847736627e-7,
          "retro": false,
          "nakshatra": "Ashvini",
          "nakshatra_lord": "Ketu",
          "nakshatra_pada": 3,
          "nakshatra_no": 1,
          "zodiac_lord": "Mars",
          "is_planet_set": false,
          "basic_avastha": "Kumara",
          "lord_status": "Neutral",
          "is_combust": false
        },
        "3": {
          "name": "Ma",
          "full_name": "Mars",
          "local_degree": 9.030010949047437,
          "global_degree": 309.03001094904744,
          "progress_in_percentage": 30.10003649682479,
          "rasi_no": 11,
          "zodiac": "Aquarius",
          "house": 11,
          "speed_radians_per_day": 9.149948559670794e-9,
          "retro": false,
          "nakshatra": "Shatabhisha",
          "nakshatra_lord": "Rahu",
          "nakshatra_pada": 1,
          "nakshatra_no": 24,
          "zodiac_lord": "Saturn",
          "is_planet_set": false,
          "basic_avastha": "Kumara",
          "lord_status": "Benefic",
          "is_combust": true
        },
        "4": {
          "name": "Me",
          "full_name": "Mercury",
          "local_degree": 11.054228091085577,
          "global_degree": 311.0542280910856,
          "progress_in_percentage": 36.847426970285255,
          "rasi_no": 11,
          "zodiac": "Aquarius",
          "house": 11,
          "speed_radians_per_day": -4.112011316872197e-9,
          "retro": true,
          "nakshatra": "Shatabhisha",
          "nakshatra_lord": "Rahu",
          "nakshatra_pada": 2,
          "nakshatra_no": 24,
          "zodiac_lord": "Saturn",
          "is_planet_set": false,
          "basic_avastha": "Kumara",
          "lord_status": "Malefic",
          "is_combust": false
        },
        "5": {
          "name": "Ju",
          "full_name": "Jupiter",
          "local_degree": 16.362201044564813,
          "global_degree": 166.3622010445648,
          "progress_in_percentage": 54.540670148549374,
          "rasi_no": 6,
          "zodiac": "Virgo",
          "house": 6,
          "speed_radians_per_day": -6.076388888886652e-10,
          "retro": true,
          "nakshatra": "Hasta",
          "nakshatra_lord": "Moon",
          "nakshatra_pada": 2,
          "nakshatra_no": 13,
          "zodiac_lord": "Mercury",
          "is_planet_set": true,
          "basic_avastha": "Yuva",
          "lord_status": "Highly Benefic",
          "is_combust": false
        },
        "6": {
          "name": "Ve",
          "full_name": "Venus",
          "local_degree": 13.926196074415714,
          "global_degree": 283.9261960744157,
          "progress_in_percentage": 46.420653581385714,
          "rasi_no": 10,
          "zodiac": "Capricorn",
          "house": 10,
          "speed_radians_per_day": 1.4477237654320978e-8,
          "retro": false,
          "nakshatra": "Sravana",
          "nakshatra_lord": "Moon",
          "nakshatra_pada": 2,
          "nakshatra_no": 22,
          "zodiac_lord": "Saturn",
          "is_planet_set": false,
          "basic_avastha": "Yuva",
          "lord_status": "Malefic",
          "is_combust": false
        },
        "7": {
          "name": "Sa",
          "full_name": "Saturn",
          "local_degree": 15.737591417352604,
          "global_degree": 165.7375914173526,
          "progress_in_percentage": 52.45863805784201,
          "rasi_no": 6,
          "zodiac": "Virgo",
          "house": 6,
          "speed_radians_per_day": -4.5331790123448455e-10,
          "retro": true,
          "nakshatra": "Hasta",
          "nakshatra_lord": "Moon",
          "nakshatra_pada": 2,
          "nakshatra_no": 13,
          "zodiac_lord": "Mercury",
          "is_planet_set": true,
          "basic_avastha": "Yuva",
          "lord_status": "Malefic",
          "is_combust": false
        },
        "8": {
          "name": "Ra",
          "full_name": "Rahu",
          "local_degree": 16.811770410094866,
          "global_degree": 106.81177041009487,
          "progress_in_percentage": 56.03923470031622,
          "rasi_no": 4,
          "zodiac": "Cancer",
          "house": 4,
          "retro": true,
          "nakshatra": "Ashlesha",
          "nakshatra_lord": "Mercury",
          "nakshatra_pada": 1,
          "nakshatra_no": 9,
          "zodiac_lord": "Moon",
          "is_planet_set": true,
          "basic_avastha": "Yuva",
          "lord_status": "Neutral",
          "is_combust": false
        },
        "9": {
          "name": "Ke",
          "full_name": "Ketu",
          "local_degree": 16.81177041009488,
          "global_degree": 286.8117704100949,
          "progress_in_percentage": 56.039234700316264,
          "rasi_no": 10,
          "zodiac": "Capricorn",
          "house": 10,
          "retro": true,
          "nakshatra": "Sravana",
          "nakshatra_lord": "Moon",
          "nakshatra_pada": 3,
          "nakshatra_no": 22,
          "zodiac_lord": "Saturn",
          "is_planet_set": false,
          "basic_avastha": "Yuva",
          "lord_status": "Malefic",
          "is_combust": false
        }
      },
      "dasa": {
        "birth_dasa": "Ketu>Ju>Me",
        "current_dasa": "Ma>Ve>Ju",
        "birth_dasa_time": "07/01/1977",
        "current_dasa_time": "01/06/2025"
      },
      "lucky": {
        "gem": ["cat's eye"],
        "num": [7, 9],
        "colors": ["black"],
        "letters": ["C", "L"],
        "name_start": ["chu", "chae", "cho", "ia"]
      },
      "rasi_info": {
        "rasi": "Aries",
        "nakshatra": "Ashvini",
        "nakshatra_pada": 3
      },
      "panchang": {
        "ayanamsa": 23.599288692335666,
        "ayanamsa_name": "Lahiri",
        "day_of_birth": "Tuesday",
        "day_lord": "Mars",
        "hora_lord": "Saturn",
        "sunrise_at_birth": "06:47:59",
        "sunset_at_birth": "18:22:59",
        "karana": "Taitula",
        "yoga": "Subha",
        "tithi": "Shasti"
      },
      "ghatka_chakra": {
        "rasi": "Aries",
        "tithi": ["1 (প্রতিপদ)", "6 (ষষ্ঠী)", "11 (একাদশী)"],
        "day": "Sunday",
        "nakshatra": "Magha",
        "tatva": "Jal (Water)",
        "lord": "Venus",
        "same_sex_lagna": "Aries",
        "opposite_sex_lagna": "Libra"
      },
      "planet_reports": [
        {
          "planet_considered": "Sun",
          "planet_location": 10,
          "planet_native_location": 11,
          "planet_zodiac": "Cancer",
          "zodiac_lord": "Moon",
          "zodiac_lord_location": "Virgo",
          "zodiac_lord_house_location": 12,
          "zodiac_lord_strength": "Neutral",
          "planet_strength": "Neutral",
          "gayatri_mantra": "Om Bhaskaraya Vidmahe Mahadyutikaraya Dheemahi Tanno Adityah Prachodayaat",
          "verbal_location": "Lord of the 11th lord in 12th house",
          "character_keywords_positive": ["principled", "Attractive", "Virtuous", "Creative"],
          "character_keywords_negative": ["indecisive", "Doubtful"]
        }
      ],
      "houses": {
        "1": {
          "house": "1",
          "rasi_no": 10,
          "zodiac": "Capricorn",
          "aspected_by_planet": [],
          "aspected_by_planet_index": []
        },
        "2": {
          "house": "2",
          "rasi_no": 11,
          "zodiac": "Aquarius",
          "aspected_by_planet": ["Moon", "Rahu"],
          "aspected_by_planet_index": [2, 8]
        },
        "3": {
          "house": "3",
          "rasi_no": 12,
          "zodiac": "Pisces",
          "aspected_by_planet": ["Mars"],
          "aspected_by_planet_index": [3]
        },
        "4": {
          "house": "4",
          "rasi_no": 1,
          "zodiac": "Aries",
          "aspected_by_planet": ["Sun", "Jupiter", "Rahu"],
          "aspected_by_planet_index": [1, 5, 8]
        },
        "5": {
          "house": "5",
          "rasi_no": 2,
          "zodiac": "Taurus",
          "aspected_by_planet": ["Mercury", "Venus"],
          "aspected_by_planet_index": [4, 6]
        },
        "6": {
          "house": "6",
          "rasi_no": 3,
          "zodiac": "Gemini",
          "aspected_by_planet": ["Saturn", "Ketu"],
          "aspected_by_planet_index": [7, 9]
        },
        "7": {
          "house": "7",
          "rasi_no": 4,
          "zodiac": "Cancer",
          "aspected_by_planet": [],
          "aspected_by_planet_index": []
        },
        "8": {
          "house": "8",
          "rasi_no": 5,
          "zodiac": "Leo",
          "aspected_by_planet": ["Ketu"],
          "aspected_by_planet_index": [9]
        },
        "9": {
          "house": "9",
          "rasi_no": 6,
          "zodiac": "Virgo",
          "aspected_by_planet": [],
          "aspected_by_planet_index": []
        },
        "10": {
          "house": "10",
          "rasi_no": 7,
          "zodiac": "Libra",
          "aspected_by_planet": ["Ketu"],
          "aspected_by_planet_index": [9]
        },
        "11": {
          "house": "11",
          "rasi_no": 8,
          "zodiac": "Scorpio",
          "aspected_by_planet": ["Mars", "Saturn"],
          "aspected_by_planet_index": [3, 7]
        },
        "12": {
          "house": "12",
          "rasi_no": 9,
          "zodiac": "Sagittarius",
          "aspected_by_planet": ["Jupiter", "Rahu"],
          "aspected_by_planet_index": [5, 8]
        }
      }
    };
    await generatePlanetReportsWithImages(doc, planetData.planets);
    // Add initial "Love and Marriage" page
    doc.addPage();
    const margin = 25;

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);

    // Draw small corner decorations
    const corner = 25;
    const gap = 8;

    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Love and Marriage", pageWidth / 2, pageHeight / 2, { align: "center", baseline: "middle" });

    const sections = [
      "Nakshatras & Moon Signs: Provide a multi-paragraph analysis...",
      "Planetary Positions & Relationships: Deeply analyze Venus, Mars, Jupiter, Saturn...",
      "7th House Analysis: Interpret 7th house sign, ruling lord, planets, aspects...",
      "Divisional Charts (D9 Navamsa & D2 Hora): Explore marriage quality and financial compatibility...",
      "Yogas & Doshas: Identify Mangal Dosha, Chandra-Mangal, Venus-Mars combinations, remedial advice...",
      "Planetary Periods and Transits: Detailed analysis of dashas, transit impacts, timing predictions..."
    ];

    for (const sectionPrompt of sections) {
      const fullPrompt = `
        You are a highly experienced Vedic astrologer specializing in Love & Marriage astrology.
        Using the provided JSON input, generate a professional, detailed, multi-paragraph report for this section:
        ${sectionPrompt}
        JSON: {
        "0": {
            "name": "As",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": false,
            "full_name": "Ascendant",
            "local_degree": 24.78031924639663
        },
        "1": {
            "name": "Su",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": false,
            "full_name": "Sun",
            "local_degree": 9.453409420062144
        },
        "2": {
            "name": "Mo",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 7,
            "retro": false,
            "full_name": "Moon",
            "local_degree": 10.419502073079684
        },
        "3": {
            "name": "Ma",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 3,
            "retro": false,
            "full_name": "Mars",
            "local_degree": 23.29247702011174
        },
        "4": {
            "name": "Me",
            "zodiac": "Capricorn",
            "rasi_no": 10,
            "house": 12,
            "retro": true,
            "full_name": "Mercury",
            "local_degree": 14.364291740757835
        },
        "5": {
            "name": "Ju",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 3,
            "retro": false,
            "full_name": "Jupiter",
            "local_degree": 8.824024650148203
        },
        "6": {
            "name": "Ve",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 11,
            "retro": false,
            "full_name": "Venus",
            "local_degree": 14.501868101614946
        },
        "7": {
            "name": "Sa",
            "zodiac": "Pisces",
            "rasi_no": 12,
            "house": 2,
            "retro": false,
            "full_name": "Saturn",
            "local_degree": 19.70210560912119
        },
        "8": {
            "name": "Ra",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 7,
            "retro": true,
            "full_name": "Rahu",
            "local_degree": 12.882623301118656
        },
        "9": {
            "name": "Ke",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": true,
            "full_name": "Ketu",
            "local_degree": 12.88262330111911
        },
        "chart": "D9",
        "chart_name": "Navamsa"
    },
    {
        "0": {
            "name": "As",
            "zodiac": "Cancer",
            "rasi_no": 4,
            "house": 1,
            "retro": false,
            "full_name": "Ascendant",
            "local_degree": 2.17340427697701
        },
        "1": {
            "name": "Su",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": false,
            "full_name": "Sun",
            "local_degree": 18.767424315569315
        },
        "2": {
            "name": "Mo",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": false,
            "full_name": "Moon",
            "local_degree": 28.982111571795485
        },
        "3": {
            "name": "Ma",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": false,
            "full_name": "Mars",
            "local_degree": 5.1761060044692755
        },
        "4": {
            "name": "Me",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": true,
            "full_name": "Mercury",
            "local_degree": 13.192064831279481
        },
        "5": {
            "name": "Ju",
            "zodiac": "Cancer",
            "rasi_no": 4,
            "house": 1,
            "retro": false,
            "full_name": "Jupiter",
            "local_degree": 11.960894366699563
        },
        "6": {
            "name": "Ve",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": false,
            "full_name": "Venus",
            "local_degree": 16.555970689247715
        },
        "7": {
            "name": "Sa",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": false,
            "full_name": "Saturn",
            "local_degree": 27.71157902424909
        },
        "8": {
            "name": "Ra",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": true,
            "full_name": "Rahu",
            "local_degree": 29.529471844693035
        },
        "9": {
            "name": "Ke",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 2,
            "retro": true,
            "full_name": "Ketu",
            "local_degree": 29.529471844693035
        },
        "chart": "D2",
        "chart_name": "Hora"
    },
  {
    "1": {
      "house": "1",
      "rasi_no": 10,
      "zodiac": "Capricorn",
      "aspected_by_planet": [],
      "aspected_by_planet_index": []
    },
    "2": {
      "house": "2",
      "rasi_no": 11,
      "zodiac": "Aquarius",
      "aspected_by_planet": [
        "Moon",
        "Rahu"
      ],
      "aspected_by_planet_index": [
        2,
        8
      ]
    },
    "3": {
      "house": "3",
      "rasi_no": 12,
      "zodiac": "Pisces",
      "aspected_by_planet": [
        "Mars"
      ],
      "aspected_by_planet_index": [
        3
      ]
    },
    "4": {
      "house": "4",
      "rasi_no": 1,
      "zodiac": "Aries",
      "aspected_by_planet": [
        "Sun",
        "Jupiter",
        "Rahu"
      ],
      "aspected_by_planet_index": [
        1,
        5,
        8
      ]
    },
    "5": {
      "house": "5",
      "rasi_no": 2,
      "zodiac": "Taurus",
      "aspected_by_planet": [
        "Mercury",
        "Venus"
      ],
      "aspected_by_planet_index": [
        4,
        6
      ]
    },
    "6": {
      "house": "6",
      "rasi_no": 3,
      "zodiac": "Gemini",
      "aspected_by_planet": [
        "Saturn",
        "Ketu"
      ],
      "aspected_by_planet_index": [
        7,
        9
      ]
    },
    "7": {
      "house": "7",
      "rasi_no": 4,
      "zodiac": "Cancer",
      "aspected_by_planet": [],
      "aspected_by_planet_index": []
    },
    "8": {
      "house": "8",
      "rasi_no": 5,
      "zodiac": "Leo",
      "aspected_by_planet": [
        "Ketu"
      ],
      "aspected_by_planet_index": [
        9
      ]
    },
    "9": {
      "house": "9",
      "rasi_no": 6,
      "zodiac": "Virgo",
      "aspected_by_planet": [],
      "aspected_by_planet_index": []
    },
    "10": {
      "house": "10",
      "rasi_no": 7,
      "zodiac": "Libra",
      "aspected_by_planet": [
        "Ketu"
      ],
      "aspected_by_planet_index": [
        9
      ]
    },
    "11": {
      "house": "11",
      "rasi_no": 8,
      "zodiac": "Scorpio",
      "aspected_by_planet": [
        "Mars",
        "Saturn"
      ],
      "aspected_by_planet_index": [
        3,
        7
      ]
    },
    "12": {
      "house": "12",
      "rasi_no": 9,
      "zodiac": "Sagittarius",
      "aspected_by_planet": [
        "Jupiter",
        "Rahu"
      ],
      "aspected_by_planet_index": [
        5,
        8
      ]
    }
  }
    {
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "meaning": "Vesi Yoga represents a balanced outlook, characterized by truthfulness and a tall yet somewhat sluggish nature. Those born under this yoga find contentment and happiness with modest wealth and resources.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "meaning": "Vosi Yoga indicates skillfulness, charity, fame, knowledge, and physical strength. Individuals born under this yoga tend to be recognized for their talents and are often celebrated for their generosity and wisdom.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "meaning": "Ubhayachara Yoga suggests being born with all the comforts of life. Such individuals often rise to positions of authority, possibly becoming kings or holding prominent leadership roles due to their innate qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "meaning": "Budha Aditya Yoga signifies intelligence, skillfulness, and expertise in various endeavors. Those born under this yoga are widely recognized and respected for their abilities and enjoy a profound sense of contentment and happiness.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "meaning": "When the Moon is positioned in a kendra from the Sun, it typically results in moderate wealth, intelligence, and skills in one's life.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "meaning": "Hamsa Yoga signifies a spacious nature akin to a swan, purity, spirituality, comfort, respect, passion, potential leadership roles, an enjoyment of life, and the ability to speak eloquently and clearly.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "meaning": "Paasa Yoga may involve the risk of facing imprisonment but is associated with considerable capability in one's work. These individuals tend to be talkative, often having a team of servants at their disposal, although their character may be lacking in certain aspects.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "meaning": "Gaja-Kesari Yoga signifies fame, wealth, intelligence, and outstanding character. Individuals under this yoga are often well-liked by kings, bosses, and other leaders, and the presence of benefic aspects amplifies these qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "meaning": "Kaahala Yoga represents a strong and bold personality, often leading a large team or group. These individuals may accumulate properties over their lifetime and exhibit cunning traits.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "meaning": "Sankha Yoga indicates a life blessed with wealth, a loving spouse, and children. These individuals are known for their kindness, piety, intelligence, and long life expectancy.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "meaning": "Mridanga Yoga signifies an individual who holds a kingly or equal leadership position. They lead a life marked by happiness, wealth, and elegance, embodying the traits of a successful and refined leader.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "meaning": "Kalpadruma Yoga represents powerful leaders who actively embrace challenges, fight for justice, and fearlessly pursue prosperity. They are principled, strong-willed, and compassionate in their actions.",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "meaning": "Bhaarathi Yoga represents great scholars who are marked by intelligence, religiosity, good looks, and fame. They often excel in various fields and are celebrated for their contributions to knowledge and society.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "meaning": "13 raja Yogas present by house associations, Raja Yogas signify exceptional power and prosperity, with individuals often holding dominion over their peers.",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "meaning": "Dharma-Karmadhipati Yoga signifies individuals who are sincere, devoted, and righteous. They are fortunate and highly praised for their moral and ethical virtues.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "meaning": "Raaja Yoga brings a life filled with enjoyment, harmonious relationships, and the blessing of children. Those with this Yoga experience an abundance of life's pleasures and strong family connections.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
        "meaning": "Those with Raja Sambandha Yoga are exceptionally intelligent and often attain ministerial positions or equivalent roles within organizations. Their intellect and abilities are highly regarded.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "meaning": "Those undergoing the mahadasha experience richness and fame. They accumulate substantial wealth during this period, satisfying their desires.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  },
    {
    "moon_sign": "Taurus",
    "bot_response": "Your moon sign is Taurus",
    "prediction": "Taurus natives are known for being dependable, practical, strong-willed, loyal, and sensual. You love beautiful things. You are good at finances, and hence, make capable financial managers. You are generous and dependable. You can be very stubborn, self-indulgent, frugal, and lazy. You have a possessive streak."
  }
    {
    "lucky_color": "pale-red",
    "lucky_color_code": "#FFB8BE",
    "lucky_number": [
      25,
      4
    ],
    "bot_response": {
      "physique": {
        "score": 75,
        "split_response": "A sublime aura will envelop you, making your presence enchanting and unforgettable wherever you go."
      },
      "status": {
        "score": 98,
        "split_response": "Kindness and consideration will mark your words in all interactions, shaping you into an influential figure admired for your character."
      },
      "finances": {
        "score": 70,
        "split_response": "Exercise utmost caution in money transactions to avoid falling victim to fraudulent schemes that could compromise your finances."
      },
      "relationship": {
        "score": 82,
        "split_response": "You'll fulfill promises made and make an enduring mark on your partner's heart. Your genuine commitment will leave a lasting impression, solidifying your special place in their life."
      },
      "career": {
        "score": 64,
        "split_response": "Given your business's consistent growth and increased stocks, consider adding new shareholders to bolster your stake and capitalize on expanding opportunities."
      },
      "travel": {
        "score": 85,
        "split_response": "You might have been feeling the need of moving from your old house to a new house. This day brings you the perfect opportunity for booking your a new apartment."
      },
      "family": {
        "score": 83,
        "split_response": "Travel and journeys will bring prosperity. Consider embarking on a family trip to strengthen bonds with your spouse and children, fostering cherished memories."
      },
      "friends": {
        "score": 87,
        "split_response": "Distinguishing between true friends and those who merely seek personal gain will enable you to prune your social circle."
      },
      "health": {
        "score": 58,
        "split_response": "Exercise vigilance concerning your father's health, particularly in the realm of respiratory health. Early consultation with a doctor will help avert potential issues."
      },
      "total_score": {
        "score": 88,
        "split_response": "Anticipate a day of discovery and enrichment. Engage in self-reflection and exploration, discovering new interests and hobbies that enrich your life with joy and satisfaction."
      }
    },
    "nakshatra": "ashvini"
  }
    {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  }
     {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  }
    {
    "ascendant": {
      "global_degree": 341,
      "retro": false,
      "zodiac": "Pisces",
      "zodiac_no": 12,
      "local_degree": 11,
      "house": 1
    },
    "sun": {
      "global_degree": 264.6323943231593,
      "retro": false,
      "zodiac": "Sagittarius",
      "zodiac_no": 9,
      "local_degree": 24.632394323159303,
      "house": 10
    },
    "mercury": {
      "global_degree": 243.62996058198289,
      "retro": false,
      "zodiac": "Sagittarius",
      "zodiac_no": 9,
      "local_degree": 3.6299605819828855,
      "house": 10
    },
    "venus": {
      "global_degree": 237.15298673966956,
      "retro": false,
      "zodiac": "Scorpio",
      "zodiac_no": 8,
      "local_degree": 27.152986739669558,
      "house": 9
    },
    "moon": {
      "global_degree": 29.801238681588835,
      "retro": false,
      "zodiac": "Aries",
      "zodiac_no": 1,
      "local_degree": 29.801238681588835,
      "house": 2
    },
    "mars": {
      "global_degree": 230.3971939482126,
      "retro": false,
      "zodiac": "Scorpio",
      "zodiac_no": 8,
      "local_degree": 20.39719394821259,
      "house": 9
    },
    "jupiter": {
      "global_degree": 284.25164477550845,
      "retro": false,
      "zodiac": "Capricorn",
      "zodiac_no": 10,
      "local_degree": 14.251644775508453,
      "house": 11
    },
    "saturn": {
      "global_degree": 76.49006447794464,
      "retro": true,
      "zodiac": "Gemini",
      "zodiac_no": 3,
      "local_degree": 16.490064477944642,
      "house": 4
    },
    "uranus": {
      "global_degree": 202.26450178754433,
      "retro": false,
      "zodiac": "Libra",
      "zodiac_no": 7,
      "local_degree": 22.264501787544333,
      "house": 8
    },
    "neptune": {
      "global_degree": 245.70077876323884,
      "retro": false,
      "zodiac": "Sagittarius",
      "zodiac_no": 9,
      "local_degree": 5.700778763238844,
      "house": 10
    },
    "pluto": {
      "global_degree": 184.30145025845133,
      "retro": false,
      "zodiac": "Libra",
      "zodiac_no": 7,
      "local_degree": 4.301450258451325,
      "house": 8
    },
    "chiron": {
      "global_degree": 13.283659415797633,
      "retro": "N/A",
      "zodiac": "Aries",
      "zodiac_no": 1,
      "local_degree": 13.283659415797633,
      "house": 2
    },
    "sirius": {
      "global_degree": 1.7627554440093802,
      "retro": "N/A",
      "zodiac": "Aries",
      "zodiac_no": 1,
      "local_degree": 1.7627554440093802,
      "house": 2
    },
    "day": "Saturday",
    "north_node": {
      "global_degree": 287,
      "retro": true,
      "zodiac": "Capricorn",
      "zodiac_no": 10,
      "local_degree": 17,
      "house": 11
    },
    "south_node": {
      "global_degree": 107,
      "retro": true,
      "zodiac": "Cancer",
      "zodiac_no": 4,
      "local_degree": 17,
      "house": 5
    }
  }
        Make it suitable for PDF display, and do not use markdown.
      `;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 3000 } // smaller chunk per section
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Section could not be generated.";
      text = removeMarkdown(text);
      // Add new page for this section
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, studyText, 50, 50, pageWidth - 50 - 50);
    }
    doc.addPage();

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);

    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Career & Profession", pageWidth / 2, pageHeight / 2, { align: "center", baseline: "middle" });
    const careerSections = [
      "Houses Related to Career: Analyze 10th, 6th, and 2nd houses for career insights.",
      "Planetary Positions Affecting Career: Explain planetary influences on profession, leadership, and growth.",
      "Yogas Influencing Career and Wealth: Discuss relevant yogas and their impact on career success.",
      "Dashas and Transits for Career Timing: Provide timing predictions and career opportunities.",
      "Practical Career Guidance: Give actionable advice for career advancement, entrepreneurship, and financial growth."
    ];

    for (const sectionPrompt of careerSections) {
      const fullPrompt = `
        You are a highly experienced Vedic astrologer specializing in Career & Profession astrology.
        Using the provided JSON input, generate a professional, detailed, multi-paragraph report for this section:
        ${sectionPrompt}
        JSON: {
    "0": {
      "name": "As",
      "zodiac": "Gemini",
      "rasi_no": 3,
      "house": 1,
      "retro": false,
      "full_name": "Ascendant",
      "local_degree": 15.866820172851817
    },
    "1": {
      "name": "Su",
      "zodiac": "Pisces",
      "rasi_no": 12,
      "house": 10,
      "retro": false,
      "full_name": "Sun",
      "local_degree": 24.383712157784657
    },
    "2": {
      "name": "Mo",
      "zodiac": "Leo",
      "rasi_no": 5,
      "house": 3,
      "retro": false,
      "full_name": "Moon",
      "local_degree": 14.491055785897743
    },
    "3": {
      "name": "Ma",
      "zodiac": "Aries",
      "rasi_no": 1,
      "house": 11,
      "retro": false,
      "full_name": "Mars",
      "local_degree": 2.5880530022346377
    },
    "4": {
      "name": "Me",
      "zodiac": "Pisces",
      "rasi_no": 12,
      "house": 10,
      "retro": true,
      "full_name": "Mercury",
      "local_degree": 21.59603241563974
    },
    "5": {
      "name": "Ju",
      "zodiac": "Aquarius",
      "rasi_no": 11,
      "house": 9,
      "retro": false,
      "full_name": "Jupiter",
      "local_degree": 20.98044718334978
    },
    "6": {
      "name": "Ve",
      "zodiac": "Aquarius",
      "rasi_no": 11,
      "house": 9,
      "retro": false,
      "full_name": "Venus",
      "local_degree": 8.277985344623858
    },
    "7": {
      "name": "Sa",
      "zodiac": "Pisces",
      "rasi_no": 12,
      "house": 10,
      "retro": false,
      "full_name": "Saturn",
      "local_degree": 28.855789512124545
    },
    "8": {
      "name": "Ra",
      "zodiac": "Leo",
      "rasi_no": 5,
      "house": 3,
      "retro": true,
      "full_name": "Rahu",
      "local_degree": 14.764735922346517
    },
    "9": {
      "name": "Ke",
      "zodiac": "Aquarius",
      "rasi_no": 11,
      "house": 9,
      "retro": true,
      "full_name": "Ketu",
      "local_degree": 14.764735922346517
    },
    "chart": "D1",
    "chart_name": "Lagna"
  }
    {
    "ashtakvarga_order": [
      "Sun",
      "Moon",
      "Mars",
      "Mercury",
      "Jupiter",
      "Venus",
      "Saturn",
      "Ascendant"
    ],
    "ashtakvarga_points": [
      [
        5,
        5,
        4,
        6,
        4,
        2,
        4,
        3,
        5,
        4,
        2,
        4
      ],
      [
        4,
        3,
        2,
        5,
        6,
        3,
        3,
        4,
        6,
        3,
        6,
        4
      ],
      [
        5,
        4,
        2,
        5,
        3,
        3,
        3,
        3,
        5,
        3,
        0,
        3
      ],
      [
        4,
        7,
        5,
        6,
        5,
        4,
        5,
        4,
        4,
        4,
        1,
        5
      ],
      [
        6,
        4,
        3,
        5,
        7,
        2,
        6,
        6,
        3,
        6,
        4,
        4
      ],
      [
        4,
        5,
        8,
        3,
        4,
        3,
        4,
        2,
        5,
        5,
        6,
        3
      ],
      [
        4,
        3,
        1,
        6,
        4,
        2,
        2,
        2,
        3,
        4,
        4,
        4
      ],
      [
        3,
        3,
        5,
        6,
        5,
        4,
        4,
        4,
        5,
        4,
        3,
        4
      ]
    ],
    "ashtakvarga_total": [
      32,
      31,
      25,
      36,
      33,
      19,
      27,
      24,
      31,
      29,
      23,
      27
    ]
  }
    {
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
     "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
       "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  }
    {
    "moon_sign": "Taurus",
    "bot_response": "Your moon sign is Taurus",
    "prediction": "Taurus natives are known for being dependable, practical, strong-willed, loyal, and sensual. You love beautiful things. You are good at finances, and hence, make capable financial managers. You are generous and dependable. You can be very stubborn, self-indulgent, frugal, and lazy. You have a possessive streak."
  }
    {
    "lucky_color": "pale-red",
    "lucky_color_code": "#FFB8BE",
    "lucky_number": [
      25,
      4
    ],
    "bot_response": {
      "physique": {
        "score": 75,
        },
      "status": {
        "score": 98,
        },
      "finances": {
        "score": 70,
       },
      "relationship": {
        "score": 82,
        },
      "career": {
        "score": 64,
        },
      "travel": {
        "score": 85,
       },
      "family": {
        "score": 83,
        },
      "friends": {
        "score": 87,
       },
      "health": {
        "score": 58,
       },
      "total_score": {
        "score": 88,
        }
    },
    "nakshatra": "ashvini"
  }
    {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  }
     {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  }
        Make it suitable for PDF display and do not use markdown.
      `;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 3000 }
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || `${sectionPrompt.split(":")[0]} section could not be generated.`;
      text = removeMarkdown(text);

      // Add new page for this section
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, 50, pageWidth - 50 - 50);
    }

    doc.addPage();

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);

    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Health & Wellbeing", pageWidth / 2, pageHeight / 2, { align: "center", baseline: "middle" });
    const healthSections = [
      "Doshas in Vedic Astrology: Manglik, Pitra, and Kaal Sarp doshas, effects on health, and remedies.",
      "Planetary Influence on Health: Sun, Moon, Mars, Saturn, Rahu/Ketu and their effects on vitality and wellbeing.",
      "Houses Related to Health: 1st, 6th, 8th, 12th houses and associated health interpretations.",
      "Nakshatra & Moon Sign Influence: Impact on emotional balance, mental health, and stress response.",
      "Holistic Remedies & Practical Advice: Lifestyle, diet, yoga, gemstone, and color remedies."
    ];

    for (const sectionPrompt of healthSections) {
      const fullPrompt = `
        You are an expert Vedic astrologer specializing in health and wellbeing.
        Using the provided JSON input, generate a professional, detailed report for this section:
        ${sectionPrompt}
        JSON: {
          "manglik_by_mars": true,
          "bot_response": "You are 6% manglik. ",
          "manglik_by_saturn": false,
          "manglik_by_rahuketu": false,
          "score": 6
        }
          {Pitradosh: present}
          {
    "is_dosha_present": true,
    "dosha_direction": "Descending",
    "dosha_type": "Shankpal",
    "rahu_ketu_axis": "4-10",
  }
    {
    "0": {
      "name": "As",
      "full_name": "Ascendant",
      "local_degree": 21.903422571573824,
      "global_degree": 21.903422571573824,
      "progress_in_percentage": 73.01140857191275,
      "rasi_no": 1,
      "zodiac": "Aries",
      "house": 1,
      "nakshatra": "Bharani",
      "nakshatra_lord": "Venus",
      "nakshatra_pada": 3,
      "nakshatra_no": 2,
      "zodiac_lord": "Mars",
      "is_planet_set": false,
      "lord_status": "-",
      "basic_avastha": "-",
      "is_combust": false
    },
    "1": {
      "name": "Su",
      "full_name": "Sun",
      "local_degree": 27.83755839588116,
      "global_degree": 297.83755839588116,
      "progress_in_percentage": 92.79186131960387,
      "rasi_no": 10,
      "zodiac": "Capricorn",
      "house": 10,
      "speed_radians_per_day": 1.170910493827214e-8,
      "retro": false,
      "nakshatra": "Dhanista",
      "nakshatra_lord": "Mars",
      "nakshatra_pada": 2,
      "nakshatra_no": 23,
      "zodiac_lord": "Saturn",
      "is_planet_set": false,
      "basic_avastha": "Mritya",
      "lord_status": "Benefic"
    },
    "2": {
      "name": "Mo",
      "full_name": "Moon",
      "local_degree": 8.18777419124902,
      "global_degree": 8.18777419124902,
      "progress_in_percentage": 27.292580637496734,
      "rasi_no": 1,
      "zodiac": "Aries",
      "house": 1,
      "speed_radians_per_day": 1.6538708847736627e-7,
      "retro": false,
      "nakshatra": "Ashvini",
      "nakshatra_lord": "Ketu",
      "nakshatra_pada": 3,
      "nakshatra_no": 1,
      "zodiac_lord": "Mars",
      "is_planet_set": false,
      "basic_avastha": "Kumara",
      "lord_status": "Neutral",
      "is_combust": false
    },
    "3": {
      "name": "Ma",
      "full_name": "Mars",
      "local_degree": 9.030010949047437,
      "global_degree": 309.03001094904744,
      "progress_in_percentage": 30.10003649682479,
      "rasi_no": 11,
      "zodiac": "Aquarius",
      "house": 11,
      "speed_radians_per_day": 9.149948559670794e-9,
      "retro": false,
      "nakshatra": "Shatabhisha",
      "nakshatra_lord": "Rahu",
      "nakshatra_pada": 1,
      "nakshatra_no": 24,
      "zodiac_lord": "Saturn",
      "is_planet_set": false,
      "basic_avastha": "Kumara",
      "lord_status": "Benefic",
      "is_combust": true
    },
    "4": {
      "name": "Me",
      "full_name": "Mercury",
      "local_degree": 11.054228091085577,
      "global_degree": 311.0542280910856,
      "progress_in_percentage": 36.847426970285255,
      "rasi_no": 11,
      "zodiac": "Aquarius",
      "house": 11,
      "speed_radians_per_day": -4.112011316872197e-9,
      "retro": true,
      "nakshatra": "Shatabhisha",
      "nakshatra_lord": "Rahu",
      "nakshatra_pada": 2,
      "nakshatra_no": 24,
      "zodiac_lord": "Saturn",
      "is_planet_set": false,
      "basic_avastha": "Kumara",
      "lord_status": "Malefic",
      "is_combust": false
    },
    "5": {
      "name": "Ju",
      "full_name": "Jupiter",
      "local_degree": 16.362201044564813,
      "global_degree": 166.3622010445648,
      "progress_in_percentage": 54.540670148549374,
      "rasi_no": 6,
      "zodiac": "Virgo",
      "house": 6,
      "speed_radians_per_day": -6.076388888886652e-10,
      "retro": true,
      "nakshatra": "Hasta",
      "nakshatra_lord": "Moon",
      "nakshatra_pada": 2,
      "nakshatra_no": 13,
      "zodiac_lord": "Mercury",
      "is_planet_set": true,
      "basic_avastha": "Yuva",
      "lord_status": "Highly Benefic",
      "is_combust": false
    },
    "6": {
      "name": "Ve",
      "full_name": "Venus",
      "local_degree": 13.926196074415714,
      "global_degree": 283.9261960744157,
      "progress_in_percentage": 46.420653581385714,
      "rasi_no": 10,
      "zodiac": "Capricorn",
      "house": 10,
      "speed_radians_per_day": 1.4477237654320978e-8,
      "retro": false,
      "nakshatra": "Sravana",
      "nakshatra_lord": "Moon",
      "nakshatra_pada": 2,
      "nakshatra_no": 22,
      "zodiac_lord": "Saturn",
      "is_planet_set": false,
      "basic_avastha": "Yuva",
      "lord_status": "Malefic",
      "is_combust": false
    },
    "7": {
      "name": "Sa",
      "full_name": "Saturn",
      "local_degree": 15.737591417352604,
      "global_degree": 165.7375914173526,
      "progress_in_percentage": 52.45863805784201,
      "rasi_no": 6,
      "zodiac": "Virgo",
      "house": 6,
      "speed_radians_per_day": -4.5331790123448455e-10,
      "retro": true,
      "nakshatra": "Hasta",
      "nakshatra_lord": "Moon",
      "nakshatra_pada": 2,
      "nakshatra_no": 13,
      "zodiac_lord": "Mercury",
      "is_planet_set": true,
      "basic_avastha": "Yuva",
      "lord_status": "Malefic",
      "is_combust": false
    },
    "8": {
      "name": "Ra",
      "full_name": "Rahu",
      "local_degree": 16.811770410094866,
      "global_degree": 106.81177041009487,
      "progress_in_percentage": 56.03923470031622,
      "rasi_no": 4,
      "zodiac": "Cancer",
      "house": 4,
      "retro": true,
      "nakshatra": "Ashlesha",
      "nakshatra_lord": "Mercury",
      "nakshatra_pada": 1,
      "nakshatra_no": 9,
      "zodiac_lord": "Moon",
      "is_planet_set": true,
      "basic_avastha": "Yuva",
      "lord_status": "Neutral",
      "is_combust": false
    },
    "9": {
      "name": "Ke",
      "full_name": "Ketu",
      "local_degree": 16.81177041009488,
      "global_degree": 286.8117704100949,
      "progress_in_percentage": 56.039234700316264,
      "rasi_no": 10,
      "zodiac": "Capricorn",
      "house": 10,
      "retro": true,
      "nakshatra": "Sravana",
      "nakshatra_lord": "Moon",
      "nakshatra_pada": 3,
      "nakshatra_no": 22,
      "zodiac_lord": "Saturn",
      "is_planet_set": false,
      "basic_avastha": "Yuva",
      "lord_status": "Malefic",
      "is_combust": false
    },
    "birth_dasa": "Ketu>Ju>Me",
    "current_dasa": "Ma>Ve>Ju",
    "birth_dasa_time": "07/01/1977",
    "current_dasa_time": " 01/06/2025",
    "lucky_gem": [
      "cat's eye"
    ],
    "lucky_num": [
      7,
      9
    ],
    "lucky_colors": [
      "black"
    ],
    "lucky_letters": [
      "C",
      "L"
    ],
    "lucky_name_start": [
      "chu",
      "chae",
      "cho",
      "ia"
    ],
    "rasi": "Aries",
    "nakshatra": "Ashvini",
    "nakshatra_pada": 3,
    "panchang": {
      "ayanamsa": 23.599288692335666,
      "ayanamsa_name": "Lahiri",
      "day_of_birth": "Tuesday",
      "day_lord": "Mars",
      "hora_lord": "Saturn",
      "sunrise_at_birth": "06:47:59",
      "sunset_at_birth": "18:22:59",
      "karana": "Taitula",
      "yoga": "Subha",
      "tithi": "Shasti"
    },
    "ghatka_chakra": {
      "rasi": "Aries",
      "tithi": [
        "1 (প্রতিপদ)",
        "6 (ষষ্ঠী)",
        "11 (একাদশী)"
      ],
      "day": "Sunday",
      "nakshatra": "Magha",
      "tatva": "Jal (Water)",
      "lord": "Venus",
      "same_sex_lagna": "Aries",
      "opposite_sex_lagna": "Libra"
    }
  }
    [
    {
      "start_rasi": "Libra",
      "end_rasi": "Scorpio",
      "end_rasi_lord": "Mars",
      "local_start_degree": 8.491066124885606,
      "local_end_degree": 9.285066124885589,
      "length": 30.793999999999983,
      "house": 1,
      "bhavmadhya": 23.888066124885597,
      "global_start_degree": 203.478,
      "global_end_degree": 234.272,
      "start_nakshatra": "Vishakha",
      "end_nakshatra": "Jyeshtha",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "0",
          "full_name": "Ascendant",
          "name": "As",
          "nakshatra": "Vishakha",
          "nakshatra_no": 16,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "7",
          "full_name": "Saturn",
          "name": "Sa",
          "nakshatra": "Jyeshtha",
          "nakshatra_no": 18,
          "nakshatra_pada": 2,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Scorpio",
      "end_rasi": "Sagittarius",
      "end_rasi_lord": "Jupiter",
      "local_start_degree": 10.105166124885585,
      "local_end_degree": 9.258966124885575,
      "length": 29.15379999999999,
      "house": 2,
      "bhavmadhya": 24.68206612488558,
      "global_start_degree": 234.272,
      "global_end_degree": 263.4258,
      "start_nakshatra": "Jyeshtha",
      "end_nakshatra": "PurvaShadha",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Sagittarius",
      "end_rasi": "Capricorn",
      "end_rasi_lord": "Saturn",
      "local_start_degree": 9.55891612488557,
      "local_end_degree": 8.112816124885569,
      "length": 28.5539,
      "house": 3,
      "bhavmadhya": 23.83586612488557,
      "global_start_degree": 263.4258,
      "global_end_degree": 291.9797,
      "start_nakshatra": "PurvaShadha",
      "end_nakshatra": "Sravana",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Moon",
      "planets": [],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Capricorn",
      "end_rasi": "Aquarius",
      "end_rasi_lord": "Saturn",
      "local_start_degree": 6.873466124885567,
      "local_end_degree": 7.9060661248855695,
      "length": 31.032600000000002,
      "house": 4,
      "bhavmadhya": 22.38976612488557,
      "global_start_degree": 291.9797,
      "global_end_degree": 323.0123,
      "start_nakshatra": "Sravana",
      "end_nakshatra": "PurvaBhadra",
      "start_nakshatra_lord": "Moon",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Venus",
      "cusp_sub_sub_lord": "Saturn"
    },
    {
      "start_rasi": "Aquarius",
      "end_rasi": "Pisces",
      "end_rasi_lord": "Jupiter",
      "local_start_degree": 7.797316124885555,
      "local_end_degree": 9.047416124885586,
      "length": 31.25010000000003,
      "house": 5,
      "bhavmadhya": 23.42236612488557,
      "global_start_degree": 323.0123,
      "global_end_degree": 354.2624,
      "start_nakshatra": "PurvaBhadra",
      "end_nakshatra": "Revati",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "8",
          "full_name": "Rahu",
          "name": "Ra",
          "nakshatra": "UttaraBhadra",
          "nakshatra_no": 26,
          "nakshatra_pada": 3,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Moon"
    },
    {
      "start_rasi": "Pisces",
      "end_rasi": "Aries",
      "end_rasi_lord": "Mars",
      "local_start_degree": 10.064666124885605,
      "local_end_degree": 9.2802661248856,
      "length": 29.215599999999995,
      "house": 6,
      "bhavmadhya": 24.672466124885602,
      "global_start_degree": 354.2624,
      "global_end_degree": 23.478,
      "start_nakshatra": "Revati",
      "end_nakshatra": "Bharani",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [
        {
          "planetId": "5",
          "full_name": "Jupiter",
          "name": "Ju",
          "nakshatra": "Ashvini",
          "nakshatra_no": 1,
          "nakshatra_pada": 2,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Aries",
      "end_rasi": "Taurus",
      "end_rasi_lord": "Venus",
      "local_start_degree": 8.491066124885599,
      "local_end_degree": 9.285066124885596,
      "length": 30.793999999999997,
      "house": 7,
      "bhavmadhya": 23.888066124885597,
      "global_start_degree": 23.478,
      "global_end_degree": 54.272,
      "start_nakshatra": "Bharani",
      "end_nakshatra": "Mrigashira",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Mars",
      "planets": [],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Taurus",
      "end_rasi": "Gemini",
      "end_rasi_lord": "Mercury",
      "local_start_degree": 10.105166124885596,
      "local_end_degree": 9.258966124885589,
      "length": 29.153799999999997,
      "house": 8,
      "bhavmadhya": 24.682066124885594,
      "global_start_degree": 54.272,
      "global_end_degree": 83.4258,
      "start_nakshatra": "Mrigashira",
      "end_nakshatra": "Punarvasu",
      "start_nakshatra_lord": "Mars",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Gemini",
      "end_rasi": "Cancer",
      "end_rasi_lord": "Moon",
      "local_start_degree": 9.558916124885592,
      "local_end_degree": 8.11281612488559,
      "length": 28.5539,
      "house": 9,
      "bhavmadhya": 23.83586612488559,
      "global_start_degree": 83.4258,
      "global_end_degree": 111.9797,
      "start_nakshatra": "Punarvasu",
      "end_nakshatra": "Ashlesha",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "2",
          "full_name": "Moon",
          "name": "Mo",
          "nakshatra": "Punarvasu",
          "nakshatra_no": 7,
          "nakshatra_pada": 3,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Cancer",
      "end_rasi": "Leo",
      "end_rasi_lord": "Sun",
      "local_start_degree": 6.8734661248855815,
      "local_end_degree": 7.906066124885598,
      "length": 31.032600000000016,
      "house": 10,
      "bhavmadhya": 22.38976612488559,
      "global_start_degree": 111.9797,
      "global_end_degree": 143.0123,
      "start_nakshatra": "Ashlesha",
      "end_nakshatra": "PurvaPhalguni",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [
        {
          "planetId": "1",
          "full_name": "Sun",
          "name": "Su",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "3",
          "full_name": "Mars",
          "name": "Ma",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "4",
          "full_name": "Mercury",
          "name": "Me",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "6",
          "full_name": "Venus",
          "name": "Ve",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Sun",
      "cusp_sub_sub_lord": "Mercury"
    },
    {
      "start_rasi": "Leo",
      "end_rasi": "Virgo",
      "end_rasi_lord": "Mercury",
      "local_start_degree": 7.797316124885604,
      "local_end_degree": 9.047416124885608,
      "length": 31.250100000000003,
      "house": 11,
      "bhavmadhya": 23.422366124885606,
      "global_start_degree": 143.0123,
      "global_end_degree": 174.2624,
      "start_nakshatra": "PurvaPhalguni",
      "end_nakshatra": "Chitra",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Mars",
      "planets": [
        {
          "planetId": "9",
          "full_name": "Ketu",
          "name": "Ke",
          "nakshatra": "Hasta",
          "nakshatra_no": 13,
          "nakshatra_pada": 1,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Sun"
    },
    {
      "start_rasi": "Virgo",
      "end_rasi": "Libra",
      "end_rasi_lord": "Venus",
      "local_start_degree": 10.064666124885612,
      "local_end_degree": 9.280266124885607,
      "length": 29.215599999999995,
      "house": 12,
      "bhavmadhya": 24.67246612488561,
      "global_start_degree": 174.2624,
      "global_end_degree": 203.478,
      "start_nakshatra": "Chitra",
      "end_nakshatra": "Vishakha",
      "start_nakshatra_lord": "Mars",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    }
  ]
{"moon_sign": "Taurus",}
{
    "lucky_color": "pale-red",
    "lucky_color_code": "#FFB8BE",
    "lucky_number": [
      25,
      4
    ],
    "bot_response": {
      "physique": {
        "score": 75,
      },
      "status": {
        "score": 98,
      },
      "finances": {
        "score": 70,
      },
      "relationship": {
        "score": 82,
      },
      "career": {
        "score": 64,
      },
      "travel": {
        "score": 85,
      },
      "family": {
        "score": 83,
      },
      "friends": {
        "score": 87,
      },
      "health": {
        "score": 58,
      },
      "total_score": {
        "score": 88,
    },
    "nakshatra": "ashvini"
  },
}
        Ensure it is thorough, clear, practical, and suitable for PDF display without markdown.
      `;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 3000 }
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || `${sectionPrompt.split(":")[0]} section could not be generated.`;
      text = removeMarkdown(text);

      // Add new page for this section
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, 50, pageWidth - 50 - 50);
    }
    doc.addPage();

    // Draw border
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "S");

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Karmic & Purpose Insights", pageWidth / 2, pageHeight / 2, { align: "center", baseline: "middle" });
    const karmicSections = [
      "Chara Karakas: Soul Purpose & Life Goals",
      "Planetary Influence on Karmic Path: Sun, Moon, Mars, Saturn, Rahu/Ketu effects",
      "Houses Related to Karmic Lessons: 1st, 5th, 9th, 12th houses and interpretations",
      "Nakshatra & Moon Sign Influence: Emotional tendencies, mental patterns, and destiny guidance",
      "Practical Advice & Remedies: Lifestyle, rituals, meditation, gemstones, and colors for karmic balance"
    ];

    for (const sectionPrompt of karmicSections) {
      const fullPrompt = `
    You are an expert Vedic astrologer specializing in karmic insights and life purpose.
    Using the provided JSON input, generate a professional, detailed report for this section:
    ${sectionPrompt}
    JSON: "response": { Sun:{
        "bot_response": "The Sun and Moon are always direct ",
        "status": true},
        Moon:{"bot_response": "The Sun and Moon are always direct ",
        "status": true},},
        Mercury:{"dates": [
            [
                "31 January 1994",
                "27 September 1994"
            ],
            [
                "24 December 1994",
                "14 January 1995"
            ],
            [
                " 9 January 1994",
                " 9 May 1994"
            ],
            [
                " 2 June 1994",
                " 6 September 1994"
            ]},
           Venus:{ "dates": [
            [
                "13 October 1994",
                "23 November 1994"
            ]
        ],},
        Mars:{"bot_response": "mars is not retrograde in 1994",
        "status": true
        },
        Jupiter:{"dates": [
      [
        "19 December 2021",
        "29 January 2022"
      ]
]
        },
        Saturn: {"dates": [
            [
                "23 June 1994",
                " 9 November 1994"
            ]
        ],
        },
Rahu:{
"bot_response": "The Rahu and Ketu are always retrograde ",
        "status": true
        },
        Ketu:{
        "bot_response": "The Rahu and Ketu are always retrograde ",
        "status": true
        },
    },
    {
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  },
{
    "0": {
      "rasi_no": 6,
      "zodiac": "Virgo",
      "retro": false,
      "name": "As",
      "house": 1,
      "global_degree": 164.25228902890402,
      "local_degree": 14.25228902890403,
      "pseudo_rasi_no": 6,
      "pseudo_rasi": "Virgo",
      "pseudo_rasi_lord": "Mercury",
      "pseudo_nakshatra": "Hasta",
      "pseudo_nakshatra_no": 13,
      "pseudo_nakshatra_pada": 2,
      "pseudo_nakshatra_lord": "Moon",
      "sub_lord": "Jupiter",
      "sub_sub_lord": "Saturn",
      "full_name": "Ascendant"
    },
    "1": {
      "rasi_no": 3,
      "zodiac": "Gemini",
      "retro": false,
      "name": "Su",
      "house": 10,
      "global_degree": 84.54132661902112,
      "local_degree": 24.54132661902112,
      "pseudo_rasi_no": 3,
      "pseudo_rasi": "Gemini",
      "pseudo_rasi_lord": "Mercury",
      "pseudo_nakshatra": "Punarvasu",
      "pseudo_nakshatra_no": 7,
      "pseudo_nakshatra_pada": 2,
      "pseudo_nakshatra_lord": "Jupiter",
      "sub_lord": "Mercury",
      "sub_sub_lord": "Venus",
      "full_name": "Sun"
    },
    "2": {
      "rasi_no": 7,
      "zodiac": "Libra",
      "retro": false,
      "name": "Mo",
      "house": 2,
      "global_degree": 194.80455307897404,
      "local_degree": 14.804553078974052,
      "pseudo_rasi_no": 7,
      "pseudo_rasi": "Libra",
      "pseudo_rasi_lord": "Venus",
      "pseudo_nakshatra": "Svati",
      "pseudo_nakshatra_no": 15,
      "pseudo_nakshatra_pada": 3,
      "pseudo_nakshatra_lord": "Rahu",
      "sub_lord": "Ketu",
      "sub_sub_lord": "Moon",
      "full_name": "Moon"
    },
    "3": {
      "rasi_no": 3,
      "zodiac": "Gemini",
      "retro": false,
      "name": "Ma",
      "house": 10,
      "global_degree": 82.02421456654068,
      "local_degree": 22.024214566540678,
      "pseudo_rasi_no": 3,
      "pseudo_rasi": "Gemini",
      "pseudo_rasi_lord": "Mercury",
      "pseudo_nakshatra": "Punarvasu",
      "pseudo_nakshatra_no": 7,
      "pseudo_nakshatra_pada": 1,
      "pseudo_nakshatra_lord": "Jupiter",
      "sub_lord": "Saturn",
      "sub_sub_lord": "Saturn",
      "full_name": "Mars"
    },
    "4": {
      "rasi_no": 3,
      "zodiac": "Gemini",
      "retro": true,
      "name": "Me",
      "house": 10,
      "global_degree": 78.73340067285021,
      "local_degree": 18.73340067285021,
      "pseudo_rasi_no": 3,
      "pseudo_rasi": "Gemini",
      "pseudo_rasi_lord": "Mercury",
      "pseudo_nakshatra": "Ardra",
      "pseudo_nakshatra_no": 6,
      "pseudo_nakshatra_pada": 4,
      "pseudo_nakshatra_lord": "Rahu",
      "sub_lord": "Moon",
      "sub_sub_lord": "Saturn",
      "full_name": "Mercury"
    },
    "5": {
      "rasi_no": 2,
      "zodiac": "Taurus",
      "retro": false,
      "name": "Ju",
      "house": 8,
      "global_degree": 38.26702130424208,
      "local_degree": 8.267021304242078,
      "pseudo_rasi_no": 2,
      "pseudo_rasi": "Taurus",
      "pseudo_rasi_lord": "Venus",
      "pseudo_nakshatra": "Krittika",
      "pseudo_nakshatra_no": 3,
      "pseudo_nakshatra_pada": 4,
      "pseudo_nakshatra_lord": "Sun",
      "sub_lord": "Venus",
      "sub_sub_lord": "Sun",
      "full_name": "Jupiter"
    },
    "6": {
      "rasi_no": 4,
      "zodiac": "Cancer",
      "retro": false,
      "name": "Ve",
      "house": 10,
      "global_degree": 92.46912068521222,
      "local_degree": 2.469120685212218,
      "pseudo_rasi_no": 4,
      "pseudo_rasi": "Cancer",
      "pseudo_rasi_lord": "Moon",
      "pseudo_nakshatra": "Punarvasu",
      "pseudo_nakshatra_no": 7,
      "pseudo_nakshatra_pada": 4,
      "pseudo_nakshatra_lord": "Jupiter",
      "sub_lord": "Rahu",
      "sub_sub_lord": "Mercury",
      "full_name": "Venus"
    },
    "7": {
      "rasi_no": 2,
      "zodiac": "Taurus",
      "retro": false,
      "name": "Sa",
      "house": 8,
      "global_degree": 33.83072095449175,
      "local_degree": 3.8307209544917527,
      "pseudo_rasi_no": 2,
      "pseudo_rasi": "Taurus",
      "pseudo_rasi_lord": "Venus",
      "pseudo_nakshatra": "Krittika",
      "pseudo_nakshatra_no": 3,
      "pseudo_nakshatra_pada": 3,
      "pseudo_nakshatra_lord": "Sun",
      "sub_lord": "Saturn",
      "sub_sub_lord": "Ketu",
      "full_name": "Saturn"
    },
    "8": {
      "rasi_no": 4,
      "zodiac": "Cancer",
      "retro": true,
      "name": "Ra",
      "house": 10,
      "global_degree": 91.20596196774932,
      "local_degree": 1.2059619677493174,
      "pseudo_rasi_no": 4,
      "pseudo_rasi": "Cancer",
      "pseudo_rasi_lord": "Moon",
      "pseudo_nakshatra": "Punarvasu",
      "pseudo_nakshatra_no": 7,
      "pseudo_nakshatra_pada": 4,
      "pseudo_nakshatra_lord": "Jupiter",
      "sub_lord": "Mars",
      "sub_sub_lord": "Ketu",
      "full_name": "Rahu"
    },
    "9": {
      "rasi_no": 10,
      "zodiac": "Capricorn",
      "retro": true,
      "name": "Ke",
      "house": 4,
      "global_degree": 271.2059619677493,
      "local_degree": 1.2059619677493032,
      "pseudo_rasi_no": 10,
      "pseudo_rasi": "Capricorn",
      "pseudo_rasi_lord": "Saturn",
      "pseudo_nakshatra": "UttraShadha",
      "pseudo_nakshatra_no": 21,
      "pseudo_nakshatra_pada": 2,
      "pseudo_nakshatra_lord": "Sun",
      "sub_lord": "Rahu",
      "sub_sub_lord": "Moon",
      "full_name": "Ketu"
    },
    "midheaven": 13.45981620353271,
    "ascendant": 14.145816203532718
  },
  [
    {
      "start_rasi": "Libra",
      "end_rasi": "Scorpio",
      "end_rasi_lord": "Mars",
      "local_start_degree": 8.491066124885606,
      "local_end_degree": 9.285066124885589,
      "length": 30.793999999999983,
      "house": 1,
      "bhavmadhya": 23.888066124885597,
      "global_start_degree": 203.478,
      "global_end_degree": 234.272,
      "start_nakshatra": "Vishakha",
      "end_nakshatra": "Jyeshtha",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "0",
          "full_name": "Ascendant",
          "name": "As",
          "nakshatra": "Vishakha",
          "nakshatra_no": 16,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "7",
          "full_name": "Saturn",
          "name": "Sa",
          "nakshatra": "Jyeshtha",
          "nakshatra_no": 18,
          "nakshatra_pada": 2,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Scorpio",
      "end_rasi": "Sagittarius",
      "end_rasi_lord": "Jupiter",
      "local_start_degree": 10.105166124885585,
      "local_end_degree": 9.258966124885575,
      "length": 29.15379999999999,
      "house": 2,
      "bhavmadhya": 24.68206612488558,
      "global_start_degree": 234.272,
      "global_end_degree": 263.4258,
      "start_nakshatra": "Jyeshtha",
      "end_nakshatra": "PurvaShadha",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Sagittarius",
      "end_rasi": "Capricorn",
      "end_rasi_lord": "Saturn",
      "local_start_degree": 9.55891612488557,
      "local_end_degree": 8.112816124885569,
      "length": 28.5539,
      "house": 3,
      "bhavmadhya": 23.83586612488557,
      "global_start_degree": 263.4258,
      "global_end_degree": 291.9797,
      "start_nakshatra": "PurvaShadha",
      "end_nakshatra": "Sravana",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Moon",
      "planets": [],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Capricorn",
      "end_rasi": "Aquarius",
      "end_rasi_lord": "Saturn",
      "local_start_degree": 6.873466124885567,
      "local_end_degree": 7.9060661248855695,
      "length": 31.032600000000002,
      "house": 4,
      "bhavmadhya": 22.38976612488557,
      "global_start_degree": 291.9797,
      "global_end_degree": 323.0123,
      "start_nakshatra": "Sravana",
      "end_nakshatra": "PurvaBhadra",
      "start_nakshatra_lord": "Moon",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Venus",
      "cusp_sub_sub_lord": "Saturn"
    },
    {
      "start_rasi": "Aquarius",
      "end_rasi": "Pisces",
      "end_rasi_lord": "Jupiter",
      "local_start_degree": 7.797316124885555,
      "local_end_degree": 9.047416124885586,
      "length": 31.25010000000003,
      "house": 5,
      "bhavmadhya": 23.42236612488557,
      "global_start_degree": 323.0123,
      "global_end_degree": 354.2624,
      "start_nakshatra": "PurvaBhadra",
      "end_nakshatra": "Revati",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "8",
          "full_name": "Rahu",
          "name": "Ra",
          "nakshatra": "UttaraBhadra",
          "nakshatra_no": 26,
          "nakshatra_pada": 3,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Moon"
    },
    {
      "start_rasi": "Pisces",
      "end_rasi": "Aries",
      "end_rasi_lord": "Mars",
      "local_start_degree": 10.064666124885605,
      "local_end_degree": 9.2802661248856,
      "length": 29.215599999999995,
      "house": 6,
      "bhavmadhya": 24.672466124885602,
      "global_start_degree": 354.2624,
      "global_end_degree": 23.478,
      "start_nakshatra": "Revati",
      "end_nakshatra": "Bharani",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [
        {
          "planetId": "5",
          "full_name": "Jupiter",
          "name": "Ju",
          "nakshatra": "Ashvini",
          "nakshatra_no": 1,
          "nakshatra_pada": 2,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Aries",
      "end_rasi": "Taurus",
      "end_rasi_lord": "Venus",
      "local_start_degree": 8.491066124885599,
      "local_end_degree": 9.285066124885596,
      "length": 30.793999999999997,
      "house": 7,
      "bhavmadhya": 23.888066124885597,
      "global_start_degree": 23.478,
      "global_end_degree": 54.272,
      "start_nakshatra": "Bharani",
      "end_nakshatra": "Mrigashira",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Mars",
      "planets": [],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Taurus",
      "end_rasi": "Gemini",
      "end_rasi_lord": "Mercury",
      "local_start_degree": 10.105166124885596,
      "local_end_degree": 9.258966124885589,
      "length": 29.153799999999997,
      "house": 8,
      "bhavmadhya": 24.682066124885594,
      "global_start_degree": 54.272,
      "global_end_degree": 83.4258,
      "start_nakshatra": "Mrigashira",
      "end_nakshatra": "Punarvasu",
      "start_nakshatra_lord": "Mars",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Gemini",
      "end_rasi": "Cancer",
      "end_rasi_lord": "Moon",
      "local_start_degree": 9.558916124885592,
      "local_end_degree": 8.11281612488559,
      "length": 28.5539,
      "house": 9,
      "bhavmadhya": 23.83586612488559,
      "global_start_degree": 83.4258,
      "global_end_degree": 111.9797,
      "start_nakshatra": "Punarvasu",
      "end_nakshatra": "Ashlesha",
      "start_nakshatra_lord": "Jupiter",
      "end_nakshatra_lord": "Mercury",
      "planets": [
        {
          "planetId": "2",
          "full_name": "Moon",
          "name": "Mo",
          "nakshatra": "Punarvasu",
          "nakshatra_no": 7,
          "nakshatra_pada": 3,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Rahu"
    },
    {
      "start_rasi": "Cancer",
      "end_rasi": "Leo",
      "end_rasi_lord": "Sun",
      "local_start_degree": 6.8734661248855815,
      "local_end_degree": 7.906066124885598,
      "length": 31.032600000000016,
      "house": 10,
      "bhavmadhya": 22.38976612488559,
      "global_start_degree": 111.9797,
      "global_end_degree": 143.0123,
      "start_nakshatra": "Ashlesha",
      "end_nakshatra": "PurvaPhalguni",
      "start_nakshatra_lord": "Mercury",
      "end_nakshatra_lord": "Venus",
      "planets": [
        {
          "planetId": "1",
          "full_name": "Sun",
          "name": "Su",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "3",
          "full_name": "Mars",
          "name": "Ma",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "4",
          "full_name": "Mercury",
          "name": "Me",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        },
        {
          "planetId": "6",
          "full_name": "Venus",
          "name": "Ve",
          "nakshatra": "Magha",
          "nakshatra_no": 10,
          "nakshatra_pada": 2,
          "retro": false
        }
      ],
      "cusp_sub_lord": "Sun",
      "cusp_sub_sub_lord": "Mercury"
    },
    {
      "start_rasi": "Leo",
      "end_rasi": "Virgo",
      "end_rasi_lord": "Mercury",
      "local_start_degree": 7.797316124885604,
      "local_end_degree": 9.047416124885608,
      "length": 31.250100000000003,
      "house": 11,
      "bhavmadhya": 23.422366124885606,
      "global_start_degree": 143.0123,
      "global_end_degree": 174.2624,
      "start_nakshatra": "PurvaPhalguni",
      "end_nakshatra": "Chitra",
      "start_nakshatra_lord": "Venus",
      "end_nakshatra_lord": "Mars",
      "planets": [
        {
          "planetId": "9",
          "full_name": "Ketu",
          "name": "Ke",
          "nakshatra": "Hasta",
          "nakshatra_no": 13,
          "nakshatra_pada": 1,
          "retro": true
        }
      ],
      "cusp_sub_lord": "Saturn",
      "cusp_sub_sub_lord": "Sun"
    },
    {
      "start_rasi": "Virgo",
      "end_rasi": "Libra",
      "end_rasi_lord": "Venus",
      "local_start_degree": 10.064666124885612,
      "local_end_degree": 9.280266124885607,
      "length": 29.215599999999995,
      "house": 12,
      "bhavmadhya": 24.67246612488561,
      "global_start_degree": 174.2624,
      "global_end_degree": 203.478,
      "start_nakshatra": "Chitra",
      "end_nakshatra": "Vishakha",
      "start_nakshatra_lord": "Mars",
      "end_nakshatra_lord": "Jupiter",
      "planets": [],
      "cusp_sub_lord": "Rahu",
      "cusp_sub_sub_lord": "Rahu"
    }
  ],
  {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  },
  {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  },
  "moon_sign": "Taurus",
  [
    {
      "retro": false,
      "start_date": "Wed Dec 26 1984",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sun May 26 1985"
    },
    {
      "retro": false,
      "start_date": "Mon Sep 23 1985",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Mon Dec 21 1987"
    },
    {
      "retro": false,
      "start_date": "Mon Dec 21 1987",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Tue Mar 27 1990"
    },
    {
      "retro": true,
      "start_date": "Fri Jun 15 1990",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Wed Dec 19 1990"
    },
    {
      "retro": true,
      "start_date": "Mon Apr 20 1998",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Fri Jun 09 2000"
    },
    {
      "retro": false,
      "start_date": "Fri Jun 09 2000",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Fri Jan 19 2001"
    },
    {
      "retro": true,
      "start_date": "Fri Jan 19 2001",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Thu Feb 01 2001"
    },
    {
      "retro": false,
      "start_date": "Thu Feb 01 2001",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Thu Jul 25 2002"
    },
    {
      "retro": false,
      "start_date": "Thu Jul 25 2002",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Mon Jan 06 2003"
    },
    {
      "retro": true,
      "start_date": "Mon Jan 06 2003",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Fri Apr 11 2003"
    },
    {
      "retro": false,
      "start_date": "Fri Apr 11 2003",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Wed Sep 08 2004"
    },
    {
      "retro": true,
      "start_date": "Wed Jan 12 2005",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Sat May 28 2005"
    },
    {
      "retro": false,
      "start_date": "Sat Nov 04 2006",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Tue Jan 09 2007"
    },
    {
      "retro": false,
      "start_date": "Wed Jul 18 2007",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Fri Sep 11 2009"
    },
    {
      "retro": false,
      "start_date": "Mon Nov 03 2014",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Fri Jan 27 2017"
    },
    {
      "retro": false,
      "start_date": "Fri Jan 27 2017",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Wed Jun 21 2017"
    },
    {
      "retro": true,
      "start_date": "Wed Jun 21 2017",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Fri Oct 27 2017"
    },
    {
      "retro": false,
      "start_date": "Fri Oct 27 2017",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Fri Jan 24 2020"
    },
    {
      "retro": true,
      "start_date": "Wed Jun 02 2027",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Fri Oct 22 2027"
    },
    {
      "retro": true,
      "start_date": "Tue Feb 22 2028",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Sun Aug 05 2029"
    },
    {
      "retro": false,
      "start_date": "Sun Aug 05 2029",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Tue Oct 09 2029"
    },
    {
      "retro": true,
      "start_date": "Tue Oct 09 2029",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Tue Apr 16 2030"
    },
    {
      "retro": false,
      "start_date": "Tue Apr 16 2030",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Sun May 30 2032"
    },
    {
      "retro": false,
      "start_date": "Sun May 30 2032",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Wed Jul 12 2034"
    },
    {
      "retro": false,
      "start_date": "Tue Aug 26 2036",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Wed Oct 20 2038"
    },
    {
      "retro": true,
      "start_date": "Mon Apr 11 2039",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sat Jul 09 2039"
    },
    {
      "retro": false,
      "start_date": "Wed Dec 09 2043",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sat Jul 02 2044"
    },
    {
      "retro": false,
      "start_date": "Mon Aug 22 2044",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Wed Dec 05 2046"
    },
    {
      "retro": false,
      "start_date": "Wed Dec 05 2046",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Tue Mar 02 2049"
    },
    {
      "retro": true,
      "start_date": "Fri Jul 16 2049",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Tue Nov 30 2049"
    },
    {
      "retro": true,
      "start_date": "Tue Apr 03 2057",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Sat May 24 2059"
    },
    {
      "retro": false,
      "start_date": "Sat May 24 2059",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Wed Jul 06 2061"
    },
    {
      "retro": false,
      "start_date": "Wed Jul 06 2061",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Sun Aug 19 2063"
    },
    {
      "retro": true,
      "start_date": "Sat Feb 16 2064",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Thu May 01 2064"
    },
    {
      "retro": false,
      "start_date": "Tue Oct 06 2065",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sat Feb 13 2066"
    },
    {
      "retro": false,
      "start_date": "Sun Jun 27 2066",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Fri Dec 30 2067"
    },
    {
      "retro": true,
      "start_date": "Mon Jan 09 2068",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sat Aug 25 2068"
    },
    {
      "retro": false,
      "start_date": "Mon Jan 23 2073",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sat Apr 15 2073"
    },
    {
      "retro": false,
      "start_date": "Tue Oct 17 2073",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Thu Jan 09 2076"
    },
    {
      "retro": false,
      "start_date": "Thu Jan 09 2076",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sun Jul 26 2076"
    },
    {
      "retro": true,
      "start_date": "Sun Jul 26 2076",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Mon Sep 28 2076"
    },
    {
      "retro": false,
      "start_date": "Mon Sep 28 2076",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Sun Jan 08 2079"
    },
    {
      "retro": true,
      "start_date": "Tue May 14 2086",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Wed Nov 27 2086"
    },
    {
      "retro": true,
      "start_date": "Fri Jan 24 2087",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Wed Jul 07 2088"
    },
    {
      "retro": false,
      "start_date": "Wed Jul 07 2088",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Sat Nov 13 2088"
    },
    {
      "retro": true,
      "start_date": "Sat Nov 13 2088",
      "zodiac": "Aries",
      "type": "Sade Sati",
      "dhaiya": "1st Dhaiya",
      "direction": "Rising",
      "end_date": "Mon Mar 28 2089"
    },
    {
      "retro": false,
      "start_date": "Mon Mar 28 2089",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Wed Aug 30 2090"
    },
    {
      "retro": false,
      "start_date": "Wed Aug 30 2090",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Wed Nov 15 2090"
    },
    {
      "retro": true,
      "start_date": "Wed Nov 15 2090",
      "zodiac": "Taurus",
      "type": "Sade Sati",
      "dhaiya": "2nd Dhaiya",
      "direction": "Peak",
      "end_date": "Sun May 13 2091"
    },
    {
      "retro": false,
      "start_date": "Sun May 13 2091",
      "zodiac": "Gemini",
      "type": "Sade Sati",
      "dhaiya": "3rd Dhaiya",
      "direction": "Setting",
      "end_date": "Thu Jun 25 2093"
    },
    {
      "retro": false,
      "start_date": "Wed Aug 10 2095",
      "zodiac": "Leo",
      "type": "Ardhastama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Thu Oct 03 2097"
    },
    {
      "retro": false,
      "start_date": "Thu Nov 23 2102",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Wed Feb 25 2105"
    },
    {
      "retro": false,
      "start_date": "Wed Feb 25 2105",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Thu May 14 2105"
    },
    {
      "retro": true,
      "start_date": "Thu May 14 2105",
      "zodiac": "Scorpio",
      "type": "Kantaka Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Thu Nov 19 2105"
    },
    {
      "retro": false,
      "start_date": "Thu Nov 19 2105",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Mon Feb 13 2108"
    },
    {
      "retro": true,
      "start_date": "Sat Aug 18 2108",
      "zodiac": "Sagittarius",
      "type": "Ashtama Shani",
      "dhaiya": "Small Panoti",
      "direction": "N/A",
      "end_date": "Tue Nov 06 2108"
    }
  ],
  {
    "Atma": {
      "name": "Atmakaraka",
      "planet": "Saturn",
      "siginfier": "Self",
      "house": 1,
      "zodiac": "Aquarius",
      "rasi_no": 11,
      "local_degree": 1.4817198445355757,
      "global_degree": 301.4817198445356
    },
    "Amatya": {
      "name": "Amatyakaraka",
      "planet": "Jupiter",
      "siginfier": "Wealth",
      "house": 9,
      "zodiac": "Libra",
      "rasi_no": 7,
      "local_degree": 12.440935516278472,
      "global_degree": 192.44093551627847
    },
    "Bhratru": {
      "name": "Bhratrukaraka",
      "planet": "Mercury",
      "siginfier": "Siblings",
      "house": 10,
      "zodiac": "Scorpio",
      "rasi_no": 8,
      "local_degree": 12.592829148427398,
      "global_degree": 222.5928291484274
    },
    "Matri": {
      "name": "Matrikaraka",
      "planet": "Venus",
      "siginfier": "Mother",
      "house": 10,
      "zodiac": "Scorpio",
      "rasi_no": 8,
      "local_degree": 16.620029881475062,
      "global_degree": 226.62002988147506
    },
    "Putra": {
      "name": "Putrakaraka",
      "planet": "Sun",
      "siginfier": "Children",
      "house": 10,
      "zodiac": "Scorpio",
      "rasi_no": 8,
      "local_degree": 25.440556885061483,
      "global_degree": 235.44055688506148
    },
    "Gnati": {
      "name": "Gnatikaraka",
      "planet": "Moon",
      "siginfier": "Relatives",
      "house": 9,
      "zodiac": "Libra",
      "rasi_no": 7,
      "local_degree": 26.854166007635172,
      "global_degree": 206.85416600763517
    },
    "Dara": {
      "name": "Darakaraka",
      "planet": "Mars",
      "siginfier": "Spouse",
      "house": 10,
      "zodiac": "Scorpio",
      "rasi_no": 8,
      "local_degree": 29.657846381365317,
      "global_degree": 239.65784638136532
    }
  },
  {
          "manglik_by_mars": true,
          "factors": [
            "Manglik dosha is created by Mars-Venus association."
          ],
          "bot_response": "You are 6% manglik. ",
          "manglik_by_saturn": false,
          "manglik_by_rahuketu": false,
          "aspects": [
            "Rahu in the 3rd is aspecting the 7th",
            "Ketu in the 9th is aspecting the 1st",
            "Saturn in the 4th is aspecting the 1st"
          ],
          "score": 6
        }
    Ensure it is thorough, clear, practical, and suitable for PDF display without markdown.
  `;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 3000 }
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || `${sectionPrompt.split(":")[0]} section could not be generated.`;
      text = removeMarkdown(text);

      // Add new page for this section
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, 50, pageWidth - 50 - 50);
    }

    // Generate "09 Timing & Predictive Insights" section
    doc.addPage();

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);


    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Timing & Predictive Insights", pageWidth / 2, pageHeight / 2, { align: "center", baseline: "middle" });
    const timingSections = [
      "Mahadashas & Antardashas: Life Phases & Opportunities",
      "Planetary Periods & Impact: Short-term & Long-term Influences",
      "Transits & Progressions: How Planetary Movements Affect Life Events",
      "Favorable & Challenging Periods: Key Dates, Phases & Practical Guidance"
    ];

    const PAGE_MARGIN = 25;
    const PAGE_HEIGHT = 842;
    const LINE_HEIGHT = 20;

    for (const sectionPrompt of timingSections) {
      const fullPrompt = `
    You are an expert, narrative-focused Vedic astrologer. 
    Generate a lavishly detailed, highly personalized astrology report section titled:
    "${sectionPrompt}"
    based on the given JSON birth data.
JSON: {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  },
  {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  },
  {
    "factors": {
      "moon": "Mangal dosh from moon lagna, mars in house  1, aspecting the houses 4, 7 and 8 ",
      "saturn": "Mangal dosh along with mars-saturn association/aspect, mars in house 10 and saturn in house 10 ",
      "rahu": "Rahu transforming into mars in house 7 in the sign of Scorpio"
    },
    "is_dosha_present": true,
    "bot_response": "You are 67% manglik, It is good to consult an astrologer",
    "score": 67
  },
  {
    "is_dosha_present": true,
    "dosha_direction": "Descending",
    "dosha_type": "Shankpal",
    "rahu_ketu_axis": "4-10",
  },
  {
          "manglik_by_mars": true,
          "factors": [
            "Manglik dosha is created by Mars-Venus association."
          ],
          "manglik_by_saturn": false,
          "manglik_by_rahuketu": false,
          "aspects": [
            "Rahu in the 3rd is aspecting the 7th",
            "Ketu in the 9th is aspecting the 1st",
            "Saturn in the 4th is aspecting the 1st"
          ],
          "score": 6
        },
        {
    "is_dosha_present": true,
  },
  {
    "rahu_papa": 3.25,
    "sun_papa": 5.625,
    "saturn_papa": 0,
    "mars_papa": 9
  },
{
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "meaning": "Vesi Yoga represents a balanced outlook, characterized by truthfulness and a tall yet somewhat sluggish nature. Those born under this yoga find contentment and happiness with modest wealth and resources.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "meaning": "Vosi Yoga indicates skillfulness, charity, fame, knowledge, and physical strength. Individuals born under this yoga tend to be recognized for their talents and are often celebrated for their generosity and wisdom.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "meaning": "Ubhayachara Yoga suggests being born with all the comforts of life. Such individuals often rise to positions of authority, possibly becoming kings or holding prominent leadership roles due to their innate qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "meaning": "Budha Aditya Yoga signifies intelligence, skillfulness, and expertise in various endeavors. Those born under this yoga are widely recognized and respected for their abilities and enjoy a profound sense of contentment and happiness.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "meaning": "When the Moon is positioned in a kendra from the Sun, it typically results in moderate wealth, intelligence, and skills in one's life.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "meaning": "Hamsa Yoga signifies a spacious nature akin to a swan, purity, spirituality, comfort, respect, passion, potential leadership roles, an enjoyment of life, and the ability to speak eloquently and clearly.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "meaning": "Paasa Yoga may involve the risk of facing imprisonment but is associated with considerable capability in one's work. These individuals tend to be talkative, often having a team of servants at their disposal, although their character may be lacking in certain aspects.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "meaning": "Gaja-Kesari Yoga signifies fame, wealth, intelligence, and outstanding character. Individuals under this yoga are often well-liked by kings, bosses, and other leaders, and the presence of benefic aspects amplifies these qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "meaning": "Kaahala Yoga represents a strong and bold personality, often leading a large team or group. These individuals may accumulate properties over their lifetime and exhibit cunning traits.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "meaning": "Sankha Yoga indicates a life blessed with wealth, a loving spouse, and children. These individuals are known for their kindness, piety, intelligence, and long life expectancy.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "meaning": "Mridanga Yoga signifies an individual who holds a kingly or equal leadership position. They lead a life marked by happiness, wealth, and elegance, embodying the traits of a successful and refined leader.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "meaning": "Kalpadruma Yoga represents powerful leaders who actively embrace challenges, fight for justice, and fearlessly pursue prosperity. They are principled, strong-willed, and compassionate in their actions.",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "meaning": "Bhaarathi Yoga represents great scholars who are marked by intelligence, religiosity, good looks, and fame. They often excel in various fields and are celebrated for their contributions to knowledge and society.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "meaning": "13 raja Yogas present by house associations, Raja Yogas signify exceptional power and prosperity, with individuals often holding dominion over their peers.",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "meaning": "Dharma-Karmadhipati Yoga signifies individuals who are sincere, devoted, and righteous. They are fortunate and highly praised for their moral and ethical virtues.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "meaning": "Raaja Yoga brings a life filled with enjoyment, harmonious relationships, and the blessing of children. Those with this Yoga experience an abundance of life's pleasures and strong family connections.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
        "meaning": "Those with Raja Sambandha Yoga are exceptionally intelligent and often attain ministerial positions or equivalent roles within organizations. Their intellect and abilities are highly regarded.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "meaning": "Those undergoing the mahadasha experience richness and fame. They accumulate substantial wealth during this period, satisfying their desires.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  },
  [
    {
      "planet_considered": "Sun",
      "planet_location": 10,
      "planet_native_location": 11,
      "planet_zodiac": "Cancer",
      "zodiac_lord": "Moon",
      "zodiac_lord_location": "Virgo",
      "zodiac_lord_house_location": 12,
      "character_keywords_positive": [
        "principled",
        "Attractive",
        "Virtuous",
        "Creative"
      ],
      "character_keywords_negative": [
        "indecisive",
        "Doubtful"
      ]
    }
  ],
  [
        {
            "planet_considered": "Moon",
            "planet_location": 12,
            "planet_native_location": 10,
            "planet_zodiac": "Virgo",
            "zodiac_lord": "Mercury",
            "zodiac_lord_location": "Cancer",
            "zodiac_lord_house_location": 10,
            "character_keywords_positive": [
                "Intellect",
                "Attractive",
                "Eloquent",
                "Truthful"
            ],
            "character_keywords_negative": [
                "Sensitive",
                "Inferior"
            ]
        }
    ],
     [
        {
            "planet_considered": "Mercury",
            "planet_location": 10,
            "planet_native_location": 9,
            "planet_zodiac": "Cancer",
            "zodiac_lord": "Moon",
            "zodiac_lord_location": "Virgo",
            "zodiac_lord_house_location": 12,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Wise",
                "Emotional",
                "Sympathetic",
                "Sentimental"
            ],
            "character_keywords_negative": [
                "Moody",
                "Directionless"
            ]
        }
    ],
    [
        {
            "planet_considered": "Venus",
            "planet_location": 12,
            "planet_native_location": 1,
            "planet_zodiac": "Virgo",
            "zodiac_lord": "Mercury",
            "zodiac_lord_location": "Cancer",
            "zodiac_lord_house_location": 10,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Debilitated",
            "character_keywords_positive": [
                "Cautious",
                "Polite",
                "Romantic",
                "Creative"
            ],
            "character_keywords_negative": [
                "Hypersexual",
                "Materialistic"
            ]
        }
    ],
    [
        {
            "planet_considered": "Mars",
            "planet_location": 3,
            "planet_native_location": 2,
            "planet_zodiac": "Sagittarius",
            "zodiac_lord": "Jupiter",
            "zodiac_lord_location": "Aquarius",
            "zodiac_lord_house_location": 5,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Wise",
                "Skillful",
                "Adventurous",
                "Spiritual"
            ],
            "character_keywords_negative": [
                "Argumentative",
                "Inconsiderate"
            ]
        }
    ],
    [
        {
            "planet_considered": "Saturn",
            "planet_location": 2,
            "planet_native_location": 4,
            "planet_zodiac": "Scorpio",
            "zodiac_lord": "Mars",
            "zodiac_lord_location": "Sagittarius",
            "zodiac_lord_house_location": 3,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Researcher",
                "Strong-willed",
                "Adventurous",
                "Risk-taking"
            ],
            "character_keywords_negative": [
                "Mysterious",
                "Demanding"
            ]
        }
    ],
     [
        {
            "planet_considered": "Jupiter",
            "planet_location": 5,
            "planet_native_location": 3,
            "planet_zodiac": "Aquarius",
            "zodiac_lord": "Saturn",
            "zodiac_lord_location": "Scorpio",
            "zodiac_lord_house_location": 2,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Welcoming",
                "Accommodative",
                "Intellectual",
                "Unbiased"
            ],
            "character_keywords_negative": [
                "Undisciplined"
            ]
        }
    ],
    [
        {
            "planet_considered": "Rahu",
            "planet_location": 7,
            "planet_native_location": 5,
            "planet_zodiac": "Aries",
            "zodiac_lord": "Mars",
            "zodiac_lord_location": "Sagittarius",
            "zodiac_lord_house_location": 3,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Aggressive",
                "Intelligent",
                "Wealthy",
                "Determine"
            ],
            "character_keywords_negative": [
                "Short-tempered",
                "Reckless"
            ]
        }
    ],
    [
        {
            "planet_considered": "Ketu",
            "planet_location": 1,
            "planet_native_location": 2,
            "planet_zodiac": "Libra",
            "zodiac_lord": "Venus",
            "zodiac_lord_location": "Virgo",
            "zodiac_lord_house_location": 12,
            "zodiac_lord_strength": "Debilitated",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Adventurous",
                "Talkative",
                "Aggressive",
                "Spiritual"
            ],
            "character_keywords_negative": [
                "Dishonest",
                "Short-tempered"
            ]
        }
    ],
    Include practical timing insights drawn from Mahadashas, Antardashas, transits, and yogas.
    For each section, explain how these timings influence the native’s real-life experiences,
    decision-making, opportunities, and inner growth.
    Write in a warm, insightful, client-ready style (no markdown).
  `;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 5000 }
        })
      });

      const data = await response.json();
      let text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        `${sectionPrompt.split(":")[0]} section could not be generated.`;
      text = removeMarkdown(text);

      doc.addPage();

      // Draw decorative border
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      // --- Section Title ---
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      // --- Section Subtitle ---
      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      doc.text(sectionPrompt.split(":")[1] || "", pageWidth / 2, 80, { align: "center" });

      // Start content after title/subtitle
      let cursorY = 110;

      // --- Mahadasha Table ---
      if (sectionPrompt.includes("Mahadashas")) {
        const mahaData =
          Default?.mahadasha_data?.mahadasha?.map((planet, i) => [
            planet,
            Default?.mahadasha_data?.mahadasha_order?.[i] ?? "N/A"
          ]) || [];

        cursorY = addPaginatedTable(doc, ["Planet", "Start Date"], mahaData, cursorY, PAGE_HEIGHT);

        doc.setFont("Times", "italic");
        doc.setFontSize(12);
        doc.setTextColor("#444");

        const pageWidth = doc.internal.pageSize.getWidth();
        //const textWidth = doc.getTextWidth(explanation);
        //doc.text(explanation, (pageWidth - textWidth) / 2, cursorY + LINE_HEIGHT);
        cursorY += 2 * LINE_HEIGHT;
      }

      // --- Antardasha Tables ---
      if (sectionPrompt.includes("Planetary Periods")) {
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

          doc.setFont("Times", "italic");
          doc.setFontSize(12);
          doc.setTextColor("#444");
          //const explanation = `The table above represents the sub-periods (Antardashas) of ${mahaName} Mahadasha. These finer periods influence day-to-day experiences, decisions, and personal growth.`;

          const pageWidth = doc.internal.pageSize.getWidth();
          // const textWidth = doc.getTextWidth(explanation);
          // doc.text(explanation, (pageWidth - textWidth) / 2, cursorY + LINE_HEIGHT);
          cursorY += 2 * LINE_HEIGHT;
        });
      }

      // --- Regular content paragraphs ---
      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, cursorY, pageWidth - 50 - 50);
    }

    // --- Helper: addPaginatedTable ---
    function addPaginatedTable(
      doc: any,
      headers: string[],
      data: any[],
      startY: number,
      pageHeight: number
    ): number {
      const tableWidth = 400;
      const colWidth = tableWidth / headers.length;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageNumber = () => doc.internal.getCurrentPageInfo().pageNumber;
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
      const drawFooter = () => {
        const footerY = pageHeight - 20;
        doc.setFont("Times", "italic");
        doc.setFontSize(10);
        doc.setTextColor("#999");
        doc.text(
          `Page ${pageNumber()}`,
          pageWidth / 2,
          footerY,
          { align: "center" }
        );
      };

      // --- DRAW HEADER ROW ---
      const drawHeader = (yPos: number) => {
        doc.setFont("Times", "bold");
        doc.setFontSize(13);
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

      doc.setFont("Times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0);

      // --- DRAW TABLE ROWS ---
      for (let i = 0; i < data.length; i++) {
        // Check if next row fits; if not, add new page
        if (y + LINE_HEIGHT + PAGE_MARGIN > pageHeight) {
          drawFooter();
          doc.addPage();
          drawPageBorder();
          y = PAGE_MARGIN;
          y = drawHeader(y);
          doc.setFont("Times", "normal");
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
      drawFooter();
      drawPageBorder();

      return y;
    }
    doc.addPage();

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);
    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Add centered text
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");
    doc.text("Remedies & Spiritual Guidance", pageWidth / 2, pageHeight / 2 + 40, { align: "center", baseline: "middle" });
    const remediesSections = [
      "General Remedies: Everyday Practices & Rituals",
      "Planet-specific Remedies: Personalized Solutions",
      "Dosha Remedies: Balancing Manglik, Shankpal, Rahu-Ketu Influences",
      "Yoga Remedies: Enhancing Benefic Yogas & Mitigating Malefic Yogas"
    ];

    // --- Loop through each remedies sub-section ---
    for (const sectionPrompt of remediesSections) {
      const fullPrompt = `
    You are an expert, narrative-focused Vedic astrologer.
    Generate a lavishly detailed, highly personalized astrology remedies section titled:
    "${sectionPrompt}"
    based on the given JSON birth data.

    Include practical remedies such as mantras, gemstones, rituals, donations, yantras, and lifestyle adjustments.
    Explain how each remedy helps the native balance planetary influences, doshas, and yogas.
    Write in a warm, insightful, client-ready style (no markdown).
    JSON: {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  },
  {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  },
  {
    "factors": {
      "moon": "Mangal dosh from moon lagna, mars in house  1, aspecting the houses 4, 7 and 8 ",
      "saturn": "Mangal dosh along with mars-saturn association/aspect, mars in house 10 and saturn in house 10 ",
      "rahu": "Rahu transforming into mars in house 7 in the sign of Scorpio"
    },
    "is_dosha_present": true,
    "bot_response": "You are 67% manglik, It is good to consult an astrologer",
    "score": 67
  },
  {
    "is_dosha_present": true,
    "dosha_direction": "Descending",
    "dosha_type": "Shankpal",
    "rahu_ketu_axis": "4-10",
  },
  {
          "manglik_by_mars": true,
          "factors": [
            "Manglik dosha is created by Mars-Venus association."
          ],
          "manglik_by_saturn": false,
          "manglik_by_rahuketu": false,
          "aspects": [
            "Rahu in the 3rd is aspecting the 7th",
            "Ketu in the 9th is aspecting the 1st",
            "Saturn in the 4th is aspecting the 1st"
          ],
          "score": 6
        },
        {
    "is_dosha_present": true,
  },
  {
    "rahu_papa": 3.25,
    "sun_papa": 5.625,
    "saturn_papa": 0,
    "mars_papa": 9
  },
{
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "meaning": "Vesi Yoga represents a balanced outlook, characterized by truthfulness and a tall yet somewhat sluggish nature. Those born under this yoga find contentment and happiness with modest wealth and resources.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "meaning": "Vosi Yoga indicates skillfulness, charity, fame, knowledge, and physical strength. Individuals born under this yoga tend to be recognized for their talents and are often celebrated for their generosity and wisdom.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "meaning": "Ubhayachara Yoga suggests being born with all the comforts of life. Such individuals often rise to positions of authority, possibly becoming kings or holding prominent leadership roles due to their innate qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "meaning": "Budha Aditya Yoga signifies intelligence, skillfulness, and expertise in various endeavors. Those born under this yoga are widely recognized and respected for their abilities and enjoy a profound sense of contentment and happiness.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "meaning": "When the Moon is positioned in a kendra from the Sun, it typically results in moderate wealth, intelligence, and skills in one's life.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "meaning": "Hamsa Yoga signifies a spacious nature akin to a swan, purity, spirituality, comfort, respect, passion, potential leadership roles, an enjoyment of life, and the ability to speak eloquently and clearly.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "meaning": "Paasa Yoga may involve the risk of facing imprisonment but is associated with considerable capability in one's work. These individuals tend to be talkative, often having a team of servants at their disposal, although their character may be lacking in certain aspects.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "meaning": "Gaja-Kesari Yoga signifies fame, wealth, intelligence, and outstanding character. Individuals under this yoga are often well-liked by kings, bosses, and other leaders, and the presence of benefic aspects amplifies these qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "meaning": "Kaahala Yoga represents a strong and bold personality, often leading a large team or group. These individuals may accumulate properties over their lifetime and exhibit cunning traits.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "meaning": "Sankha Yoga indicates a life blessed with wealth, a loving spouse, and children. These individuals are known for their kindness, piety, intelligence, and long life expectancy.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "meaning": "Mridanga Yoga signifies an individual who holds a kingly or equal leadership position. They lead a life marked by happiness, wealth, and elegance, embodying the traits of a successful and refined leader.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "meaning": "Kalpadruma Yoga represents powerful leaders who actively embrace challenges, fight for justice, and fearlessly pursue prosperity. They are principled, strong-willed, and compassionate in their actions.",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "meaning": "Bhaarathi Yoga represents great scholars who are marked by intelligence, religiosity, good looks, and fame. They often excel in various fields and are celebrated for their contributions to knowledge and society.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "meaning": "13 raja Yogas present by house associations, Raja Yogas signify exceptional power and prosperity, with individuals often holding dominion over their peers.",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "meaning": "Dharma-Karmadhipati Yoga signifies individuals who are sincere, devoted, and righteous. They are fortunate and highly praised for their moral and ethical virtues.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "meaning": "Raaja Yoga brings a life filled with enjoyment, harmonious relationships, and the blessing of children. Those with this Yoga experience an abundance of life's pleasures and strong family connections.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
        "meaning": "Those with Raja Sambandha Yoga are exceptionally intelligent and often attain ministerial positions or equivalent roles within organizations. Their intellect and abilities are highly regarded.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "meaning": "Those undergoing the mahadasha experience richness and fame. They accumulate substantial wealth during this period, satisfying their desires.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  },
  [
    {
      "planet_considered": "Sun",
      "planet_location": 10,
      "planet_native_location": 11,
      "planet_zodiac": "Cancer",
      "zodiac_lord": "Moon",
      "zodiac_lord_location": "Virgo",
      "zodiac_lord_house_location": 12,
      "character_keywords_positive": [
        "principled",
        "Attractive",
        "Virtuous",
        "Creative"
      ],
      "character_keywords_negative": [
        "indecisive",
        "Doubtful"
      ]
    }
  ],
  [
        {
            "planet_considered": "Moon",
            "planet_location": 12,
            "planet_native_location": 10,
            "planet_zodiac": "Virgo",
            "zodiac_lord": "Mercury",
            "zodiac_lord_location": "Cancer",
            "zodiac_lord_house_location": 10,
            "character_keywords_positive": [
                "Intellect",
                "Attractive",
                "Eloquent",
                "Truthful"
            ],
            "character_keywords_negative": [
                "Sensitive",
                "Inferior"
            ]
        }
    ],
     [
        {
            "planet_considered": "Mercury",
            "planet_location": 10,
            "planet_native_location": 9,
            "planet_zodiac": "Cancer",
            "zodiac_lord": "Moon",
            "zodiac_lord_location": "Virgo",
            "zodiac_lord_house_location": 12,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Wise",
                "Emotional",
                "Sympathetic",
                "Sentimental"
            ],
            "character_keywords_negative": [
                "Moody",
                "Directionless"
            ]
        }
    ],
    [
        {
            "planet_considered": "Venus",
            "planet_location": 12,
            "planet_native_location": 1,
            "planet_zodiac": "Virgo",
            "zodiac_lord": "Mercury",
            "zodiac_lord_location": "Cancer",
            "zodiac_lord_house_location": 10,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Debilitated",
            "character_keywords_positive": [
                "Cautious",
                "Polite",
                "Romantic",
                "Creative"
            ],
            "character_keywords_negative": [
                "Hypersexual",
                "Materialistic"
            ]
        }
    ],
    [
        {
            "planet_considered": "Mars",
            "planet_location": 3,
            "planet_native_location": 2,
            "planet_zodiac": "Sagittarius",
            "zodiac_lord": "Jupiter",
            "zodiac_lord_location": "Aquarius",
            "zodiac_lord_house_location": 5,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Wise",
                "Skillful",
                "Adventurous",
                "Spiritual"
            ],
            "character_keywords_negative": [
                "Argumentative",
                "Inconsiderate"
            ]
        }
    ],
    [
        {
            "planet_considered": "Saturn",
            "planet_location": 2,
            "planet_native_location": 4,
            "planet_zodiac": "Scorpio",
            "zodiac_lord": "Mars",
            "zodiac_lord_location": "Sagittarius",
            "zodiac_lord_house_location": 3,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Researcher",
                "Strong-willed",
                "Adventurous",
                "Risk-taking"
            ],
            "character_keywords_negative": [
                "Mysterious",
                "Demanding"
            ]
        }
    ],
     [
        {
            "planet_considered": "Jupiter",
            "planet_location": 5,
            "planet_native_location": 3,
            "planet_zodiac": "Aquarius",
            "zodiac_lord": "Saturn",
            "zodiac_lord_location": "Scorpio",
            "zodiac_lord_house_location": 2,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Welcoming",
                "Accommodative",
                "Intellectual",
                "Unbiased"
            ],
            "character_keywords_negative": [
                "Undisciplined"
            ]
        }
    ],
    [
        {
            "planet_considered": "Rahu",
            "planet_location": 7,
            "planet_native_location": 5,
            "planet_zodiac": "Aries",
            "zodiac_lord": "Mars",
            "zodiac_lord_location": "Sagittarius",
            "zodiac_lord_house_location": 3,
            "zodiac_lord_strength": "Neutral",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Aggressive",
                "Intelligent",
                "Wealthy",
                "Determine"
            ],
            "character_keywords_negative": [
                "Short-tempered",
                "Reckless"
            ]
        }
    ],
    [
        {
            "planet_considered": "Ketu",
            "planet_location": 1,
            "planet_native_location": 2,
            "planet_zodiac": "Libra",
            "zodiac_lord": "Venus",
            "zodiac_lord_location": "Virgo",
            "zodiac_lord_house_location": 12,
            "zodiac_lord_strength": "Debilitated",
            "planet_strength": "Neutral",
            "character_keywords_positive": [
                "Adventurous",
                "Talkative",
                "Aggressive",
                "Spiritual"
            ],
            "character_keywords_negative": [
                "Dishonest",
                "Short-tempered"
            ]
        }
    ],
   House JSON data (all 12 houses):
interface Planet {
  planetId: string;
  full_name: string;
  name: string;
  nakshatra: string;
  nakshatra_no: number;
  nakshatra_pada: number;
  retro: boolean;
}

interface House {
  house: string;
  rasi_no: number;
  zodiac: string;
  aspected_by_planet: string[];
  aspected_by_planet_index: number[];
  planets: Planet[];
  cusp_sub_lord: string;
  cusp_sub_sub_lord: string;
  bhavmadhya: number;
}


const houses: House[] = [
  {
    house: "1",
    rasi_no: 10,
    zodiac: "Capricorn",
    aspected_by_planet: [],
    aspected_by_planet_index: [],
    planets: [
      { planetId: "0", full_name: "Ascendant", name: "As", nakshatra: "Vishakha", nakshatra_no: 16, nakshatra_pada: 2, retro: false },
      { planetId: "7", full_name: "Saturn", name: "Sa", nakshatra: "Jyeshtha", nakshatra_no: 18, nakshatra_pada: 2, retro: false }
    ],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 23.888
  },
  {
    house: "2",
    rasi_no: 11,
    zodiac: "Aquarius",
    aspected_by_planet: ["Moon", "Rahu"],
    aspected_by_planet_index: [2, 8],
    planets: [],
    cusp_sub_lord: "Rahu",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 24.682
  },
  {
    house: "3",
    rasi_no: 12,
    zodiac: "Pisces",
    aspected_by_planet: ["Mars"],
    aspected_by_planet_index: [3],
    planets: [],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 23.836
  },
  {
    house: "4",
    rasi_no: 1,
    zodiac: "Aries",
    aspected_by_planet: ["Sun", "Jupiter", "Rahu"],
    aspected_by_planet_index: [1, 5, 8],
    planets: [],
    cusp_sub_lord: "Venus",
    cusp_sub_sub_lord: "Saturn",
    bhavmadhya: 22.39
  },
  {
    house: "5",
    rasi_no: 2,
    zodiac: "Taurus",
    aspected_by_planet: ["Mercury", "Venus"],
    aspected_by_planet_index: [4, 6],
    planets: [
      { planetId: "8", full_name: "Rahu", name: "Ra", nakshatra: "UttaraBhadra", nakshatra_no: 26, nakshatra_pada: 3, retro: true }
    ],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Moon",
    bhavmadhya: 23.422
  },
  {
    house: "6",
    rasi_no: 3,
    zodiac: "Gemini",
    aspected_by_planet: ["Saturn", "Ketu"],
    aspected_by_planet_index: [7, 9],
    planets: [
      { planetId: "5", full_name: "Jupiter", name: "Ju", nakshatra: "Ashvini", nakshatra_no: 1, nakshatra_pada: 2, retro: true }
    ],
    cusp_sub_lord: "Rahu",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 24.672
  },
  {
    house: "7",
    rasi_no: 4,
    zodiac: "Cancer",
    aspected_by_planet: [],
    aspected_by_planet_index: [],
    planets: [],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 23.888
  },
  {
    house: "8",
    rasi_no: 5,
    zodiac: "Leo",
    aspected_by_planet: ["Ketu"],
    aspected_by_planet_index: [9],
    planets: [],
    cusp_sub_lord: "Rahu",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 24.682
  },
  {
    house: "9",
    rasi_no: 6,
    zodiac: "Virgo",
    aspected_by_planet: [],
    aspected_by_planet_index: [],
    planets: [
      { planetId: "2", full_name: "Moon", name: "Mo", nakshatra: "Punarvasu", nakshatra_no: 7, nakshatra_pada: 3, retro: false }
    ],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 23.836
  },
  {
    house: "10",
    rasi_no: 7,
    zodiac: "Libra",
    aspected_by_planet: ["Ketu"],
    aspected_by_planet_index: [9],
    planets: [
      { planetId: "1", full_name: "Sun", name: "Su", nakshatra: "Magha", nakshatra_no: 10, nakshatra_pada: 2, retro: false },
      { planetId: "3", full_name: "Mars", name: "Ma", nakshatra: "Magha", nakshatra_no: 10, nakshatra_pada: 2, retro: false },
      { planetId: "4", full_name: "Mercury", name: "Me", nakshatra: "Magha", nakshatra_no: 10, nakshatra_pada: 2, retro: false },
      { planetId: "6", full_name: "Venus", name: "Ve", nakshatra: "Magha", nakshatra_no: 10, nakshatra_pada: 2, retro: false }
    ],
    cusp_sub_lord: "Sun",
    cusp_sub_sub_lord: "Mercury",
    bhavmadhya: 22.39
  },
  {
    house: "11",
    rasi_no: 8,
    zodiac: "Scorpio",
    aspected_by_planet: ["Mars", "Saturn"],
    aspected_by_planet_index: [3, 7],
    planets: [
      { planetId: "9", full_name: "Ketu", name: "Ke", nakshatra: "Hasta", nakshatra_no: 13, nakshatra_pada: 1, retro: true }
    ],
    cusp_sub_lord: "Saturn",
    cusp_sub_sub_lord: "Sun",
    bhavmadhya: 23.422
  },
  {
    house: "12",
    rasi_no: 9,
    zodiac: "Sagittarius",
    aspected_by_planet: ["Jupiter", "Rahu"],
    aspected_by_planet_index: [5, 8],
    planets: [],
    cusp_sub_lord: "Rahu",
    cusp_sub_sub_lord: "Rahu",
    bhavmadhya: 24.672
  }
],
 "response": { Sun:{
        "bot_response": "The Sun and Moon are always direct ",
        "status": true},
        Moon:{"bot_response": "The Sun and Moon are always direct ",
        "status": true},},
        Mercury:{"dates": [
            [
                "31 January 1994",
                "27 September 1994"
            ],
            [
                "24 December 1994",
                "14 January 1995"
            ],
            [
                " 9 January 1994",
                " 9 May 1994"
            ],
            [
                " 2 June 1994",
                " 6 September 1994"
            ]},
           Venus:{ "dates": [
            [
                "13 October 1994",
                "23 November 1994"
            ]
        ],},
        Mars:{"bot_response": "mars is not retrograde in 1994",
        "status": true
        },
        Jupiter:{"dates": [
      [
        "19 December 2021",
        "29 January 2022"
      ]
]
        },
        Saturn: {"dates": [
            [
                "23 June 1994",
                " 9 November 1994"
            ]
        ],
        },
Rahu:{
"bot_response": "The Rahu and Ketu are always retrograde ",
        "status": true
        },
        Ketu:{
        "bot_response": "The Rahu and Ketu are always retrograde ",
        "status": true
        },
    },
  `;

      // --- API Call ---
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 5000 }
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || `${sectionPrompt.split(":")[0]} section could not be generated.`;
      text = removeMarkdown(text);
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");
      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(sectionPrompt.split(":")[0], pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, 50, pageWidth - 50 - 50);
    }
    doc.addPage();

    // Draw border
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(1.2);

    // Top-left corner
    doc.line(margin, margin, margin + corner, margin); // top horizontal
    doc.line(margin, margin, margin, margin + corner); // left vertical

    // Top-right corner
    doc.line(pageWidth - margin, margin, pageWidth - margin - corner, margin);
    doc.line(pageWidth - margin, margin, pageWidth - margin, margin + corner);

    // Bottom-left corner
    doc.line(margin, pageHeight - margin, margin + corner, pageHeight - margin);
    doc.line(margin, pageHeight - margin, margin, pageHeight - margin - corner);

    // Bottom-right corner
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - corner, pageHeight - margin);
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - corner);

    // Fill background
    doc.setFillColor("#a16a21");
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, "F");

    // Set font and color
    doc.setFont("Times", "bold");
    doc.setFontSize(36);
    doc.setTextColor("#ffffff");

    // Split text into two lines
    const line1 = "Advanced Calculations &";
    const line2 = "Optional Insights";

    // Calculate vertical positions
    const centerY = pageHeight / 2;
    const spacing = lineHeight * 1.5; // increase spacing (adjust multiplier as needed)

    // Draw lines
    doc.text(line1, pageWidth / 2, centerY - spacing / 2, { align: "center", baseline: "middle" });
    doc.text(line2, pageWidth / 2, centerY + spacing / 2, { align: "center", baseline: "middle" });

    const advancedSections = [
      {
        page: "1-2",
        title: "Introduction to Advanced Calculations",
        contentFocus: [
          "Significance of advanced computational methods in Vedic astrology",
          "Historical development of these calculation systems",
          "Enhancing predictive accuracy beyond basic chart reading",
          "Overview of the four main calculation systems being analyzed"
        ]
      },
      {
        page: "3",
        title: "Fundamentals of Ashtakvarga",
        contentFocus: [
          "Detailed explanation of the Ashtakvarga system",
          "Point system (0-8 points per planet per house)",
          "Significance of Sarvashtakavarga vs Binnashtakavarga",
          "Interpretation methodology for house strengths",
          "Reference JSON: ashtakvarga_points, total_points"
        ]
      },
      {
        page: "4",
        title: "Sarvashtakavarga Analysis",
        contentFocus: [
          "House-by-house total points analysis",
          "Medium strength: 25+ points, Strong: 28+, Weak: <25",
          "Detailed predictions for each house based on points",
          "Transit implications for strong vs weak houses",
          "Reference JSON: total_points"
        ]
      },
      {
        page: "5",
        title: "Binnashtakavarga Planetary Analysis",
        contentFocus: [
          "Individual planetary strength using ashtakvarga_points array",
          "Planet-wise predictions based on contribution to house strengths",
          "Remedial measures for weak planetary contributions",
          "Best periods for each planet based on Ashtakvarga positions",
          "Reference JSON: ashtakvarga_points"
        ]
      },
      {
        page: "6",
        title: "Shadbala Calculation Methodology",
        contentFocus: [
          "Explanation of six components: Sthana Bala, Dig Bala, Kala Bala, Cheshta Bala, Naisargika Bala, Drik Bala",
          "Minimum strength thresholds for each planet",
          "Interpretation of planetary strengths above and below thresholds",
          "Reference JSON: planetary_positions, retrograde status"
        ]
      },
      {
        page: "7-8",
        title: "Individual Planetary Shadbala Analysis",
        contentFocus: [
          "Calculate Shadbala for each planet",
          "Detailed interpretation of each planet's strength components",
          "How strong vs weak planets affect their significations",
          "Comparative analysis of all planetary strengths",
          "Reference JSON: planetary_positions, degrees, retrograde, house placements"
        ]
      },
      {
        page: "9",
        title: "Shadbala-Based Life Predictions",
        contentFocus: [
          "Career predictions using 10th lord and Mercury Shadbala",
          "Relationship predictions using Venus and 7th lord strength",
          "Health predictions using Sun, Moon, Lagna lord strength",
          "Wealth predictions using 2nd and 11th lord Shadbala values",
          "Reference JSON: Shadbala values"
        ]
      },
      {
        page: "10",
        title: "Dasha System Overview",
        contentFocus: [
          "Vimshottari Dasha system hierarchy: Mahadasha > Antardasha > Pratyantardasha",
          "Current running dashas from JSON (birth_dasa, current_dasa)",
          "How sub-periods refine timing of events",
          "Reference JSON: dashas"
        ]
      },
      {
        page: "11-12",
        title: "Detailed Pratyantar Dasha Analysis",
        contentFocus: [
          "Break down current Mahadasha and Antardasha periods",
          "Calculate upcoming Pratyantardasha periods",
          "Specific predictions for each sub-period based on planetary combinations",
          "Event timing using Pratyantar Dasha periods",
          "Reference JSON: dashas, planetary_positions"
        ]
      },
      {
        page: "13",
        title: "Dasha-Based Yearly Predictions",
        contentFocus: [
          "Year-wise predictions for the next 5 years using Dasha progressions",
          "Timing of major life events",
          "Identification of favorable and challenging periods",
          "Remedial suggestions for difficult Dasha periods",
          "Reference JSON: dashas, ashtakvarga_points, Shadbala"
        ]
      },
      {
        page: "14",
        title: "Grah Yuddha Analysis",
        contentFocus: [
          "Identify planetary conjunctions within 1 degree",
          "Determine winners and losers based on degrees and luminosity",
          "Effects of planetary wars on life",
          "Predictions based on involved planets",
          "Reference JSON: planetary_positions"
        ]
      },
      {
        page: "15",
        title: "Advanced Divisional Chart Analysis",
        contentFocus: [
          "Analysis of D9 (Navamsha), D10 (Dashamsha), D60 (Shashtiamsha)",
          "How divisional chart placements modify main chart predictions",
          "Vargottama planets and their significance",
          "Integrate divisional chart insights with main birth chart",
          "Reference JSON: divisional_charts"
        ]
      },
      {
        page: "16",
        title: "Special Yogas and Rare Combinations",
        contentFocus: [
          "Identify rare yogas using yogas_list from JSON",
          "Strength percentages and activation periods for each yoga",
          "Combined effects when multiple yogas are present",
          "Timing when these yogas will be most active",
          "Reference JSON: yogas_list, planetary_positions"
        ]
      },
      {
        page: "17",
        title: "Synthesis & Final Recommendations",
        contentFocus: [
          "Integration of all four calculation systems",
          "Priority ranking of insights based on calculation strength",
          "Specific remedial measures for weak areas",
          "Timeline for implementing remedies",
          "Monthly predictions for the next 12 months combining all methods",
          "Reference JSON: all previous data sections"
        ]
      }
    ];

    // --- Loop through each advanced calculation sub-section ---
    for (const section of advancedSections) {
      const fullPrompt = `
You are an expert, narrative-focused Vedic astrologer.
Generate a lavishly detailed, highly personalized astrology section titled:
"${section.title}"
based on the given JSON birth data.

Include precise calculations, interpretations, and insights from planetary positions, houses, yogas, dashas, transits, and doshas.
Explain how each factor impacts the native's life in detail.
Write in a warm, insightful, client-ready style (no markdown).
JSON: {
    "yogas_list": [
      {
        "yoga": "Vesi Yoga",
        "meaning": "Vesi Yoga represents a balanced outlook, characterized by truthfulness and a tall yet somewhat sluggish nature. Those born under this yoga find contentment and happiness with modest wealth and resources.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Vosi Yoga",
        "meaning": "Vosi Yoga indicates skillfulness, charity, fame, knowledge, and physical strength. Individuals born under this yoga tend to be recognized for their talents and are often celebrated for their generosity and wisdom.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Ubhayachara Yoga",
        "meaning": "Ubhayachara Yoga suggests being born with all the comforts of life. Such individuals often rise to positions of authority, possibly becoming kings or holding prominent leadership roles due to their innate qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Budha Aditya Yoga",
        "meaning": "Budha Aditya Yoga signifies intelligence, skillfulness, and expertise in various endeavors. Those born under this yoga are widely recognized and respected for their abilities and enjoy a profound sense of contentment and happiness.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "mercury"
        ],
        "houses_involved": [
          10
        ]
      },
      {
        "yoga": "Moon is kendra from Sun",
        "meaning": "When the Moon is positioned in a kendra from the Sun, it typically results in moderate wealth, intelligence, and skills in one's life.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Moon"
        ],
        "houses_involved": [
          10,
          4
        ]
      },
      {
        "yoga": "Hamsa Yoga",
        "meaning": "Hamsa Yoga signifies a spacious nature akin to a swan, purity, spirituality, comfort, respect, passion, potential leadership roles, an enjoyment of life, and the ability to speak eloquently and clearly.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1
        ]
      },
      {
        "yoga": "Paasa Yoga",
        "meaning": "Paasa Yoga may involve the risk of facing imprisonment but is associated with considerable capability in one's work. These individuals tend to be talkative, often having a team of servants at their disposal, although their character may be lacking in certain aspects.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Moon",
          "Sun",
          "Mercury",
          "Saturn"
        ],
        "houses_involved": [
          10,
          4,
          9,
          1,
          11
        ]
      },
      {
        "yoga": "Gaja-Kesari Yoga",
        "meaning": "Gaja-Kesari Yoga signifies fame, wealth, intelligence, and outstanding character. Individuals under this yoga are often well-liked by kings, bosses, and other leaders, and the presence of benefic aspects amplifies these qualities.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon"
        ],
        "houses_involved": [
          4
        ]
      },
      {
        "yoga": "Kaahala Yoga",
        "meaning": "Kaahala Yoga represents a strong and bold personality, often leading a large team or group. These individuals may accumulate properties over their lifetime and exhibit cunning traits.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Sun",
          "Mercury",
          "Saturn",
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Sankha Yoga",
        "meaning": "Sankha Yoga indicates a life blessed with wealth, a loving spouse, and children. These individuals are known for their kindness, piety, intelligence, and long life expectancy.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Moon",
          "Sun"
        ],
        "houses_involved": [
          4,
          10
        ]
      },
      {
        "yoga": "Mridanga Yoga",
        "meaning": "Mridanga Yoga signifies an individual who holds a kingly or equal leadership position. They lead a life marked by happiness, wealth, and elegance, embodying the traits of a successful and refined leader.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Ascendant",
          "Jupiter",
          "Rahu"
        ],
        "houses_involved": [
          1,
          1
        ]
      },
      {
        "yoga": "Kalpadruma Yoga",
        "meaning": "Kalpadruma Yoga represents powerful leaders who actively embrace challenges, fight for justice, and fearlessly pursue prosperity. They are principled, strong-willed, and compassionate in their actions.",
        "strength_in_percentage": 70,
        "planets_involved": [
          "Jupiter"
        ],
        "houses_involved": [
          1,
          1,
          1
        ]
      },
      {
        "yoga": "Bhaarathi Yoga",
        "meaning": "Bhaarathi Yoga represents great scholars who are marked by intelligence, religiosity, good looks, and fame. They often excel in various fields and are celebrated for their contributions to knowledge and society.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars",
          "Moon",
          "Saturn"
        ],
        "houses_involved": [
          9,
          4,
          10
        ]
      },
      {
        "yoga": "Raja Yoga",
        "meaning": "13 raja Yogas present by house associations, Raja Yogas signify exceptional power and prosperity, with individuals often holding dominion over their peers.",
        "strength_in_percentage": 16.48351648351649,
        "planets_involved": [
          "Mars",
          "Saturn",
          "Mercury",
          "Venus",
          "Jupiter",
          "Moon"
        ],
        "houses_involved": [
          7,
          9,
          10,
          1,
          5,
          4
        ]
      },
      {
        "yoga": "Dharma-Karmadhipati Yoga",
        "meaning": "Dharma-Karmadhipati Yoga signifies individuals who are sincere, devoted, and righteous. They are fortunate and highly praised for their moral and ethical virtues.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Saturn"
        ],
        "houses_involved": [
          10,
          9
        ]
      },
      {
        "yoga": "Raaja Yoga",
        "meaning": "Raaja Yoga brings a life filled with enjoyment, harmonious relationships, and the blessing of children. Those with this Yoga experience an abundance of life's pleasures and strong family connections.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Saturn",
          "Jupiter"
        ],
        "houses_involved": [
          10,
          1
        ]
      },
      {
        "yoga": "Raja Sambandha Yoga",
        "meaning": "Those with Raja Sambandha Yoga are exceptionally intelligent and often attain ministerial positions or equivalent roles within organizations. Their intellect and abilities are highly regarded.",
        "strength_in_percentage": 90,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Dhana Yoga",
        "meaning": "Those undergoing the mahadasha experience richness and fame. They accumulate substantial wealth during this period, satisfying their desires.",
        "strength_in_percentage": 80,
        "planets_involved": [
          "Mars"
        ],
        "houses_involved": [
          9
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Jupiter",
          "Mercury",
          "Rahu",
          "Ketu"
        ],
        "houses_involved": [
          1,
          10
        ]
      },
      {
        "yoga": "Daridra Yoga",
        "meaning": "Individuals with Daridra Yoga may face financial challenges and live in poverty and misery.",
        "strength_in_percentage": 100,
        "planets_involved": [
          "Sun",
          "Venus",
          "Saturn"
        ],
        "houses_involved": [
          10,
          11,
          10
        ]
      }
    ],
    "yogas_count": 20,
    "raja_yoga_count": 4,
    "dhana_yoga_count": 1,
    "daridra_yoga_count": 2
  },
  {
    "mahadasha": [
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
      "Ketu",
      "Venus",
      "Sun"
    ],
    "mahadasha_order": [
      "Fri Jun 28 1991",
      "Sun Jun 28 1998",
      "Tue Jun 28 2016",
      "Mon Jun 28 2032",
      "Wed Jun 28 2051",
      "Thu Jun 28 2068",
      "Fri Jun 28 2075",
      "Tue Jun 28 2095",
      "Tue Jun 28 2101"
    ],
    "start_year": 1981,
    "dasha_start_date": "Sun Jun 28 1981",
    "dasha_remaining_at_birth": "5 years 10 months 0 days"
  },
  {
    "antardashas": [
      [
        "Saturn/Saturn",
        "Saturn/Mercury",
        "Saturn/Ketu",
        "Saturn/Venus",
        "Saturn/Sun",
        "Saturn/Moon",
        "Saturn/Mars",
        "Saturn/Rahu",
        "Saturn/Jupiter"
      ],
      [
        "Mercury/Mercury",
        "Mercury/Ketu",
        "Mercury/Venus",
        "Mercury/Sun",
        "Mercury/Moon",
        "Mercury/Mars",
        "Mercury/Rahu",
        "Mercury/Jupiter",
        "Mercury/Saturn"
      ],
      [
        "Ketu/Ketu",
        "Ketu/Venus",
        "Ketu/Sun",
        "Ketu/Moon",
        "Ketu/Mars",
        "Ketu/Rahu",
        "Ketu/Jupiter",
        "Ketu/Saturn",
        "Ketu/Mercury"
      ],
      [
        "Venus/Venus",
        "Venus/Sun",
        "Venus/Moon",
        "Venus/Mars",
        "Venus/Rahu",
        "Venus/Jupiter",
        "Venus/Saturn",
        "Venus/Mercury",
        "Venus/Ketu"
      ],
      [
        "Sun/Sun",
        "Sun/Moon",
        "Sun/Mars",
        "Sun/Rahu",
        "Sun/Jupiter",
        "Sun/Saturn",
        "Sun/Mercury",
        "Sun/Ketu",
        "Sun/Venus"
      ],
      [
        "Moon/Moon",
        "Moon/Mars",
        "Moon/Rahu",
        "Moon/Jupiter",
        "Moon/Saturn",
        "Moon/Mercury",
        "Moon/Ketu",
        "Moon/Venus",
        "Moon/Sun"
      ],
      [
        "Mars/Mars",
        "Mars/Rahu",
        "Mars/Jupiter",
        "Mars/Saturn",
        "Mars/Mercury",
        "Mars/Ketu",
        "Mars/Venus",
        "Mars/Sun",
        "Mars/Moon"
      ],
      [
        "Rahu/Rahu",
        "Rahu/Jupiter",
        "Rahu/Saturn",
        "Rahu/Mercury",
        "Rahu/Ketu",
        "Rahu/Venus",
        "Rahu/Sun",
        "Rahu/Moon",
        "Rahu/Mars"
      ],
      [
        "Jupiter/Jupiter",
        "Jupiter/Saturn",
        "Jupiter/Mercury",
        "Jupiter/Ketu",
        "Jupiter/Venus",
        "Jupiter/Sun",
        "Jupiter/Moon",
        "Jupiter/Mars",
        "Jupiter/Rahu"
      ]
    ],
    "antardasha_order": [
      [
        "Mon Jul 18 1983",
        "Thu Mar 27 1986",
        "Wed May 06 1987",
        "Fri Jul 06 1990",
        "Tue Jun 18 1991",
        "Sat Jan 16 1993",
        "Fri Feb 25 1994",
        "Wed Jan 01 1997",
        "Thu Jul 15 1999"
      ],
      [
        "Tue Dec 11 2001",
        "Sun Dec 08 2002",
        "Sat Oct 08 2005",
        "Mon Aug 14 2006",
        "Sun Jan 13 2008",
        "Fri Jan 09 2009",
        "Fri Jul 29 2011",
        "Sun Nov 03 2013",
        "Wed Jul 13 2016"
      ],
      [
        "Fri Dec 09 2016",
        "Thu Feb 08 2018",
        "Sat Jun 16 2018",
        "Tue Jan 15 2019",
        "Thu Jun 13 2019",
        "Wed Jul 01 2020",
        "Mon Jun 07 2021",
        "Sun Jul 17 2022",
        "Fri Jul 14 2023"
      ],
      [
        "Thu Nov 12 2026",
        "Fri Nov 12 2027",
        "Fri Jul 13 2029",
        "Thu Sep 12 2030",
        "Mon Sep 12 2033",
        "Tue May 13 2036",
        "Thu Jul 14 2039",
        "Wed May 14 2042",
        "Tue Jul 14 2043"
      ],
      [
        "Sun Nov 01 2043",
        "Mon May 02 2044",
        "Wed Sep 07 2044",
        "Wed Aug 02 2045",
        "Mon May 21 2046",
        "Fri May 03 2047",
        "Sun Mar 08 2048",
        "Tue Jul 14 2048",
        "Wed Jul 14 2049"
      ],
      [
        "Sat May 14 2050",
        "Tue Dec 13 2050",
        "Thu Jun 13 2052",
        "Mon Oct 13 2053",
        "Fri May 14 2055",
        "Thu Oct 12 2056",
        "Sun May 13 2057",
        "Sun Jan 12 2059",
        "Mon Jul 14 2059"
      ],
      [
        "Wed Dec 10 2059",
        "Tue Dec 28 2060",
        "Sun Dec 04 2061",
        "Sat Jan 13 2063",
        "Thu Jan 10 2064",
        "Sat Jun 07 2064",
        "Fri Aug 07 2065",
        "Sun Dec 13 2065",
        "Wed Jul 14 2066"
      ],
      [
        "Tue Mar 26 2069",
        "Thu Aug 20 2071",
        "Tue Jun 26 2074",
        "Tue Jan 12 2077",
        "Mon Jan 31 2078",
        "Fri Jan 31 2081",
        "Fri Dec 26 2081",
        "Sun Jun 27 2083",
        "Sat Jul 15 2084"
      ],
      [
        "Mon Sep 02 2086",
        "Tue Mar 15 2089",
        "Thu Jun 21 2091",
        "Tue May 27 2092",
        "Wed Jan 26 2095",
        "Mon Nov 14 2095",
        "Fri Mar 15 2097",
        "Wed Feb 19 2098",
        "Fri Jul 16 2100"
      ]
    ]
  },
  {
    "factors": {
      "moon": "Mangal dosh from moon lagna, mars in house  1, aspecting the houses 4, 7 and 8 ",
      "saturn": "Mangal dosh along with mars-saturn association/aspect, mars in house 10 and saturn in house 10 ",
      "rahu": "Rahu transforming into mars in house 7 in the sign of Scorpio"
    },
    "is_dosha_present": true,
    "bot_response": "You are 67% manglik, It is good to consult an astrologer",
    "score": 67
  },
  {
    "is_dosha_present": true,
    "dosha_direction": "Descending",
    "dosha_type": "Shankpal",
    "rahu_ketu_axis": "4-10",
  },
  {
          "manglik_by_mars": true,
          "factors": [
            "Manglik dosha is created by Mars-Venus association."
          ],
          "manglik_by_saturn": false,
          "manglik_by_rahuketu": false,
          "aspects": [
            "Rahu in the 3rd is aspecting the 7th",
            "Ketu in the 9th is aspecting the 1st",
            "Saturn in the 4th is aspecting the 1st"
          ],
          "score": 6
        },
        {
    "is_dosha_present": true,
  },
  {
    "rahu_papa": 3.25,
    "sun_papa": 5.625,
    "saturn_papa": 0,
    "mars_papa": 9
  },
  {
    "ashtakvarga_order": [
      "Sun",
      "Moon",
      "Mars",
      "Mercury",
      "Jupiter",
      "Venus",
      "Saturn",
      "Ascendant"
    ],
    "ashtakvarga_points": [
      [
        5,
        5,
        4,
        6,
        4,
        2,
        4,
        3,
        5,
        4,
        2,
        4
      ],
      [
        4,
        3,
        2,
        5,
        6,
        3,
        3,
        4,
        6,
        3,
        6,
        4
      ],
      [
        5,
        4,
        2,
        5,
        3,
        3,
        3,
        3,
        5,
        3,
        0,
        3
      ],
      [
        4,
        7,
        5,
        6,
        5,
        4,
        5,
        4,
        4,
        4,
        1,
        5
      ],
      [
        6,
        4,
        3,
        5,
        7,
        2,
        6,
        6,
        3,
        6,
        4,
        4
      ],
      [
        4,
        5,
        8,
        3,
        4,
        3,
        4,
        2,
        5,
        5,
        6,
        3
      ],
      [
        4,
        3,
        1,
        6,
        4,
        2,
        2,
        2,
        3,
        4,
        4,
        4
      ],
      [
        3,
        3,
        5,
        6,
        5,
        4,
        4,
        4,
        5,
        4,
        3,
        4
      ]
    ],
    "ashtakvarga_total": [
      32,
      31,
      25,
      36,
      33,
      19,
      27,
      24,
      31,
      29,
      23,
      27
    ]
  },
  {
    "uccha_bala": {
      "Sun": 59.32031043085757,
      "Moon": 32.63126448629642,
      "Mars": 43.260819163608744,
      "Mercury": 1.4407654619833845,
      "Jupiter": 59.473352668723095,
      "Venus": 52.77976828625727,
      "Saturn": 37.92127313003476,
      "Rahu": 23.737887318967818,
      "Ketu": 19.404553985634493
    },
    "saptavargaja_bala": {
      "Sun": 105,
      "Moon": 97.5,
      "Mars": 78.75,
      "Mercury": 52.5,
      "Jupiter": 67.5,
      "Venus": 52.5,
      "Saturn": 50.625,
      "Rahu": 26.25,
      "Ketu": 56.25
    },
    "ojayugma_bala": {
      "Sun": 30,
      "Moon": 15,
      "Mars": 15,
      "Mercury": 15,
      "Jupiter": 15,
      "Venus": 15,
      "Saturn": 30,
      "Rahu": 0,
      "Ketu": 0
    },
    "kendra_bala": {
      "Sun": 30,
      "Moon": 15,
      "Mars": 60,
      "Mercury": 60,
      "Jupiter": 30,
      "Venus": 60,
      "Saturn": 15,
      "Rahu": 15,
      "Ketu": 15
    },
    "drekkna_bala": {
      "Sun": 15,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 15,
      "Jupiter": 15,
      "Venus": 0,
      "Saturn": 15,
      "Rahu": 0,
      "Ketu": 0
    },
    "total_sthana_bala": {
      "Sun": 239.32031043085757,
      "Moon": 160.13126448629643,
      "Mars": 212.01081916360874,
      "Mercury": 143.94076546198337,
      "Jupiter": 186.9733526687231,
      "Venus": 180.27976828625728,
      "Saturn": 163.54627313003476,
      "Rahu": 64.98788731896782,
      "Ketu": 90.6545539856345
    },
    "nathonnatha_bala": {
      "Sun": 58.333333333333336,
      "Moon": 1.6666666666666667,
      "Mars": 1.6666666666666667,
      "Mercury": 60,
      "Jupiter": 58.333333333333336,
      "Venus": 58.333333333333336,
      "Saturn": 1.6666666666666667,
      "Rahu": 1.6666666666666667,
      "Ketu": 1.6666666666666667
    },
    "dig_bala": {
      "Sun": 52.346356235809104,
      "Moon": 11.368735513703578,
      "Mars": 58.92748583027541,
      "Mercury": 18.559234538016614,
      "Jupiter": 52.80668600205643,
      "Venus": 3.2202317137427485,
      "Saturn": 9.587939796701429,
      "Rahu": 2.2621126810321734,
      "Ketu": 22.262112681032175
    },
    "paksha_bala": {
      "Sun": 39.59999999999999,
      "Moon": 39.59999999999999,
      "Mars": 39.59999999999999,
      "Mercury": 20.399999999999995,
      "Jupiter": 20.399999999999995,
      "Venus": 20.399999999999995,
      "Saturn": 39.59999999999999,
      "Rahu": 39.59999999999999,
      "Ketu": 39.59999999999999
    },
    "thribhaga_bala": {
      "Sun": 60,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 0,
      "Jupiter": 60,
      "Venus": 0,
      "Saturn": 0,
      "Rahu": 0,
      "Ketu": 0
    },
    "abda_bala": {
      "Sun": 0,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 0,
      "Jupiter": 0,
      "Venus": 15,
      "Saturn": 0,
      "Rahu": 0,
      "Ketu": 0
    },
    "masa_bala": {
      "Sun": 0,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 0,
      "Jupiter": 0,
      "Venus": 0,
      "Saturn": 0,
      "Rahu": 30,
      "Ketu": 0
    },
    "vara_bala": {
      "Sun": 45,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 0,
      "Jupiter": 0,
      "Venus": 0,
      "Saturn": 0,
      "Rahu": 0,
      "Ketu": 0
    },
    "hora_bala": {
      "Sun": 0,
      "Moon": 0,
      "Mars": 0,
      "Mercury": 0,
      "Jupiter": 60,
      "Venus": 0,
      "Saturn": 0,
      "Rahu": 0,
      "Ketu": 0
    },
    "total_balas": {
      "Sun": 701.1094398872788,
      "Moon": 349.0853728090453,
      "Mars": 362.8708491701956,
      "Mercury": 325.6401016284879,
      "Jupiter": 569.8167820348012,
      "Venus": 362.3586476528693,
      "Saturn": 291.32796576795687,
      "Rahu": null,
      "Ketu": null
    },
    "ayana_bala": {
      "Sun": 91.32507715406281,
      "Moon": 42.910274215404584,
      "Mars": 36.10731575595325,
      "Mercury": 32.20298453355509,
      "Jupiter": 55.91155559151589,
      "Venus": 29.411400512935888,
      "Saturn": 18.42773158332416,
      "Rahu": 0,
      "Ketu": 0
    },
    "chesta_Bala": {
      "Sun": 45.662538577031405,
      "Moon": 39.59999999999999,
      "Mars": 1.8759117859005034,
      "Mercury": 28.803227196196474,
      "Jupiter": 41.13185443917248,
      "Venus": 16.546373985658857,
      "Saturn": 49.919354591229904,
      "Rahu": 0,
      "Ketu": 0
    },
    "naisargeka_balas": {
      "Sun": 60,
      "Moon": 51.42,
      "Mars": 17.16,
      "Mercury": 25.74,
      "Jupiter": 34.26,
      "Venus": 42.84,
      "Saturn": 8.58
    },
    "drik_bala": {
      "Sun": 9.521824156184518,
      "Moon": 2.3884319269740892,
      "Mars": -4.477350032208941,
      "Mercury": -4.006110101263696,
      "Jupiter": 0,
      "Venus": -3.672460179058815,
      "Saturn": 0,
      "Rahu": 0,
      "Ketu": 3.7499999999999964
    },
    "ratio": {
      "Sun": 1.797716512531484,
      "Moon": 0.9696815911362369,
      "Mars": 1.2095694972339852,
      "Mercury": 0.7753335753059236,
      "Jupiter": 1.4610686718841057,
      "Venus": 1.098056508038998,
      "Saturn": 0.9710932192265229,
      "Rahu": null,
      "Ketu": null
    }
  },
  {
        "0": {
            "name": "As",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": false,
            "full_name": "Ascendant",
            "local_degree": 24.78031924639663
        },
        "1": {
            "name": "Su",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": false,
            "full_name": "Sun",
            "local_degree": 9.453409420062144
        },
        "2": {
            "name": "Mo",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 7,
            "retro": false,
            "full_name": "Moon",
            "local_degree": 10.419502073079684
        },
        "3": {
            "name": "Ma",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 3,
            "retro": false,
            "full_name": "Mars",
            "local_degree": 23.29247702011174
        },
        "4": {
            "name": "Me",
            "zodiac": "Capricorn",
            "rasi_no": 10,
            "house": 12,
            "retro": true,
            "full_name": "Mercury",
            "local_degree": 14.364291740757835
        },
        "5": {
            "name": "Ju",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 3,
            "retro": false,
            "full_name": "Jupiter",
            "local_degree": 8.824024650148203
        },
        "6": {
            "name": "Ve",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 11,
            "retro": false,
            "full_name": "Venus",
            "local_degree": 14.501868101614946
        },
        "7": {
            "name": "Sa",
            "zodiac": "Pisces",
            "rasi_no": 12,
            "house": 2,
            "retro": false,
            "full_name": "Saturn",
            "local_degree": 19.70210560912119
        },
        "8": {
            "name": "Ra",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 7,
            "retro": true,
            "full_name": "Rahu",
            "local_degree": 12.882623301118656
        },
        "9": {
            "name": "Ke",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": true,
            "full_name": "Ketu",
            "local_degree": 12.88262330111911
        },
        "chart": "D9",
        "chart_name": "Navamsa"
    },
    {
        "0": {
            "name": "As",
            "zodiac": "Scorpio",
            "rasi_no": 8,
            "house": 1,
            "retro": false,
            "full_name": "Ascendant",
            "local_degree": 10.867021384885106
        },
        "1": {
            "name": "Su",
            "zodiac": "Cancer",
            "rasi_no": 4,
            "house": 9,
            "retro": false,
            "full_name": "Sun",
            "local_degree": 3.837121577846574
        },
        "2": {
            "name": "Mo",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 2,
            "retro": false,
            "full_name": "Moon",
            "local_degree": 24.910557858977427
        },
        "3": {
            "name": "Ma",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 6,
            "retro": false,
            "full_name": "Mars",
            "local_degree": 25.880530022346377
        },
        "4": {
            "name": "Me",
            "zodiac": "Gemini",
            "rasi_no": 3,
            "house": 8,
            "retro": true,
            "full_name": "Mercury",
            "local_degree": 5.960324156397746
        },
        "5": {
            "name": "Ju",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 10,
            "retro": false,
            "full_name": "Jupiter",
            "local_degree": 29.8044718334977
        },
        "6": {
            "name": "Ve",
            "zodiac": "Aries",
            "rasi_no": 1,
            "house": 6,
            "retro": false,
            "full_name": "Venus",
            "local_degree": 22.779853446238576
        },
        "7": {
            "name": "Sa",
            "zodiac": "Leo",
            "rasi_no": 5,
            "house": 10,
            "retro": false,
            "full_name": "Saturn",
            "local_degree": 18.557895121245565
        },
        "8": {
            "name": "Ra",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 2,
            "retro": true,
            "full_name": "Rahu",
            "local_degree": 27.647359223465173
        },
        "9": {
            "name": "Ke",
            "zodiac": "Gemini",
            "rasi_no": 3,
            "house": 8,
            "retro": true,
            "full_name": "Ketu",
            "local_degree": 27.647359223465173
        },
        "chart": "D10",
        "chart_name": "Dasamsa"
    },
    {
        "0": {
            "name": "As",
            "zodiac": "Aquarius",
            "rasi_no": 11,
            "house": 1,
            "retro": false,
            "full_name": "Ascendant",
            "local_degree": 5.2021283093099555
        },
        "1": {
            "name": "Su",
            "zodiac": "Pisces",
            "rasi_no": 12,
            "house": 2,
            "retro": false,
            "full_name": "Sun",
            "local_degree": 23.022729467080353
        },
        "2": {
            "name": "Mo",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 11,
            "retro": false,
            "full_name": "Moon",
            "local_degree": 29.46334715386456
        },
        "3": {
            "name": "Ma",
            "zodiac": "Virgo",
            "rasi_no": 6,
            "house": 8,
            "retro": false,
            "full_name": "Mars",
            "local_degree": 5.283180134078265
        },
        "4": {
            "name": "Me",
            "zodiac": "Libra",
            "rasi_no": 7,
            "house": 9,
            "retro": true,
            "full_name": "Mercury",
            "local_degree": 5.761944938385568
        },
        "5": {
            "name": "Ju",
            "zodiac": "Cancer",
            "rasi_no": 4,
            "house": 6,
            "retro": false,
            "full_name": "Jupiter",
            "local_degree": 28.826831000988022
        },
        "6": {
            "name": "Ve",
            "zodiac": "Gemini",
            "rasi_no": 3,
            "house": 5,
            "retro": false,
            "full_name": "Venus",
            "local_degree": 16.679120677432365
        },
        "7": {
            "name": "Sa",
            "zodiac": "Sagittarius",
            "rasi_no": 9,
            "house": 11,
            "retro": false,
            "full_name": "Saturn",
            "local_degree": 21.34737072747157
        },
        "8": {
            "name": "Ra",
            "zodiac": "Capricorn",
            "rasi_no": 10,
            "house": 12,
            "retro": true,
            "full_name": "Rahu",
            "local_degree": 15.88415534079104
        },
        "9": {
            "name": "Ke",
            "zodiac": "Cancer",
            "rasi_no": 4,
            "house": 6,
            "retro": true,
            "full_name": "Ketu",
            "local_degree": 15.88415534079104
        },
        "chart": "D60",
        "chart_name": "Shastiamsha"
    },
  `;

      // --- API Call ---
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 5000 }
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || `${section.title} section could not be generated.`;
      text = removeMarkdown(text);

      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text(section.title, pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");
      addParagraphs(doc, text, 50, 50, pageWidth - 50 - 50);
    }

    // Generate "12 Q&A & Personalized Advice" secti

    // --- Helper: Delay ---
    // --- Helper ---
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // --- Generate 12–15 Personalized Questions (Categorized) ---
    async function generateQuestions(fullData: Record<string, any>) {
      const questionPrompt = `
You are an expert Vedic astrologer and holistic consultant.
Analyze the following *complete client data* — including multi-chart birth data (D1, D9, D10, D60, D2, D3, D4),
plus any personal or contextual data provided (location, date/time, gender).

Generate 12–15 *personalized, specific* client questions organized in categories:

CAREER:
- 2–3 questions

LOVE & RELATIONSHIPS:
- 2–3 questions

HEALTH:
- 2 questions

WEALTH:
- 2 questions

FAME & SOCIAL RECOGNITION:
- 1–2 questions

SPIRITUAL GROWTH:
- 1–2 questions

Format:
CAREER:
1. <question>
2. <question>
...

Remove any markdown or special characters in the output.

JSON Input: ${JSON.stringify(fullData, null, 2)}
`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: questionPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
        })
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Split by category headings
      const sections: Record<string, string[]> = {};
      let currentSection = "";
      text.split(/\n+/).forEach((line: any) => {
        line = line.trim();
        if (!line) return;

        const categoryMatch = line.match(/^(CAREER|LOVE & RELATIONSHIPS|HEALTH|WEALTH|FAME & SOCIAL RECOGNITION|SPIRITUAL GROWTH):$/i);
        if (categoryMatch) {
          currentSection = categoryMatch[1].toUpperCase();
          sections[currentSection] = [];
          return;
        }

        if (currentSection) {
          // Remove numbering
          line = line.replace(/^\d+\.\s*/, "");
          if (line) sections[currentSection].push(line);
        }
      });

      return sections;
    }

    // --- Generate Detailed Answers per Question ---
    async function generateAnswer(question: string, fullData: Record<string, any>, retryCount = 0): Promise<string> {
      const prompt = `
You are an empathetic and wise Vedic astrologer. Based on this client's complete data
(including all divisional charts: D1, D9, D10, D60, D2, D3, D4, plus personal metadata),
write a detailed, client-friendly answer to the question below.

Include:
- Relevant planetary influences (mention houses and planets)
- Yogas and Dashas affecting this area
- Remedies, insights, and spiritual guidance
- Keep tone warm, intuitive, deeply insightful
- Do NOT use any markdown or special formatting

Question: "${question}"

Full JSON Data: ${JSON.stringify(fullData, null, 2)}
`;

      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 1500 }
          })
        });

        const data = await response.json();
        let ans = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return ans.replace(/[*_~`]/g, ""); // Remove any leftover markdown
      } catch (err) {
        if (retryCount < 2) {
          await sleep(2000);
          return generateAnswer(question, fullData, retryCount + 1);
        }
        return `Question: ${question}\nAnswer: Unable to generate answer.`;
      }
    }

    // // --- Add Paragraphs to PDF ---
    // function addParagraphs(doc: any, text: string, x: number, yStart: number) {
    //   const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    //   const lineHeight = 16;
    //   let y = yStart;

    //   for (const line of lines) {
    //     if (y > 780) {
    //       doc.addPage();
    //       doc.setDrawColor("#a16a21");
    //       doc.setLineWidth(1.5);
    //       doc.rect(25, 25, 545, 792, "S");
    //       y = 110;
    //     }
    //     doc.text(line, x, y);
    //     y += lineHeight;
    //   }
    // }

    // --- Main Function to Generate Q&A PDF ---
    async function generateQAPDF(doc: any, fullData: Record<string, any>) {
      const pageWidth = doc.internal.pageSize.getWidth();

      // Step 1: Generate Questions by Category
      const questionSections = await generateQuestions(fullData);
      console.log("Generated Questions:", questionSections);

      // Step 2: Generate Answers for each Section
      const qaTextSections: string[] = [];

      for (const [section, questions] of Object.entries(questionSections)) {
        qaTextSections.push(section + ":\n");
        for (const question of questions) {
          const answer = await generateAnswer(question, fullData);
          qaTextSections.push(`Question: ${question}\nAnswer: ${answer}\n`);
          await sleep(500); // Slight delay to avoid overwhelming API
        }
      }

      const fullQA = qaTextSections.join("\n");

      // Step 3: Add Page Styling & Title
      doc.addPage();
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.5);
      doc.rect(25, 25, 545, 792, "S");

      doc.setFont("Times", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#000");
      doc.text("Q&A & Personalized Guidance", pageWidth / 2, 60, { align: "center" });

      doc.setFont("Times", "normal");
      doc.setFontSize(13);
      doc.setTextColor("#a16a21");

      // Step 4: Add all content
      addParagraphs(doc, fullQA, 50, 50, pageWidth - 50 - 50);

      // Step 5: Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 830, { align: "center" });
      }

      return doc;
    }


    // ✅ Usage
    await generateQAPDF(doc, {
      d1: d1ChartJson,
      d9: d9ChartJson,
      d10: d10ChartJson,
      d60: d60ChartJson,
      d2: d2ChartJson,
      d3: d3ChartJson,
      d4: d4ChartJson,
      Default: Default
    });

    // --- Save PDF ---
    const fileName = `Cosmic_Report_${name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    console.log(`✅ PDF generated successfully: ${fileName}`);

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

// --- Function to generate table content for report ---
export const generateTableContentForReport = async ({
  name,
  dob,
  time,
  place,
  lat,
  lon,
  userData = {}
}: {
  name: string;
  dob: string;
  time: string;
  place: string;
  lat: number;
  lon: number;
  userData?: any;
}) => {
  try {
    console.log("Fetching real API data for table content prompt...");

    // Fetch real API data

    const kundliData = {
      "gana": "rakshas",
      "yoni": "cat",
      "vasya": "Jalachara",
      "nadi": "Antya",
      "varna": "Brahmin",
      "paya": "Iron",
      "tatva": "Jal (Water)",
      "life_stone": "coral",
      "lucky_stone": "ruby",
      "fortune_stone": "yellow sapphire",
      "name_start": "Di",
      "ascendant_sign": "Aries",
      "ascendant_nakshatra": "Bharani",
      "rasi": "Cancer",
      "rasi_lord": "Moon",
      "nakshatra": "Ashlesha",
      "nakshatra_lord": "Mercury",
      "nakshatra_pada": 4,
      "sun_sign": "Capricorn",
      "tithi": "K.Pratipada",
      "karana": "Kaulava",
      "yoga": "Saubhagya"
    };
    const sunriseData = {
      "sun_rise": "6:32 AM",
      "bot_response": "Sun rises at 6:32 AM"
    };
    const sunsetData = {
      "sun_set": "6:33 PM",
      "bot_response": "Sun sets at 6:33 PM"
    };
    const moonSignData = {
      "moon_sign": "Taurus",
      "bot_response": "Your moon sign is Taurus",
      "prediction": "Taurus natives are known for being dependable, practical, strong-willed, loyal, and sensual. You love beautiful things. You are good at finances, and hence, make capable financial managers. You are generous and dependable. You can be very stubborn, self-indulgent, frugal, and lazy. You have a possessive streak."
    };
    const sunSignData = {
      "sun_sign": "Pisces",
      "prediction": "The last and 12th Sign of the zodiac, Pisces seems to take on the attributes of all the other 11 Signs. Dreamy and romantic Pisces has a creative flair. You can be compassionate and selfless towards others. Ruled by Neptune, Pisces natives live in your own world. You can be quite detached and have a spiritual bent. Peace and harmony are essential to them. Confrontation and conflict are not your cup of tea.",
      "bot_response": "Your sun sign is Pisces"
    };


    // Save API data to JSON file

    // Generate the table content prompt with real data
    const tablePrompt = await generateTableContentPrompt({
      name,
      dob,
      time,
      place,
      lat,
      lon,
      kundliData,
      sunriseData,
      sunsetData,
      moonSignData,
      sunSignData,
      userData,
      title: "AVAKAHADA CHAKRA",
      showUserInfo: true
    });

    if (tablePrompt.success) {
      return {
        success: true,
        data: tablePrompt.data
      };
    } else {
      return {
        success: false,
        error: tablePrompt.error
      };
    }
  } catch (error) {
    console.error("Error generating table content for report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
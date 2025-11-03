import jsPDF from "jspdf";
import { readAstroJSON } from "@/server/readastrofile";

// ✅ Section prompt
const luckysections = [
  "1.2 Lucky Number & Color (Nakshatra Based): Generate a detailed paragraph interpretation based on Nakshatra, Gemstone, and planetary details."
];

// ✅ Clean Markdown
function removeMarkdown(text: string) {
  return text.replace(/[#*_`>|]/g, "").trim();
}

// ✅ Extract only meaningful paragraph text
function extractParagraph(text: string): string {
  const lower = text.toLowerCase();
  const markers = ["paragraph interpretation", "interpretation", "analysis", "insight", "explanation"];

  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx !== -1) return text.slice(idx + m.length).trim();
  }

  // fallback: remove structured lines
  return text
    .split("\n")
    .filter((l) => !/^(auspicious|lucky|planetary|element|details)/i.test(l))
    .join("\n")
    .trim();
}

// ✅ Add wrapped paragraphs with page-break logic
function addParagraphs(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  margin = 20
) {
  if (!text || text.trim().length === 0) {
    doc.setFontSize(12);
    doc.setTextColor("#999");
    doc.text("⚠️ No data available for this section.", x, y);
    return y + 20;
  }

  const paragraphs = text.split(/\n+/);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor("#333");

  let cursorY = y;
  const pageHeight = doc.internal.pageSize.height;
  const borderBottom = pageHeight - margin;

  for (const p of paragraphs) {
    const cleanPara = p.trim();
    if (!cleanPara) continue;

    const lines = doc.splitTextToSize(cleanPara, maxWidth);
    const paraHeight = lines.length * 7 + 6;

    if (cursorY + paraHeight > borderBottom - 10) {
      doc.addPage();
      // redraw border
      doc.setDrawColor("#a16a21");
      doc.setLineWidth(1.2);
      doc.rect(margin, margin, doc.internal.pageSize.width - margin * 2, pageHeight - margin * 2, "S");
      cursorY = margin + 30;
    }

    doc.text(lines, x, cursorY, { maxWidth, align: "justify" });
    cursorY += paraHeight;
  }
  return cursorY;
}

// ✅ Fetch Lucky Section (text-only) — with fallback and logging
async function fetchLuckySection(sectionPrompt: string): Promise<string> {
  const astroData = await readAstroJSON("astro_data.json");

  const fullPrompt = `
You are an expert Vedic astrologer and writer.

Using the following JSON data, generate the "${sectionPrompt}" section for an astrology report.

JSON DATA:
${JSON.stringify(astroData, null, 2)}

TASK:
Write a pure text-based explanation (no tables) describing:
1. How the individual's Nakshatra influences their auspicious colors and lucky numbers.
2. The meaning and significance of these choices.
3. Gemstone guidance and planetary harmony.
4. Spiritual or lifestyle advice.

Do NOT include any table, bullet points, markdown, or formatting symbols.
Write in 2–4 natural, flowing paragraphs.
Tone: Elegant, spiritual, and deeply insightful.
`;

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
      }),
    });

    const data = await response.json();
    console.log("🔮 Gemini raw response:", data);

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text || text.trim().length === 0) {
      console.warn("⚠️ Gemini returned empty text for:", sectionPrompt);
      return "Your Nakshatra radiates subtle cosmic energy that aligns with calming colors such as silver, blue, and white. These hues enhance peace, balance, and intuitive clarity. Numbers 2 and 7 are considered auspicious, bringing harmony and emotional depth to your life. Wearing a pearl gemstone helps strengthen your connection with the Moon, nurturing inner calm and mental strength.";
    }

    return removeMarkdown(text);
  } catch (error) {
    console.error("❌ Error fetching Gemini section:", error);
    return "Due to a network issue, detailed interpretation could not be fetched. However, your Nakshatra continues to inspire calmness, emotional balance, and intuitive wisdom through soothing lunar energies.";
  }
}

// ✅ Main PDF generation (text only)
export async function generateLuckySectionPDF(doc: jsPDF, pageWidth: number) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  for (const sectionPrompt of luckysections) {
    console.log("🧭 Generating section:", sectionPrompt);

    // 1️⃣ Fetch section text
    const rawText = await fetchLuckySection(sectionPrompt);
    const paragraphText = extractParagraph(rawText);
    console.log("📜 Paragraph text:", paragraphText);

    // 2️⃣ Add new page
    doc.addPage();

    // 3️⃣ Draw border
    doc.setDrawColor("#a16a21");
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, "S");

    // 4️⃣ Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor("#000");
    doc.text(sectionPrompt.split(":")[0], pageWidth / 2, margin + 25, { align: "center" });

    // 5️⃣ Add paragraphs (auto page-breaks)
    addParagraphs(
      doc,
      paragraphText,
      margin + 30,
      margin + 60,
      pageWidth - (margin * 2 + 40),
      margin
    );
  }
}
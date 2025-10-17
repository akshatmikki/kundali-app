'use client';

/**
 * Draws a page border with a specified margin.
 * @param {jsPDF} doc - jsPDF instance
 * @param {number} margin - page margin (default 15)
 */
export const addPageBorder = (doc, margin = 15) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(161, 106, 33); // accent color RGB
  doc.setLineWidth(1);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
};

/**
 * Adds a footer to the page with contact info and company name.
 * @param {jsPDF} doc - jsPDF instance
 */
export const addFooter = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 45;
  const lineHeight = 10;
  const black = "#000000";

  doc.setFont("Times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(black);
  doc.text("TrustAstrology", pageWidth / 2, footerY, { align: "center" });

  doc.setFont("Times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(black);
  doc.text(
    "Astrology - Numerology - Occult Guidance - Gemstone - Tarot Reading - Consultation",
    pageWidth / 2,
    footerY + lineHeight,
    { align: "center" }
  );
  doc.text(
    "91-9818999037, 91-8604802202 | www.astroarunpandit.org | support@astroarunpandit.org",
    pageWidth / 2,
    footerY + 2 * lineHeight,
    { align: "center" }
  );
};

/**
 * Checks if the current Y position exceeds the page limit and adds a new page if needed.
 * @param {jsPDF} doc - jsPDF instance
 * @param {number} currentY - current Y coordinate
 * @param {number} margin - page margin (default 50)
 * @returns {number} - new Y position
 */
export const checkPageOverflow = (doc, currentY, margin = 50) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY > pageHeight - margin - 100) {
    doc.addPage();
    addPageBorder(doc);
    return margin; // reset Y
  }
  return currentY;
};

/**
 * Adds wrapped text to the PDF with automatic line breaks.
 * @param {jsPDF} doc - jsPDF instance
 * @param {string} text - text to add
 * @param {number} startX - starting X coordinate
 * @param {number} startY - starting Y coordinate
 * @param {number} maxWidth - max width for text
 * @param {number} lineHeight - line height (default 14)
 * @returns {number} - new Y position after text
 */
export const addWrappedText = (doc, text, startX, startY, maxWidth, lineHeight = 14) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  let y = startY;
  lines.forEach(line => {
    y = checkPageOverflow(doc, y);
    doc.text(line, startX, y);
    y += lineHeight;
  });
  return y;
};

/**
 * Adds multiple paragraphs with spacing between them.
 * @param {jsPDF} doc - jsPDF instance
 * @param {string} text - full text with \n for paragraphs
 * @param {number} startX - X coordinate
 * @param {number} startY - starting Y coordinate
 * @param {number} lineHeight - height of each line
 * @param {number} paragraphSpacing - spacing between paragraphs
 * @param {number} maxWidth - maximum width for text
 * @returns {number} - Y position after last paragraph
 */
export const addParagraphs = (
  doc,
  text,
  startX,
  startY,
  lineHeight = 14,
  paragraphSpacing = 10,
  maxWidth = 490
) => {
  const paragraphs = text.trim().split("\n");
  let y = startY;
  paragraphs.forEach(para => {
    if (para.trim() === "") {
      y += paragraphSpacing;
    } else {
      const lines = doc.splitTextToSize(para, maxWidth);
      lines.forEach(line => {
        y = checkPageOverflow(doc, y);
        doc.text(line, startX, y);
        y += lineHeight;
      });
      y += paragraphSpacing;
    }
  });
  return y;
};

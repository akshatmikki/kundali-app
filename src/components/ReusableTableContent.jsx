'use client';
import { jsPDF } from "jspdf";

// ✅ Footer Component
const addFooter = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 45;
    const lineHeight = 10;

    doc.setFont("Times", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text("TrustAstrology", pageWidth / 2, footerY, { align: "center" });

    doc.setFont("Times", "normal");
    doc.setFontSize(8);
    doc.text(
        "Astrology - Numerology - Occult Guidance - Gemstone - Tarot Reading - Consultation",
        pageWidth / 2,
        footerY + lineHeight,
        { align: "center" }
    );
};

// ✅ Utility: Safely extract values
const safeGet = (obj, path, defaultValue = "") => {
    try {
        return path.split('.').reduce((acc, key) => acc && acc[key], obj) ?? defaultValue;
    } catch {
        return defaultValue;
    }
};

// ✅ Main Generator
export const generateReusableTableContent = async ({
    doc,
    astroData, // 🔥 now you pass astroData here
    userData,
    title = "AVAKAHADA CHAKRA",
    showUserInfo = true
}) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    const colGap = 15;
    const chakraColWidth = (pageWidth - margin * 2 - colGap) / 2;
    const rowHeight = 15;
    const textColor = "#5e3a0b";
    const accentColor = "#a16a21";
    const bgColor = "#fffdf9";

    doc.addPage();

    // --- Background + Border ---
    doc.setFillColor(bgColor);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(accentColor);
    doc.setLineWidth(1.5);
    doc.rect(margin - 10, margin - 10, pageWidth - margin * 2 + 20, pageHeight - margin * 2 + 20, "S");

    let currentY = 70;

    // --- Extract core astrology data ---
    const kundliData = safeGet(astroData, "extended_kundli_details", {});
    const sunriseData = safeGet(astroData, "sunrise", {});
    const sunsetData = safeGet(astroData, "sunset", {});
    const moonSignData = safeGet(astroData, "find_moon_sign", {});
    const sunSignData = safeGet(astroData, "find_sun_sign", {});

    // --- User Info Section ---
    if (showUserInfo) {
        const userBoxY = currentY;
        const userBoxHeight = 170;
        const userBoxX = 50;
        const userBoxWidth = pageWidth - 100;

        doc.setDrawColor(accentColor);
        doc.setLineWidth(1);
        doc.rect(userBoxX, userBoxY, userBoxWidth, userBoxHeight, "S");

        // Header Line Decorations
        const lineY_Top = userBoxY + 25;
        const lineY_Bottom = userBoxY + userBoxHeight - 15;
        doc.setLineWidth(0.5);
        doc.line(userBoxX + 15, lineY_Top, userBoxX + userBoxWidth - 15, lineY_Top);
        doc.line(userBoxX + 15, lineY_Bottom, userBoxX + userBoxWidth - 15, lineY_Bottom);

        // Name
        doc.setFont("Times", "bold");
        doc.setFontSize(18);
        doc.setTextColor(accentColor);
        doc.text((userData?.name || "").toUpperCase(), pageWidth / 2, lineY_Top + 25, { align: "center" });

        // User Info Columns
        const dataStartY = lineY_Top + 4 * rowHeight;
        const column1X = userBoxX + 20;
        const column2X = pageWidth / 2 + 10;

        const leftFields = [
            ["Sex", userData?.sex || ""],
            ["Date of Birth", userData?.dob || ""],
            ["Time of Birth", userData?.time || ""],
        ];
        const rightFields = [
            ["City", userData?.place || ""],
            ["State", userData?.state || ""],
            ["Country", userData?.country || ""],
        ];

        const drawRows = (startX, fields) => {
            let y = dataStartY;
            doc.setFont("Times", "normal");
            doc.setFontSize(13);
            doc.setTextColor(textColor);
            fields.forEach(([key, val]) => {
                doc.text(`${key}:`, startX, y);
                doc.setFont("Times", "bold");
                doc.text(val, startX + 80, y);
                doc.setFont("Times", "normal");
                y += rowHeight;
            });
        };

        drawRows(column1X, leftFields);
        drawRows(column2X, rightFields);
        currentY = userBoxY + userBoxHeight + 50;
    }

    // --- Section Header ---
    const headerY = currentY;
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(accentColor);
    doc.text(title, pageWidth / 2, headerY, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 80, headerY + 5, pageWidth / 2 + 80, headerY + 5);

    // --- Table Data ---
    const tableDataY = headerY + 40;

    const leftFields = [
        ["Latitude", userData?.latitude],
        ["Longitude", userData?.longitude],
        ["Ascendant Sign", kundliData?.ascendant_sign],
        ["Ascendant Nakshatra", kundliData?.ascendant_nakshatra],
        ["Rasi", kundliData?.rasi],
        ["Rasi Lord", kundliData?.rasi_lord],
        ["Nakshatra", kundliData?.nakshatra],
        ["Nakshatra Lord", kundliData?.nakshatra_lord],
        ["Nakshatra Pada", kundliData?.nakshatra_pada],
        ["Sun Sign (Vedic)", kundliData?.sun_sign],
        ["Sun Sign (Western)", sunSignData?.sun_sign],
        ["Moon Sign", moonSignData?.moon_sign],
        ["Tithi", kundliData?.tithi],
        ["Karana", kundliData?.karana],
        ["Yoga", kundliData?.yoga],
        ["Sunrise", sunriseData?.sun_rise],
        ["Sunset", sunsetData?.sun_set],
    ];

    const rightFields = [
        ["Gana", kundliData?.gana],
        ["Yoni", kundliData?.yoni],
        ["Vasya", kundliData?.vasya],
        ["Nadi", kundliData?.nadi],
        ["Varna", kundliData?.varna],
        ["Paya", kundliData?.paya],
        ["Tatva", kundliData?.tatva],
        ["Life Stone", kundliData?.life_stone],
        ["Lucky Stone", kundliData?.lucky_stone],
        ["Fortune Stone", kundliData?.fortune_stone],
        ["Name Start", kundliData?.name_start],
    ];

    const drawTable = (startX, fields) => {
        let y = tableDataY;
        const valueStartX = startX + chakraColWidth / 2 + 5;
        const arrowSymbol = "➤";
        const arrowGap = 5;

        doc.setFont("Times", "normal");
        doc.setFontSize(13);
        doc.setTextColor(textColor);

        fields.forEach(([key, val]) => {
            const value = val ?? "";
            doc.text(key, startX, y);
            const keyWidth = doc.getStringUnitWidth(key) * doc.internal.getFontSize();
            doc.text(arrowSymbol, startX + keyWidth + arrowGap, y);
            doc.setFont("Times", "bold");
            doc.text(String(value), valueStartX, y);
            doc.setFont("Times", "normal");
            y += rowHeight;
        });
    };

    const tableBlockWidth = 2 * chakraColWidth + colGap;
    const centeredStart = (pageWidth - tableBlockWidth) / 2;

    drawTable(centeredStart, leftFields);
    drawTable(centeredStart + chakraColWidth + colGap, rightFields);

    // --- Footer ---
    //addFooter(doc);
};

// ✅ Export Footer too
export { addFooter };

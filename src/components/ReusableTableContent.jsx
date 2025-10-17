'use client';
import { jsPDF } from "jspdf";

// Reusable footer component
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
    doc.setTextColor("#000000");
    doc.text(
        "Astrology - Numerology - Occult Guidance - Gemstone - Tarot Reading - Consultation",
        pageWidth / 2,
        footerY + lineHeight,
        { align: "center" }
    );
};

// Reusable table content generator
export const generateReusableTableContent = async ({
    doc, 
    kundliData, 
    sunriseData, 
    sunsetData, 
    moonSignData, 
    sunSignData, 
    userData,
    title = "AVAKAHADA CHAKRA", // Default title, can be customized
    showUserInfo = true // Option to show/hide user info section
}) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    const innerBoxMargin = 50;
    const colGap = 15;
    const chakraColWidth = (pageWidth - margin * 2 - colGap) / 2;
    const rowHeight = 15;
    const textColor = "#5e3a0b";
    const accentColor = "#a16a21";
    const bgColor = "#fffdf9";

    doc.addPage();

    // --- Background ---
    doc.setFillColor(bgColor);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // --- Border ---
    doc.setDrawColor(accentColor);
    doc.setLineWidth(1.5);
    doc.rect(margin - 10, margin - 10, pageWidth - margin * 2 + 20, pageHeight - margin * 2 + 20, "S");

    let currentY = 70; // Starting Y position

    // --- User Info Box (optional) ---
    if (showUserInfo) {
        const userBoxY = currentY;
        const userBoxHeight = 170;
        const userBoxX = innerBoxMargin;
        const userBoxWidth = pageWidth - innerBoxMargin * 2;

        doc.setDrawColor(accentColor);
        doc.setLineWidth(1);
        doc.rect(userBoxX, userBoxY, userBoxWidth, userBoxHeight, "S");

        // Decorative lines
        const lineY_Top = userBoxY + 25;
        const lineY_Bottom = userBoxY + userBoxHeight - 15;
        doc.setLineWidth(0.5);
        doc.line(userBoxX + 15, lineY_Top, userBoxX + userBoxWidth / 2 - 40, lineY_Top);
        doc.line(userBoxX + userBoxWidth / 2 + 40, lineY_Top, userBoxX + userBoxWidth - 15, lineY_Top);
        doc.line(userBoxX + 15, lineY_Bottom, userBoxX + userBoxWidth - 15, lineY_Bottom);

        // Decorative Bullets
        const bulletR = 3;
        doc.setFillColor(accentColor);
        doc.circle(userBoxX + userBoxWidth / 2 - 35, lineY_Top, bulletR, "F");
        doc.circle(userBoxX + userBoxWidth / 2 + 35, lineY_Top, bulletR, "F");

        // --- Name ---
        doc.setFont("Times", "bold");
        doc.setFontSize(18);
        doc.setTextColor(accentColor);
        doc.text((userData?.name || "").toUpperCase(), pageWidth / 2, lineY_Top + 25, { align: "center" });

        // --- User Data ---
        const dataStartY = lineY_Top + 4 * rowHeight;
        const column1X = userBoxX + 10;
        const column2X = pageWidth / 2 + 10;

        const leftFields = [
            ["Sex", userData?.sex || ""],
            ["Date of Birth", userData?.dob || ""],
            ["Day", userData?.day || ""],
            ["Time of Birth", userData?.time || ""],
        ];
        const rightFields = [
            ["Ishta", kundliData?.ishta || ""],
            ["City", userData?.place || ""],
            ["State", userData?.state || ""],
            ["Country", userData?.country || ""],
        ];

        const drawUserInfoRows = (startX, fields) => {
            let currentY = dataStartY;
            const valueRightAlignX = startX + (userBoxWidth / 2) - 100;

            doc.setFont("Times", "normal");
            doc.setFontSize(13);
            doc.setTextColor(textColor);

            fields.forEach(([key, val]) => {
                doc.text(`${key}:`, startX, currentY);
                doc.setFont("Times", "bold");
                doc.text(val, valueRightAlignX, currentY);
                doc.setFont("Times", "normal");
                currentY += rowHeight;
            });
        };

        drawUserInfoRows(column1X, leftFields);
        drawUserInfoRows(column2X, rightFields);

        currentY = userBoxY + userBoxHeight + 50;
    }

    // --- Section Header ---
    const headerY = currentY;
    doc.setFont("Times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(accentColor);
    doc.text(title, pageWidth / 2, headerY, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 80, headerY + 5, pageWidth / 2 - 20, headerY + 5);
    doc.line(pageWidth / 2 + 20, headerY + 5, pageWidth / 2 + 80, headerY + 5);
    const bulletR = 3;
    doc.circle(pageWidth / 2, headerY + 5, bulletR, "F");

    // --- Table Data ---
    const tableDataY = headerY + 40;
    const tableCol1X = margin;
    const tableCol2X = margin + chakraColWidth + colGap;

    const leftFields = [
        ["Latitude", userData?.latitude || ""],
        ["Longitude", userData?.longitude || ""],
        ["Ascendant Sign", kundliData?.ascendant_sign || ""],
        ["Ascendant Nakshatra", kundliData?.ascendant_nakshatra || ""],
        ["Rasi", kundliData?.rasi || ""],
        ["Rasi Lord", kundliData?.rasi_lord || ""],
        ["Nakshatra", kundliData?.nakshatra || ""],
        ["Nakshatra Lord", kundliData?.nakshatra_lord || ""],
        ["Nakshatra Pada", kundliData?.nakshatra_pada || 0],
        ["Sun Sign (Vedic)", kundliData?.sun_sign || ""],
        ["Sun Sign (Western)", sunSignData?.sun_sign || ""],
        ["Moon Sign", moonSignData?.moon_sign || ""],
        ["Tithi", kundliData?.tithi || ""],
        ["Karana", kundliData?.karana || ""],
        ["Yoga", kundliData?.yoga || ""], 
        ["Sunrise", sunriseData?.sun_rise || ""],
        ["Sunset", sunsetData?.sun_set || ""],
    ];

    const rightFields = [
        ["Gana", kundliData?.gana || ""],
        ["Yoni", kundliData?.yoni || ""],
        ["Vasya", kundliData?.vasya || ""],
        ["Nadi", kundliData?.nadi || ""],
        ["Varna", kundliData?.varna || ""],
        ["Paya", kundliData?.paya || ""],
        ["Tatva", kundliData?.tatva || ""],
        ["Life Stone", kundliData?.life_stone || ""],
        ["Lucky Stone", kundliData?.lucky_stone || ""],
        ["Fortune Stone", kundliData?.fortune_stone || ""],
        ["Name Start", kundliData?.name_start || ""],
    ];

    const drawTableRows = (startX, fields) => {
        let currentY = tableDataY;
        const arrowGap = 5;
        const arrowSymbol = "➤";
        const valueStartX = startX + chakraColWidth / 2 + 5;

        doc.setFont("Times", "normal");
        doc.setFontSize(13);
        doc.setTextColor(textColor);

        fields.forEach(([key, val]) => {
            doc.text(key, startX, currentY);
            const keyWidth = doc.getStringUnitWidth(key) * doc.internal.getFontSize();
            doc.text(arrowSymbol, startX + keyWidth + arrowGap, currentY);
            doc.setFont("Times", "bold");
            doc.text(String(val || ""), valueStartX, currentY);
            doc.setFont("Times", "normal");
            currentY += rowHeight;
        });
        return currentY;
    };

    const tableBlockWidth = 2 * chakraColWidth + colGap;
    const centeredStart = (pageWidth - tableBlockWidth) / 2;

    drawTableRows(centeredStart, leftFields);
    drawTableRows(centeredStart + chakraColWidth + colGap, rightFields);

    // --- Footer ---
    addFooter(doc);
};

// Prompt function that can be called from cosmicdmreport page
export const generateTableContentPrompt = async ({
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
    title = "AVAKAHADA CHAKRA",
    showUserInfo = true
}) => {
    try {
        // This function can be called from the cosmicdmreport page
        // It will generate the table content and return the necessary data
        return {
            success: true,
            data: {
                kundliData,
                sunriseData,
                sunsetData,
                moonSignData,
                sunSignData,
                userData,
                title,
                showUserInfo
            }
        };
    } catch (error) {
        console.error("Error generating table content prompt:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Export the footer function for reuse
export { addFooter };

    doc.addPage();
    const margin = 25;
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
      "Your Emotional Side – How you express and handle feelings",
      "Your Compatibility – How you connect with others",
      "Your Relationship Style – What you need in love",
      "Planets of Love – What Venus and Mars say about romance and attraction",
      "Marriage & Partnership – What your chart says about long-term bonds",
      "Timing in Love – When love and marriage are most likely to happen",
      "Lessons in Love – What you learn through relationships",
      "Darakaraka & Soulmate Planet – The celestial force that defines your life partner"
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

      doc.addPage();

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
      "Your Career Strengths – Analyze the native’s natural talents, skills, and professional strengths. Discuss how planetary placements and house influences reveal their core abilities and what fields they are naturally drawn toward.",
      "Ideal Work Style – Explore the individual’s approach to work, their preferred environments, and how they handle responsibility, teamwork, and leadership. Explain what kind of professional setting best supports their emotional and intellectual fulfillment.",
      "Success Factors – Identify the planetary influences and time periods that bring professional growth, promotions, recognition, and financial success. Describe how luck, effort, and timing combine to shape career progress.",
      "Turning Points – Examine the planetary periods (Dashas, Yogas, and transits) that signal job changes, business opportunities, or major career transitions. Highlight when key breakthroughs or challenges are most likely to occur.",
      "Your Professional Future – Offer a holistic, future-oriented view of the person’s long-term professional journey, leadership potential, and overall success indicators. Conclude with motivating insights on how they can align with their soul’s true vocational path."
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
      //const sectionTitle = careerSections[i].split(":")[0];
      const text = results[i];

      doc.addPage();
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
      "Overall Health Picture – Describe the user's overall health potential and natural constitution. Highlight their key strengths, healing abilities, and any areas that may need extra care. Offer gentle guidance on lifestyle balance and wellbeing.",
      "Planet Influence on Health – Explain how different planets affect the user's physical energy, immunity, stress response, and emotional balance. Mention which planets give strength and vitality, and which may create temporary health challenges.",
      "Mind-Body Connection – Show how the user's emotions, thoughts, and energy flow affect their physical health. Talk about how their Moon, Mercury, and Ascendant signs influence emotional stability, mental clarity, and inner peace.",
      "Stress Triggers – Identify what kinds of situations or patterns may lead to stress or imbalance. Offer insights on what the user should avoid and what habits or mindsets help them stay calm and focused.",
      "Simple Remedies – Provide practical, easy-to-follow suggestions to maintain good health. Include natural, spiritual, or lifestyle remedies such as meditation, breathing exercises, balanced diet, rest, or small rituals that promote overall wellbeing.",
      "Sade Sati & Mangalik Analysis – Planetary challenges and their healing lessons"
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
      //const sectionPrompt = healthSections[i];
      const text = resulthealth[i];

      doc.addPage();
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
      "Your Life Purpose – Explain the soul’s deeper mission, the key lessons to learn in this lifetime, and what the user is meant to achieve through personal and spiritual growth. Show how the birth chart reveals their higher calling and guiding values.",
      "Growth Phases – Describe the major life phases and challenges that help the user mature emotionally and spiritually. Discuss how planetary cycles, especially Saturn and Sade Sati, shape wisdom, strength, and resilience over time.",
      "Past-Life Connections – Share insights about what past-life experiences or karmic themes might carry over into this life. Talk about patterns or emotions that repeat and how they offer chances for healing and completion.",
      "Key Turning Points – Identify the spiritual or life-changing moments that redirect the user’s path. Include major planetary transits or dashas that bring self-discovery, breakthroughs, or powerful realizations.",
      "Learning Through Challenges – Explain how difficulties, emotional tests, or delays help the user evolve. Show how every challenge teaches patience, courage, and compassion, leading them closer to inner freedom and self-awareness.",
      "Rahu-Ketu Axis – Understanding your karmic push and pull"
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
      //const sectionPrompt = karmicSections[i];
      const text = karmicResults[i];

      doc.addPage();
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
      "Major Life Phases – The big themes that guide your future",
      "Upcoming Events – What the next few years may bring",
      "Year Ahead Forecast – Favorable and challenging months",
      "Planet Movements – How upcoming changes may influence you",
      "Overall Outlook – What to expect in your personal and professional life"
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
      doc.addPage();
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
      "Lucky Stones & Crystals – Best choices for your energy",
      "Powerful Mantras – Chants that calm and strengthen you",
      "Helpful Rituals – Easy daily or weekly practices",
      "Good Deeds & Charity – Acts that improve your karma",
      "Protection & Peace Tips – Simple ways to stay positive"
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

      doc.addPage();
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
      "Your Strength Map – Where your natural power lies",
      "Planet Power Levels – How much influence each planet has",
      "Detailed Life Charts – In-depth look at all life areas",
      "Fine Timing Review – Small changes and their meanings",
      "Special Planet Effects – When two planets compete or combine",
      "Raj Yogas & Karmic Doshas – Combinations that bring fame or challenges"
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
      console.log(`🔭 Generating Deeper Insights → ${section.split("–")[0].trim()} ...`);
      const text = await fetchAdvancedSection(section);
      resultAdvanced.push(text);
    }
    console.log("✨ All Deeper Insights sections generated successfully!");

    // === Render All Sections in PDF ===
    for (let i = 0; i < advancedSections.length; i++) {
      const sectionPrompt = advancedSections[i];
      const text = resultAdvanced[i];

      doc.addPage();
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
      "Sunrise & Sunset on Birth Day – How they shaped your energy",
      "Moonrise & Moonset – Your emotional timing",
      "Auspicious Hours – Your naturally lucky times of day",
      "Planetary Hours – Best hours for decisions and activities",
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

      doc.addPage();
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
      startSection(doc, `Personalized Predictive Q&A`);
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

        doc.addPage();
        doc.setDrawColor("#a16a21");
        doc.setLineWidth(1.5);
        doc.rect(25, 25, 545, 792, "S");

        // === Title ===
        const maxTitleWidth = pageWidth - 120;
        let titleLines = doc.splitTextToSize(sectionTitle, maxTitleWidth);

        // If title has more than 2 lines, limit to 2
        if (titleLines.length > 2) {
          // Merge excess lines into 2nd line with ellipsis
          titleLines = [titleLines[0], titleLines.slice(1).join(" ").slice(0, 60) + "..."];
        }

        // Adjust font size dynamically
        const titleFontSize = titleLines.length > 1 ? 20 : 24;
        const titleLineHeight = 26;

        doc.setFont("NotoSans", "bold");
        doc.setFontSize(titleFontSize);
        doc.setTextColor("#000");

        // Center both lines
        titleLines.forEach((line: string, idx: number) => {
          const yPos = 60 + idx * titleLineHeight;
          doc.text(line, pageWidth / 2, yPos, { align: "center" });
        });

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
    // --- Save PDF ---
    // ---------- FINALIZE: Build clickable TOC and outline, then save ----------
// Call this AFTER every content page has been generated and all startSection/markSectionPage calls were used.
(function finalizeTocAndSave() {
  try {
    // 1) Ensure registry exists
    // If your helper is named differently, adapt names accordingly.
    // __sectionRegistry is expected to be an array of { title, anchor, page, tocLabel } entries.
    if (!Array.isArray((globalThis as any).__sectionRegistry) && !Array.isArray((window as any).__sectionRegistry) && typeof __sectionRegistry === "undefined") {
      // If you used the helper in the file I gave earlier, __sectionRegistry should exist.
      // If not, fallback: build a small registry from manual known titles (not ideal).
      console.warn("TOC registry not found. Ensure startSection(...) was used when sections were added.");
    }

    // Prefer local variable if present
    const registry: { title: string; anchor: string; page: number; tocLabel?: string }[] =
      typeof __sectionRegistry !== "undefined" ? ( __sectionRegistry as any ) : ( (window as any).__sectionRegistry || (globalThis as any).__sectionRegistry || [] );

    // Sanity: remove duplicates and ensure page numbers
    const seen = new Set();
    const entries = registry
      .map(e => ({ title: e.title, anchor: e.anchor, page: e.page || 1, tocLabel: e.tocLabel || e.title }))
      .filter(e => {
        if (!e.anchor) e.anchor = e.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").toLowerCase();
        const k = `${e.anchor}:${e.page}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a,b) => (a.page||0) - (b.page||0));

    // If nothing to add, skip
    if (entries.length === 0) {
      console.warn("No TOC entries found. Make sure startSection(...) was called before creating each major page.");
    } else {
      // 2) Create TOC pages at the end
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftX = 50;
      const rightX = pageWidth - 80;
      const lineH = 18;
      let y = 100;

      // track indices of created TOC pages for reordering
      const tocPages: number[] = [];

      function createNewTocPage() {
        doc.addPage();
        tocPages.push(doc.getNumberOfPages());
        // draw border if you want to match style
        try {
          doc.setDrawColor("#a16a21");
          doc.setLineWidth(1.5);
          doc.rect(25, 25, pageWidth - 50, pageHeight - 50, "S");
        } catch (e) {}
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(26);
        doc.setTextColor("#000");
        doc.text("Table of Contents", pageWidth / 2, 60, { align: "center" });

        doc.setFont("NotoSans", "normal");
        doc.setFontSize(14);
        return 100; // y start
      }

      y = createNewTocPage();

      for (const it of entries) {
        if (y + lineH > pageHeight - 60) y = createNewTocPage();

        const label = it.tocLabel || it.title;
        // draw label and page number
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(14);
        doc.setTextColor("#000");
        doc.text(label, leftX, y, { maxWidth: pageWidth - 200 });
        doc.text(String(it.page), rightX, y);

        // clickable link: prefer textWithLink -> namedDest, else use link to pageNumber covering the label area
        try {
          if ((doc as any).textWithLink) {
            // use named destination anchor if present (works with addNamedDestination)
            (doc as any).textWithLink(label, leftX, y, { namedDest: it.anchor });
          } else if ((doc as any).link) {
            // create rectangle over the label text that links to page number
            const w = doc.getTextWidth(label || "");
            // coords: x, yTop, width, height (y coordinate in link uses PDF coordinate space: approximate by y - fontSize)
            (doc as any).link(leftX, y - 12, Math.max(4, w + 6), lineH + 2, { pageNumber: it.page });
          } else {
            // Last-resort: add named destination on that page (for some viewers the outline works)
            try { (doc as any).addNamedDestination && (doc as any).addNamedDestination(it.anchor); } catch(e) {}
          }
        } catch (e) {
          console.warn("Failed to attach clickable link for TOC line", label, e);
        }

        y += lineH;
      }

      // 3) Try to create PDF sidebar outline (bookmarks) if supported
      try {
        if ((doc as any).outline && typeof (doc as any).outline.add === "function") {
          const root = (doc as any).outline.add ? (doc as any).outline.add("Table of Contents") : null;
          for (const it of entries) {
            try {
              // add an entry and set destination to page number (best-effort)
              const node = root && root.add ? root.add(it.title) : null;
              if (node && node.dest === undefined) {
                // many jspdf implementations accept dest as { pageNumber }
                (node as any).dest = { pageNumber: it.page };
              }
            } catch (e) {
              // ignore per-entry failures
            }
          }
        }
      } catch (e) {
        console.warn("Outline creation failed or not supported in this jsPDF build.", e);
      }

      // 4) Reorder pages: move TOC pages to after cover (page 1)
      try {
        const internal = (doc as any).internal;
        const pagesArray = internal.pages; // pagesArray[0] reserved
        // Compose new order:
        const before = pagesArray.slice(1, 2); // page 1 (cover) -> keep
        const tocPagesObjs = tocPages.map(i => pagesArray[i]);
        // rest: pages after cover excluding tocPages
        const rest = pagesArray.filter((_, idx) => idx > 1 && !tocPages.includes(idx));
        (doc as any).internal.pages = [pagesArray[0], ...before, ...tocPagesObjs, ...rest];
      } catch (e) {
        console.warn("Page reordering failed in this jsPDF build. TOC remains at the end.", e);
      }

      // 5) Re-apply header/footer across pages (recommended)
      try {
        for (let p = 1; p <= doc.getNumberOfPages(); p++) {
          doc.setPage(p);
          if (typeof addHeaderFooter === "function") addHeaderFooter(doc, p);
        }
      } catch (e) {
        console.warn("Failed to reapply header/footer:", e);
      }
    }

  } catch (err) {
    console.error("Error while building TOC:", err);
  }

  // finally save
  try {
    // adjust file name as needed
    const filename = `Cosmic_Report_${(new Date()).toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
  } catch (e) {
    console.error("Error saving PDF:", e);
  }
})();
    return { success: true  };

  } catch (err: unknown) {
    console.error("Error generating report:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
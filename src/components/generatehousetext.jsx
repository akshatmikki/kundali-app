export const generateHouseStory = (house, aspects, ashtakvargaPoints) => {
  const planets = house.planets?.length
    ? house.planets.map(p => `${p.full_name} (${p.nakshatra}, Pada ${p.nakshatra_pada}${p.retro ? ', Retrograde' : ''})`).join(", ")
    : "No planets present in this house";

  const aspectsSummary = aspects?.aspected_by_planet?.length
    ? aspects.aspected_by_planet.map((p, idx) => `${p} (Index: ${aspects.aspected_by_planet_index[idx]})`).join(", ")
    : "No significant aspects affecting this house";

  const avPoints = ashtakvargaPoints?.length
    ? ashtakvargaPoints.map((pt, idx) => `${["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Ascendant"][idx]}: ${pt}`).join(", ")
    : "No Ashtakvarga points available";

  return `
House ${house.house}: ${house.name || "Unknown House"}

--- Introduction & Personality Traits ---
Planets in this house: ${planets}.
This house represents a crucial area of life, influencing your core personality traits, motivations, and how you express yourself in the world. Planets here shape your inherent strengths, tendencies, and challenges.
- Key strengths: ${house.planets?.length ? `Driven by the energies of ${planets}` : "Balanced yet flexible personality traits"}
- Typical challenges: Learning to manage the house's energies constructively.
- Life lesson: Self-awareness and harnessing planetary influences for personal growth.

--- Relationships & Social Dynamics ---
Aspects affecting this house: ${aspectsSummary}.
Aspects indicate how planets interact, showing potential challenges and opportunities in relationships, career, and personal interactions.
- Supportive aspects: Opportunities for collaboration, mentorship, and forming meaningful bonds.
- Challenging aspects: Conflicts, misunderstandings, or internal tension. These experiences help you grow patience, resilience, and emotional intelligence.
- Practical guidance: Be mindful of your reactions; use diplomacy and empathy to navigate conflicts. Turn challenges into opportunities for learning.

--- Opportunities, Strengths & Career Guidance ---
Ashtakvarga points: ${avPoints}.
Ashtakvarga points indicate areas of strength, luck, and opportunity in this house.
- High points: Areas where you can excel naturally, achieve goals, and attract support.
- Low points: Areas that require more effort, discipline, and careful planning.
- Career guidance: Leverage your strong points in professional and personal life. Seek roles or projects aligned with the energies of this house.
- Spiritual & personal growth: Reflect on the lessons of this house, cultivate patience, adaptability, and awareness, and focus on self-improvement and holistic growth.

--- Overall Insights ---
This house serves as a mirror of your life’s experiences in its domain. Understanding planetary placements, aspects, and Ashtakvarga points allows you to navigate life with wisdom, recognize opportunities, and mitigate challenges.
Use these insights to make informed decisions, improve relationships, and cultivate balance between personal desires and external demands.
`;
};

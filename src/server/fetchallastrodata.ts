/**
 * fetchAllAstroData.ts
 * Fully typed + Promise.allSettled concurrent API fetching
 */
"use server";
import { writeFile } from "fs/promises";

// ---------------------------------------------------
// 🌟 Interfaces
// ---------------------------------------------------
export interface UserData {
  name: string;
  dob: string;  // Format: "DD/MM/YYYY"
  time: string; // Format: "HH:MM"
  lat: number;
  lon: number;
}

export interface AstroSection {
  [key: string]: any;
}

export interface AstroData {
  [key: string]: any;
  meta?: {
    generatedAt: string;
    api_count?: number;
    success?: number;
    failed?: number;
  };
}
// ✅ API Request Interface
export interface AstroApiRequest {
  key: string;
  url: string;
  dob?: string;
  tob?: string;
  lat?: number;
  lon?: number;
  tz?: number;
  lang?: string;
  planet?: string;
  type?: string;
  date?: string;
  time?: string;
  year?: number;
  zodiac?: number;
  name?: string;
  gem?: string;
  div?: string;
  response_type?: string;
  api_key?: string;
}

// ---------------------------------------------------
// ⚙️ Configuration
// ---------------------------------------------------
const BASE_URL = "https://api.vedicastroapi.com/v3-json";
const API_KEY = process.env.NEXT_PUBLIC_VEDIC_ASTRO_KEY; // 🔒 Replace with actual key

const PLANETS = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter",
  "Venus", "Saturn", "Rahu", "Ketu"
];

const DIVISIONAL_CHARTS = [
  "D1", "D2", "D3", "D3-s", "D4", "D5", "D7", "D8",
  "D9", "D10", "D10-R", "D12", "D16", "D20", "D24", "D24-R",
  "D27", "D30", "D40", "D45", "D60", "chalit", "sun", "moon",
  "kp_chalit", "transit"
];

// ---------------------------------------------------
// 🧩 Build API List
// ---------------------------------------------------
function buildApiList(user: UserData): AstroApiRequest[] {
  const common = {
    dob: user.dob,
    tob: user.time,
    lat: user.lat,
    lon: user.lon,
    tz: 5.5,
    lang: "en",
    api_key: API_KEY,
  };

  const list: AstroApiRequest[] = [
    // Doshas
    { key: "mangal_dosh", url: "/dosha/mangal-dosh" },
    { key: "kaalsarp_dosh", url: "/dosha/kaalsarp-dosh" },
    { key: "manglik_dosh", url: "/dosha/manglik-dosh" },
    { key: "pitra_dosh", url: "/dosha/pitra-dosh" },
    { key: "papasamaya", url: "/dosha/papasamaya" },

    // Dashas
    { key: "maha_dasha", url: "/dashas/maha-dasha" },
    { key: "maha_dasha_predictions", url: "/dashas/maha-dasha-predictions" },
    { key: "antar_dasha", url: "/dashas/antar-dasha" },
    { key: "char_dasha_current", url: "/dashas/char-dasha-current" },
    { key: "char_dasha_main", url: "/dashas/char-dasha-main" },
    { key: "char_dasha_sub", url: "/dashas/char-dasha-sub" },
    { key: "paryantar_dasha", url: "/dashas/paryantar-dasha" },
    { key: "yogini_dasha_main", url: "/dashas/yogini-dasha-main" },
    { key: "yogini_dasha_sub", url: "/dashas/yogini-dasha-sub" },

    // Extended Horoscope
    {key:"varshapal_details", url:"/extended-horoscope/varshapal-details"},
    {key: "rudraksh_suggestion", url: "/extended-horoscope/rudraksh-suggestion"},
    { key: "find_moon_sign", url: "/extended-horoscope/find-moon-sign" },
    { key: "find_sun_sign", url: "/extended-horoscope/find-sun-sign" },
    { key: "find_ascendant", url: "/extended-horoscope/find-ascendant" },
    { key: "current_sade_sati", url: "/extended-horoscope/current-sade-sati" },
    { key: "extended_kundli_details", url: "/extended-horoscope/extended-kundli-details" },
    { key: "shad_bala", url: "/extended-horoscope/shad-bala" },
    { key: "sade_sati_table", url: "/extended-horoscope/sade-sati-table" },
    { key: "kp_houses", url: "/extended-horoscope/kp-houses" },
    { key: "kp_planets", url: "/extended-horoscope/kp-planets" },
    { key: "gem_suggestion", url: "/extended-horoscope/gem-suggestion" },
    { key: "numero_table", url: "/extended-horoscope/numero-table", name: user.name },
    { key: "jaimini_karakas", url: "/extended-horoscope/jaimini-karakas" },
    { key: "yoga_list", url: "/extended-horoscope/yoga-list" },

    // Horoscope
    { key: "planet_details", url: "/horoscope/planet-details" },
    { key: "ascendant_report", url: "/horoscope/ascendant-report" },
    { key: "personal_characteristics", url: "/horoscope/personal-characteristics" },
    { key: "ashtakvarga", url: "/horoscope/ashtakvarga", planet: "Sun" },
    { key: "ai_12_month_prediction", url: "/horoscope/ai-12-month-prediction" },
    { key: "planetary_aspects_houses", url: "/horoscope/planetary-aspects", type: "houses" },
    { key: "planetary_aspects_planets", url: "/horoscope/planetary-aspects", type: "planets" },
    { key: "planets_in_houses", url: "/horoscope/planets-in-houses" },

    // Panchang
    {key:"choghadiya_muhurta",url:"/panchang/choghadiya-muhurta"},
    {key: "hora_muhurta", url: "/panchang/hora-muhurta"},
    { key: "moonrise", url: "/panchang/moonrise", date: user.dob, time: user.time },
    { key: "moonset", url: "/panchang/moonset", date: user.dob, time: user.time },
    { key: "sunrise", url: "/panchang/sunrise", date: user.dob, time: user.time },
    { key: "sunset", url: "/panchang/sunset", date: user.dob, time: user.time },

    // Prediction / Numerology / Gems
    { key: "numerology_prediction", url: "/prediction/numerology", name: user.name, date: user.dob },
    { key: "gem_details", url: "/utilities/gem-details", gem: "coral" },
  ];

  // Add dynamic planets and divisional charts
 PLANETS.forEach((planet) => {
  list.push({
    key: `retrogrades_${planet.toLowerCase()}`,
    url: "/panchang/retrogrades",
    year: 2025,
    planet,
  });
list.push({
    key: `transit_dates_${planet.toLowerCase()}`,
    url: "/panchang/transit-dates",
    year: 2025,
    planet,
  });
  list.push({
    key: `planet_report_${planet.toLowerCase()}`,
    url: "/horoscope/planet-report",
    planet,
  });
});
  DIVISIONAL_CHARTS.forEach((div) =>
    list.push({ key: `divisional_chart_${div}`, url: "/horoscope/divisional-charts", div, response_type: "planet_object" })
  );

  return list.map((api) => ({ ...common, ...api }));
}

// ---------------------------------------------------
// 🌐 Fetch Helper
// ---------------------------------------------------
async function fetchAstroData(api: AstroApiRequest): Promise<{ key: string; data?: any; error?: string }> {
  try {
    // ✅ Convert to valid query params
    const params = new URLSearchParams(
      Object.entries(api)
        .filter(([_, v]) => v !== undefined && v !== null)
        .reduce<Record<string, string>>((acc, [k, v]) => {
          acc[k] = String(v); // convert all to string
          return acc;
        }, {})
    );

    const res = await fetch(`${BASE_URL}${api.url}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${api.key}`);

    const data = await res.json();
    return { key: api.key, data };
  } catch (err: any) {
    return { key: api.key, error: err.message };
  }
}


// ---------------------------------------------------
// 🚀 Main Function
// ---------------------------------------------------
export async function fetchAllAstroData(userData: UserData): Promise<AstroData> {
  const apiList = buildApiList(userData);
  console.log(`🪐 Fetching ${apiList.length} endpoints concurrently...\n`);

  const responses = await Promise.allSettled(apiList.map(fetchAstroData));

  const finalData: AstroData = {};
  let success = 0, failed = 0;

  for (const result of responses) {
    if (result.status === "fulfilled" && result.value) {
      const { key, data, error } = result.value;
      if (error) {
        finalData[key] = { error };
        failed++;
      } else {
        // ✅ Extract the nested response/value part if available
        if (data?.response) {
          finalData[key] = data.response; // only store the "response" part
        } else if (data?.value) {
          finalData[key] = data.value; // fallback if some endpoints return "value"
        } else {
          finalData[key] = data; // fallback in case no nesting
        }
        success++;
      }
    } else {
      failed++;
    }
  }

  finalData.meta = {
    generatedAt: new Date().toISOString(),
    api_count: apiList.length,
    success,
    failed,
  };

  await writeFile("astro_data_Saurabh.json", JSON.stringify(finalData, null, 2), "utf8");
  console.log(`✅ Saved astro_data_Saurabh.json (Success: ${success}, Failed: ${failed})`);

  return finalData;
}

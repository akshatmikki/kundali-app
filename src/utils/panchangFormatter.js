// Utility functions to format Panchang data for display

export const formatPanchangData = (panchangData) => {
  if (!panchangData?.response) return null;

  const { response } = panchangData;

  return {
    basicInfo: {
      date: response.date,
      day: response.day?.name,
      rasi: response.rasi?.name,
      ayanamsa: response.ayanamsa?.name
    },
    tithi: {
      name: response.tithi?.name,
      type: response.tithi?.type,
      deity: response.tithi?.diety,
      meaning: response.tithi?.meaning,
      special: response.tithi?.special,
      start: response.tithi?.start,
      end: response.tithi?.end
    },
    nakshatra: {
      name: response.nakshatra?.name,
      lord: response.nakshatra?.lord,
      deity: response.nakshatra?.diety,
      meaning: response.nakshatra?.meaning,
      special: response.nakshatra?.special,
      summary: response.nakshatra?.summary,
      auspiciousDisha: response.nakshatra?.auspicious_disha
    },
    yoga: {
      name: response.yoga?.name,
      meaning: response.yoga?.meaning,
      special: response.yoga?.special,
      start: response.yoga?.start,
      end: response.yoga?.end
    },
    karana: {
      name: response.karana?.name,
      type: response.karana?.type,
      lord: response.karana?.lord,
      deity: response.karana?.diety,
      special: response.karana?.special,
      start: response.karana?.start,
      end: response.karana?.end
    },
    auspiciousTimes: {
      rahukaal: response.rahukaal,
      gulika: response.gulika,
      yamakanta: response.yamakanta
    },
    advanced: {
      sunRise: response.advanced_details?.sun_rise,
      sunSet: response.advanced_details?.sun_set,
      moonRise: response.advanced_details?.moon_rise,
      moonSet: response.advanced_details?.moon_set,
      nextFullMoon: response.advanced_details?.next_full_moon,
      nextNewMoon: response.advanced_details?.next_new_moon,
      masa: response.advanced_details?.masa,
      abhijitMuhurta: response.advanced_details?.abhijit_muhurta
    }
  };
};

export const getAuspiciousActivities = (formattedData) => {
  const activities = [];
  
  if (formattedData?.tithi?.special) {
    activities.push(`Tithi: ${formattedData.tithi.special}`);
  }
  
  if (formattedData?.nakshatra?.special) {
    activities.push(`Nakshatra: ${formattedData.nakshatra.special}`);
  }
  
  if (formattedData?.yoga?.special) {
    activities.push(`Yoga: ${formattedData.yoga.special}`);
  }
  
  if (formattedData?.karana?.special) {
    activities.push(`Karana: ${formattedData.karana.special}`);
  }
  
  return activities;
};

export const getInauspiciousTimes = (formattedData) => {
  return {
    rahukaal: formattedData?.auspiciousTimes?.rahukaal,
    gulika: formattedData?.auspiciousTimes?.gulika,
    yamakanta: formattedData?.auspiciousTimes?.yamakanta
  };
};
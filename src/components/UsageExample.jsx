// Usage Example for Reusable Table Content Integration with Real API Data
// This file demonstrates how to use the new reusable table content components with actual form data

import { 
  generateAndDownloadFullCosmicReportWithTable, 
  generateTableContentForReport,
  generateReportFromJsonData
} from './CosmicDMReport';

// Example 1: Using the enhanced cosmic report with real API data (like AstroPDF form)
export const generateReportWithTable = async () => {
  try {
    // Real user data from AstroPDF form
    const userData = {
      name: "John Doe",
      sex: "Male",
      dob: "1990-01-15",
      time: "10:30 AM",
      place: "New York",
      state: "NY",
      country: "USA",
      latitude: 40.7128,
      longitude: -74.0060,
      language: "en"
    };

    // The function will automatically fetch real API data
    await generateAndDownloadFullCosmicReportWithTable(
      userData.name,
      userData.dob,
      userData.time,
      `${userData.place}, ${userData.state}, ${userData.country}`,
      userData.latitude,
      userData.longitude,
      userData
    );

    console.log("Report generated successfully with real API data in Avakahada Chakra table!");
  } catch (error) {
    console.error("Error generating report:", error);
  }
};

// Example 2: Using the prompt function with real API data
export const generateTableContentData = async () => {
  try {
    const result = await generateTableContentForReport({
      name: "Jane Smith",
      dob: "1985-05-20",
      time: "02:15 PM",
      place: "Los Angeles, CA, USA",
      lat: 34.0522,
      lon: -118.2437,
      userData: {
        name: "Jane Smith",
        sex: "Female",
        dob: "1985-05-20",
        time: "02:15 PM",
        place: "Los Angeles",
        state: "CA",
        country: "USA",
        latitude: 34.0522,
        longitude: -118.2437,
        language: "en"
      }
    });

    if (result.success) {
      console.log("Table content data generated successfully with real API data:", result.data);
      return result.data;
    } else {
      console.error("Error generating table content:", result.error);
    }
  } catch (error) {
    console.error("Error in generateTableContentData:", error);
  }
};

// Example 3: Integration with existing cosmic report
export const integrateWithExistingReport = async () => {
  try {
    // First, generate the table content data
    const tableData = await generateTableContentData();
    
    if (tableData) {
      // Then use it with the enhanced report function
      await generateAndDownloadFullCosmicReportWithTable(
        tableData.userData.name,
        "1985-05-20",
        "02:15 PM",
        "Los Angeles, CA, USA",
        34.0522,
        -118.2437,
        tableData.userData,
        tableData.kundliData,
        tableData.sunriseData,
        tableData.sunsetData,
        tableData.moonSignData,
        tableData.sunSignData
      );
    }
  } catch (error) {
    console.error("Error in integration:", error);
  }
};

// Example 4: Custom table title and options
export const generateCustomTableReport = async () => {
  try {
    // You can modify the ReusableTableContent.jsx to accept custom titles
    // For example, changing the title from "AVAKAHADA CHAKRA" to "BIRTH DETAILS"
    
    const customUserData = {
      name: "Alex Johnson",
      sex: "Male",
      city: "Chicago",
      state: "IL",
      country: "USA",
      day: "Friday"
    };

    const customKundliData = {
      response: {
        ascendant_sign: "Gemini",
        ascendant_nakshatra: "Ardra",
        rasi: "Gemini",
        rasi_lord: "Mercury",
        nakshatra: "Ardra",
        nakshatra_lord: "Rahu",
        nakshatra_pada: 3,
        sun_sign: "Gemini",
        tithi: "Ekadashi",
        karana: "Kaulava",
        yoga: "Atiganda",
        gana: "Manushya",
        yoni: "Sarpa",
        vasya: "Reptile",
        nadi: "Antya",
        varna: "Vaishya",
        paya: "Tamra",
        tatva: "Vayu",
        life_stone: "Emerald",
        lucky_stone: "Green Jade",
        fortune_stone: "Peridot",
        name_start: "A"
      },
      ishta: "Mercury"
    };

    await generateAndDownloadFullCosmicReportWithTable(
      "Alex Johnson",
      "1992-08-10",
      "08:45 AM",
      "Chicago, IL, USA",
      41.8781,
      -87.6298,
      customUserData,
      customKundliData,
      { response: { sun_rise: "05:45 AM" } },
      { response: { sun_set: "08:15 PM" } },
      { response: { moon_sign: "Pisces" } },
      { response: { sun_sign: "Gemini" } }
    );

    console.log("Custom table report generated successfully!");
  } catch (error) {
    console.error("Error generating custom report:", error);
  }
};

// Example 5: Generate report from cached JSON data
export const generateReportFromCachedJson = async () => {
  try {
    // Example JSON data object (you would get this from a previously saved JSON file)
    const jsonData = {
      timestamp: "2024-01-15T10:30:00.000Z",
      userData: {
        name: "John Doe",
        sex: "Male",
        dob: "1990-01-15",
        time: "10:30 AM",
        place: "New York",
        state: "NY",
        country: "USA",
        latitude: 40.7128,
        longitude: -74.0060,
        language: "en"
      },
      apiData: {
        kundliData: {
          response: {
            ascendant_sign: "Aries",
            ascendant_nakshatra: "Bharani",
            rasi: "Aries",
            rasi_lord: "Mars",
            nakshatra: "Bharani",
            nakshatra_lord: "Venus",
            nakshatra_pada: 1,
            sun_sign: "Aries",
            tithi: "Purnima",
            karana: "Vishti",
            yoga: "Siddhi",
            gana: "Deva",
            yoni: "Ashwa",
            vasya: "Chatushpada",
            nadi: "Adi",
            varna: "Kshatriya",
            paya: "Swarna",
            tatva: "Agni",
            life_stone: "Ruby",
            lucky_stone: "Red Coral",
            fortune_stone: "Diamond",
            name_start: "A"
          },
          ishta: "Mars"
        },
        sunriseData: { response: { sun_rise: "06:30 AM" } },
        sunsetData: { response: { sun_set: "06:30 PM" } },
        moonSignData: { response: { moon_sign: "Cancer" } },
        sunSignData: { response: { sun_sign: "Aries" } }
      }
    };
    
    const result = await generateReportFromJsonData(
      jsonData,
      "John Doe",
      "1990-01-15",
      "10:30 AM",
      "New York, NY, USA"
    );
    
    if (result.success) {
      console.log("✅ Report generated from JSON cache:", result.fileName);
      return result;
    } else {
      console.error("❌ Error generating report from JSON:", result.error);
    }
  } catch (error) {
    console.error("Error in generateReportFromCachedJson:", error);
  }
};

// Example 6: Complete workflow with JSON caching
export const completeWorkflowWithJsonCaching = async () => {
  try {
    console.log("🚀 Starting complete workflow with JSON caching...");
    
    // Step 1: Generate report with API calls (this will save JSON automatically)
    const userData = {
      name: "Alex Johnson",
      sex: "Male",
      dob: "1992-08-10",
      time: "08:45 AM",
      place: "Chicago",
      state: "IL",
      country: "USA",
      latitude: 41.8781,
      longitude: -87.6298,
      language: "en"
    };

    console.log("📡 Step 1: Fetching API data and saving to JSON...");
    await generateAndDownloadFullCosmicReportWithTable(
      userData.name,
      userData.dob,
      userData.time,
      `${userData.place}, ${userData.state}, ${userData.country}`,
      userData.latitude,
      userData.longitude,
      userData
    );
    
    console.log("✅ Step 1 Complete: API data fetched and saved to JSON");
    console.log("📁 Check the 'public/api-data/' folder for the JSON file");
    
    // Step 2: Generate report from cached JSON (simulate later use)
    console.log("📄 Step 2: Generating report from cached JSON data...");
    
    // Note: In real usage, you would load the JSON file that was downloaded in Step 1
    // For this example, we'll use sample JSON data
    const sampleJsonData = {
      timestamp: "2024-01-15T10:30:00.000Z",
      userData: userData,
      apiData: {
        kundliData: { response: { ascendant_sign: "Gemini" } },
        sunriseData: { response: { sun_rise: "05:45 AM" } },
        sunsetData: { response: { sun_set: "08:15 PM" } },
        moonSignData: { response: { moon_sign: "Pisces" } },
        sunSignData: { response: { sun_sign: "Gemini" } }
      }
    };
    
    const result = await generateReportFromJsonData(
      sampleJsonData,
      userData.name,
      userData.dob,
      userData.time,
      `${userData.place}, ${userData.state}, ${userData.country}`
    );
    
    if (result.success) {
      console.log("✅ Step 2 Complete: Report generated from JSON cache");
      console.log("🎉 Complete workflow successful!");
    } else {
      console.log("⚠️ Step 2: JSON file not found (this is expected in demo)");
      console.log("💡 In real usage, the JSON file would be available from Step 1");
    }
    
  } catch (error) {
    console.error("Error in complete workflow:", error);
  }
};

// Export all examples for easy testing
export const examples = {
  generateReportWithTable,
  generateTableContentData,
  integrateWithExistingReport,
  generateCustomTableReport,
  generateReportFromCachedJson,
  completeWorkflowWithJsonCaching
};

// JSON Caching Example - Demonstrates how API data is automatically saved and can be reused

import { 
  generateAndDownloadFullCosmicReportWithTable,
  generateReportFromJsonData 
} from './CosmicDMReport';

// Example: Complete workflow showing JSON caching in action
export const demonstrateJsonCaching = async () => {
  console.log("🚀 JSON Caching Demonstration");
  console.log("================================");
  
  try {
    // Step 1: Generate report with API calls (this will automatically save JSON)
    console.log("📡 Step 1: Generating report with API calls...");
    console.log("   - This will fetch real data from APIs");
    console.log("   - JSON file will be automatically downloaded to your Downloads folder");
    
    const userData = {
      name: "Demo User",
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

    // This will:
    // 1. Fetch API data (kundli, sunrise, sunset, moon/sun signs)
    // 2. Save all data to JSON file automatically
    // 3. Generate PDF with Avakahada Chakra table
    await generateAndDownloadFullCosmicReportWithTable(
      userData.name,
      userData.dob,
      userData.time,
      `${userData.place}, ${userData.state}, ${userData.country}`,
      userData.latitude,
      userData.longitude,
      userData
    );
    
    console.log("✅ Step 1 Complete!");
    console.log("   - API data fetched successfully");
    console.log("   - JSON file downloaded to your Downloads folder");
    console.log("   - PDF generated with real data");
    
    // Step 2: Show how to use cached JSON data
    console.log("\n📄 Step 2: Using cached JSON data...");
    console.log("   - No API calls needed");
    console.log("   - Faster report generation");
    console.log("   - Works offline");
    
    // Note: In real usage, you would load the downloaded JSON file
    // For this demo, we'll show the expected file name
    const expectedJsonFileName = "api-data-Demo-User-2024-01-15T10-30-00-000Z.json";
    
    console.log(`   - Expected JSON file: ${expectedJsonFileName}`);
    console.log("   - Load the file and use generateReportFromJsonData() with the JSON data");
    
    // Example of how to use the cached data (commented out since file might not exist in demo)
    /*
    const result = await generateReportFromJsonData(
      expectedJsonPath,
      userData.name,
      userData.dob,
      userData.time,
      `${userData.place}, ${userData.state}, ${userData.country}`
    );
    
    if (result.success) {
      console.log("✅ Report generated from JSON cache:", result.fileName);
    }
    */
    
    console.log("\n🎉 JSON Caching Demo Complete!");
    console.log("================================");
    console.log("Benefits demonstrated:");
    console.log("✓ API data automatically downloaded as JSON");
    console.log("✓ Real data used in Avakahada Chakra table");
    console.log("✓ JSON can be reused for faster generation");
    console.log("✓ Offline report generation possible");
    console.log("✓ Easy debugging with raw API data");
    
  } catch (error) {
    console.error("❌ Error in JSON caching demo:", error);
  }
};

// Example: Show JSON file structure
export const showJsonStructure = () => {
  console.log("📋 JSON File Structure Example");
  console.log("==============================");
  
  const exampleJsonStructure = {
    timestamp: "2024-01-15T10:30:00.000Z",
    userData: {
      name: "Demo User",
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
  
  console.log("Example JSON structure:");
  console.log(JSON.stringify(exampleJsonStructure, null, 2));
  
  console.log("\n📁 File Location: User's Downloads folder");
  console.log("📝 File Naming: api-data-{name}-{timestamp}.json");
  console.log("🔄 Auto-downloaded: Every time APIs are called");
  console.log("💾 Reusable: Load file and use with generateReportFromJsonData()");
};

// Export examples
export const jsonExamples = {
  demonstrateJsonCaching,
  showJsonStructure
};

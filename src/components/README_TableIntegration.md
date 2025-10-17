# Reusable Table Content Integration with Real API Data & JSON Caching

This document explains how to use the new reusable table content components that have been integrated with the CosmicDMReport system, automatically fetch real API data, and save/load data from JSON files for caching and debugging.

## Overview

The table content from `addAvakahadachakra.jsx` has been extracted into a reusable component that can be used across different pages and reports. The component now automatically fetches real API data (kundli details, sunrise/sunset, moon/sun signs) using the same APIs that were called in the original Avakahada page. Additionally, all API data is automatically saved to JSON files for caching, debugging, and offline usage. This ensures consistent design, styling, real data, and data persistence throughout the application.

## Components Created

### 1. ReusableTableContent.jsx

This component contains:
- `generateReusableTableContent()` - Main function to generate table content pages
- `generateTableContentPrompt()` - Helper function for prompt generation
- `addFooter()` - Reusable footer component

**Features:**
- Customizable title (default: "AVAKAHADA CHAKRA")
- Optional user info section
- Consistent styling with golden-brown theme
- Responsive layout with two-column table structure

### 2. Enhanced CosmicDMReport.tsx

New functions added:
- `generateAndDownloadFullCosmicReportWithTable()` - Enhanced version that automatically fetches real API data and integrates table content
- `generateTableContentForReport()` - Prompt function that fetches real API data for table content

**Key Features:**
- Automatically fetches real API data using `fetchKundliDetails`, `fetchSunrise`, `fetchSunset`, `fetchMoonSign`, `fetchSunSign`
- Uses actual form data from AstroPDF (name, date, sex, time, city, lat, long, language)
- Real-time API data integration with proper error handling
- **Automatic JSON download**: All API data is automatically downloaded as JSON files
- **Offline support**: Generate reports from cached JSON data without API calls
- **Debugging support**: Easy access to raw API data for troubleshooting

## Usage Examples

### Basic Usage with Real API Data

```javascript
import { generateAndDownloadFullCosmicReportWithTable } from './CosmicDMReport';

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

// Generate report with real API data (automatically fetched)
await generateAndDownloadFullCosmicReportWithTable(
  userData.name,        // name
  userData.dob,         // dob
  userData.time,        // time
  `${userData.place}, ${userData.state}, ${userData.country}`, // place
  userData.latitude,    // lat
  userData.longitude,   // lon
  userData              // userData object (API data fetched automatically)
);
```

### Using the Prompt Function with Real API Data

```javascript
import { generateTableContentForReport } from './CosmicDMReport';

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
  // API data (kundli, sunrise, sunset, moon/sun signs) fetched automatically
});

if (result.success) {
  console.log("Table content generated with real API data:", result.data);
}
```

### Using Cached JSON Data

```javascript
import { generateReportFromJsonData } from './CosmicDMReport';

// Generate report from previously saved JSON data object
const jsonData = {
  timestamp: "2024-01-15T10:30:00.000Z",
  userData: { /* user data */ },
  apiData: { /* API responses */ }
};

const result = await generateReportFromJsonData(
  jsonData,       // JSON data object
  "John Doe",     // name
  "1990-01-15",   // dob
  "10:30 AM",     // time
  "New York, NY, USA" // place
);

if (result.success) {
  console.log("Report generated from JSON cache:", result.fileName);
}
```

### Complete Workflow with JSON Caching

```javascript
// Step 1: Generate report with API calls (automatically downloads JSON)
await generateAndDownloadFullCosmicReportWithTable(
  name, dob, time, place, lat, lon, userData
);
// JSON file is automatically downloaded to user's Downloads folder

// Step 2: Later, load the JSON file and generate report from cached data
const jsonData = JSON.parse(loadedJsonFileContent); // Load from downloaded file
await generateReportFromJsonData(
  jsonData, name, dob, time, place
);
```

## JSON File Structure

### Automatic JSON File Download
When APIs are called, the system automatically downloads JSON files to the user's Downloads folder with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userData": {
    "name": "John Doe",
    "sex": "Male",
    "dob": "1990-01-15",
    "time": "10:30 AM",
    "place": "New York",
    "state": "NY",
    "country": "USA",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "language": "en"
  },
  "apiData": {
    "kundliData": {
      "response": {
        "ascendant_sign": "Aries",
        "ascendant_nakshatra": "Bharani",
        "rasi": "Aries",
        "rasi_lord": "Mars",
        "nakshatra": "Bharani",
        "nakshatra_lord": "Venus",
        "nakshatra_pada": 1,
        "sun_sign": "Aries",
        "tithi": "Purnima",
        "karana": "Vishti",
        "yoga": "Siddhi",
        "gana": "Deva",
        "yoni": "Ashwa",
        "vasya": "Chatushpada",
        "nadi": "Adi",
        "varna": "Kshatriya",
        "paya": "Swarna",
        "tatva": "Agni",
        "life_stone": "Ruby",
        "lucky_stone": "Red Coral",
        "fortune_stone": "Diamond",
        "name_start": "A"
      },
      "ishta": "Mars"
    },
    "sunriseData": {
      "response": {
        "sun_rise": "06:30 AM"
      }
    },
    "sunsetData": {
      "response": {
        "sun_set": "06:30 PM"
      }
    },
    "moonSignData": {
      "response": {
        "moon_sign": "Cancer"
      }
    },
    "sunSignData": {
      "response": {
        "sun_sign": "Aries"
      }
    }
  }
}
```

### JSON File Naming Convention
Files are automatically downloaded with the pattern:
```
api-data-{name}-{timestamp}.json
```
Example: `api-data-John-Doe-2024-01-15T10-30-00-000Z.json`

**Note**: Files are downloaded to the user's default Downloads folder, not saved to the server.

## Data Structure Requirements

### User Data Object
```javascript
const userData = {
  name: "John Doe",
  sex: "Male",
  dob: "1990-01-15",
  day: "Monday",
  time: "10:30 AM",
  city: "New York",
  state: "NY",
  country: "USA",
  latitude: 40.7128,
  longitude: -74.0060
};
```

### Kundli Data Object
```javascript
const kundliData = {
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
};
```

## Customization Options

### Custom Table Title
You can modify the `title` parameter in `generateReusableTableContent()`:

```javascript
await generateReusableTableContent({
  // ... other parameters
  title: "BIRTH DETAILS", // Custom title instead of "AVAKAHADA CHAKRA"
  showUserInfo: true      // Show/hide user info section
});
```

### Styling Consistency
The component uses consistent styling:
- **Colors**: Golden-brown theme (#a16a21, #5e3a0b)
- **Background**: Cream color (#fffdf9)
- **Fonts**: Times font family
- **Layout**: Two-column table with decorative elements

## Integration Points

### 1. After Table of Contents
The table content is automatically inserted after the Table of Contents page in the enhanced report function.

### 2. Before Main Report Content
The table appears before the main AI-generated report content, providing essential birth details upfront.

### 3. Consistent Footer
All pages use the same footer design with TrustAstrology branding.

## Error Handling

The functions include comprehensive error handling:

```javascript
try {
  const result = await generateTableContentForReport({...});
  if (result.success) {
    // Handle success
  } else {
    console.error("Error:", result.error);
  }
} catch (error) {
  console.error("Unexpected error:", error);
}
```

## Benefits

1. **Consistency**: Same design across all pages
2. **Reusability**: Can be used in multiple reports
3. **Maintainability**: Single source of truth for table styling
4. **Flexibility**: Customizable titles and options
5. **Integration**: Seamless integration with existing report system
6. **JSON Caching Benefits**:
   - **Performance**: Faster report generation from cached data
   - **Offline Support**: Generate reports without internet connection
   - **Debugging**: Easy access to raw API responses
   - **Data Persistence**: API data saved for future use
   - **Cost Efficiency**: Reduce API calls by reusing cached data
   - **Development**: Test with real data without API calls

## Testing

Use the examples in `UsageExample.jsx` to test the integration:

```javascript
import { examples } from './UsageExample';

// Test basic functionality
await examples.generateReportWithTable();

// Test prompt function
await examples.generateTableContentData();

// Test integration
await examples.integrateWithExistingReport();
```

## Future Enhancements

1. **Multiple Table Types**: Support for different table layouts
2. **Dynamic Styling**: Theme-based color customization
3. **Internationalization**: Multi-language support
4. **Print Optimization**: Better print layout options
5. **Interactive Elements**: Clickable table elements

## Troubleshooting

### Common Issues

1. **Missing Data**: Ensure all required data objects are provided
2. **TypeScript Errors**: Check parameter types in function calls
3. **PDF Generation**: Verify jsPDF is properly imported
4. **Styling Issues**: Check color values and font availability

### Debug Mode

Enable debug logging by adding console.log statements in the component functions to trace execution flow.

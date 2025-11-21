"use client";
import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from "@mui/material";
import { generateAndDownloadFullCosmicReportWithTable } from "./CosmicDMReport_Fixed";
//import { fetchAllAstroData, AstroData } from "../server/fetchallastrodata";

interface UserData {
  name: string;
  sex: string;
  dob: string;
  time: string;
  place: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  language: string;
}

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' }, // Added English as a common default
  { code: 'be', name: 'Bengali' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ka', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ne', name: 'Nepali' },
  { code: 'gu', name: 'Gujarati' },
];

export default function AstroPDF() {
  const [dob, setDob] = useState("");
  const [time, setTime] = useState("");
  // Lat/Lon are only set via the useEffect hook based on location input
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [place, setPlace] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  // Initializing language state with the default code 'en'
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [fetchingCoords, setFetchingCoords] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error message

  // We are using a variable to hold the debounce timer ID globally 
  // for the component instance, managed by useEffect cleanup.
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Fetch lat/lon automatically when place/state/country changes
  useEffect(() => {
  // Only attempt geocoding if place and country are provided
  if (!place || !country) return;

  // Clear previous timer to debounce rapid typing
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    setFetchingCoords(true);
    setError(null); // Clear previous errors

    const query = encodeURIComponent(`${place}, ${state ? state + "," : ""} ${country}`);
    const apiKey = "d313f7d1f54e4023a077260f8cf86d57"; // replace with your own Geoapify API key
    const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${apiKey}`;

    try {
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      interface LocationItem {
        properties: {
          lat: number;
          lon: number;
          city?: string;
          country?: string;
        };
      }

      const results: LocationItem[] = data?.features || [];
      const result = results[0]?.properties;

      if (result) {
        setLat(result.lat.toString());
        setLon(result.lon.toString());
      } else {
        setLat("");
        setLon("");
        setError("Location not found. Please check the address or try again.");
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      setError("Network error while fetching coordinates. Please check your connection.");
      setLat("");
      setLon("");
    }

    setFetchingCoords(false);
  }, 1000); // 1 second debounce delay

  // Cleanup function
  return () => clearTimeout(debounceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [place, state, country]);
 // Dependencies for useEffect


  const handleGenerateReport = async () => {
  setError(null);

  // Validate input fields
  if (!dob || !time || !lat || !lon || !name || !sex || !place || !country || !language) {
    setError("Please fill in all required fields (including DOB, time, location, and language).");
    return;
  }

  setLoading(true);
  try {
    const userData = {
      name,
      sex,
      dob,
      time,
      place,
      state,
      country,
      latitude: Number(lat),
      longitude: Number(lon),
      language,
    };

//     const formatDateToDDMMYYYY = (isoDate: string): string => {
//   const [year, month, day] = isoDate.split("-");
//   return `${day}/${month}/${year}`;
// };

//     // ✅ STEP 1: Fetch all astrology data (JSON)
//     const formattedDOB = formatDateToDDMMYYYY(dob);

// const res = await fetch("/api/fetch-astro", {
//   method: "POST",
//   headers: { "Content-Type": "application/json" },
//   body: JSON.stringify({
//     name,
//     dob: formattedDOB, // ✅ formatted for VedicAstroAPI
//     time,
//     lat: Number(lat),
//     lon: Number(lon),
//   }),
// });

//     if (!res.ok) throw new Error("API failed to fetch astrology data.");

//     // ✅ Clone response so we can read it twice
//     const resClone = res.clone();

//     // 1️⃣ Save JSON file locally
//     const blob = await resClone.blob();
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "astro_data.json";
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     window.URL.revokeObjectURL(url);

//     // 2️⃣ Parse JSON for PDF generation
//     const allAstroData = await res.json();

//     console.log("✅ All Astrology Data:", allAstroData);

    // ✅ STEP 2: Generate the Cosmic PDF using that data
    await generateAndDownloadFullCosmicReportWithTable(
      name,
      dob,
      time,
      `${place}${state ? `, ${state}` : ""}, ${country}`,
      userData
    );

    setError("Report generated successfully with Avakahada Chakra table! Check your downloads.");
  } catch (err) {
    console.error("Report generation failed:", err);
    setError("Failed to generate report. Please check the console for details.");
  } finally {
    setLoading(false);
  }
};

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Custom vibrant gradient background
        background: "linear-gradient(to bottom right, #4c1d95, #9333ea, #ec4899)",
        py: 4
      }}
    >
      <Paper elevation={8} sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: '450px' }}>
        {/* Logo + Title */}
        <Box textAlign="center" mb={4}>
          <img src="/logo.png" alt="TrustAstrology Logo Placeholder" style={{ width: 80, height: 80, borderRadius: "50%", marginBottom: 8 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">TrustAstrology</Typography>
          <Typography variant="body2" color="text.secondary">Generate Your Cosmic Report</Typography>
        </Box>

        {/* Error Message Display */}
        {error && (
          <Alert severity={error.includes("successfully") ? "success" : "error"} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Personal Details */}
        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Personal Details</Typography>
          <TextField
            fullWidth
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            size="small"
          />
          <TextField
            fullWidth
            label="Sex (e.g., Male/Female)"
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            margin="dense"
            size="small"
          />
          <TextField
            fullWidth
            label="Place (City)"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            margin="dense"
            size="small"
          />
          <TextField
            fullWidth
            label="State/Region (Optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            margin="dense"
            size="small"
          />
          <TextField
            fullWidth
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            margin="dense"
            size="small"
            helperText={
              fetchingCoords ? "Fetching coordinates..." :
                (lat && lon ? `Coordinates fetched: Lat ${parseFloat(lat).toFixed(4)}, Lon ${parseFloat(lon).toFixed(4)}` : "Enter location to fetch coordinates")
            }
          />
        </Box>

        {/* Birth Details */}
        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Birth Details</Typography>
          <TextField
            fullWidth
            type="date"
            label="Date of Birth"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            margin="dense"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="time"
            label="Time of Birth"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            margin="dense"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Language Dropdown */}
        <Box mb={4}>
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel id="language-select-label">Report Language</InputLabel>
            <Select
              labelId="language-select-label"
              id="language-select"
              value={language}
              label="Report Language"
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Generate Button */}
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          sx={{
            py: 1.5,
            background: "linear-gradient(to right, #9333ea, #ec4899)",
            '&:hover': {
              background: "linear-gradient(to right, #ec4899, #9333ea)",
            }
          }}
          onClick={handleGenerateReport}
          disabled={loading || fetchingCoords}
        >
          {loading ? "Generating Report..." : (fetchingCoords ? "Wait: Fetching Location..." : "Generate Full Cosmic Report PDF")}
        </Button>
      </Paper>
    </Container>
  );
}
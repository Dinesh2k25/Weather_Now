import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import styles from "./App.module.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Weather condition icon map
const getWeatherIcon = (code) => {
  if ([0].includes(code)) return "☀️"; // Clear
  if ([1, 2].includes(code)) return "⛅"; // Partly cloudy
  if ([3].includes(code)) return "☁️"; // Cloudy
  if ([45, 48].includes(code)) return "🌫️"; // Fog
  if ([51, 61, 63, 80, 81].includes(code)) return "🌧️"; // Rain
  if ([71, 73, 75].includes(code)) return "❄️"; // Snow
  if ([95, 96, 99].includes(code)) return "⛈️"; // Thunderstorm
  return "❓";
};

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Fetch coordinates for the city
  const fetchCoordinates = async (cityName) => {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}`
    );
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    if (!data.results || data.results.length === 0)
      throw new Error("No results found");
    return { lat: data.results[0].latitude, lon: data.results[0].longitude };
  };

  // Fetch current + tomorrow forecast
  const fetchWeather = async (cityName) => {
    try {
      const { lat, lon } = await fetchCoordinates(cityName);
      setCoordinates({ lat, lon });

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
      );
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();
      setWeather(data.current_weather);
      setForecast({
        min: data.daily.temperature_2m_min[1],
        max: data.daily.temperature_2m_max[1],
        code: data.daily.weathercode[1],
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  // Autocomplete city search
  const handleInputChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        value
      )}`
    );
    const data = await res.json();
    if (data.results) {
      setSuggestions(data.results.slice(0, 5));
    }
  };

  const handleSelectCity = (name) => {
    setCity(name);
    setSuggestions([]);
    fetchWeather(name);
  };

  return (
    <div className={styles.app}>
      {/* HEADER */}
      <header className={styles.header}>
        <h1>🌤️ Weather Now</h1>
        <div className={styles.searchBox}>
          <input
            value={city}
            onChange={handleInputChange}
            placeholder="Enter city"
          />
          <button onClick={() => fetchWeather(city)}>Search</button>
          {suggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {suggestions.map((s) => (
                <li key={s.id} onClick={() => handleSelectCity(s.name)}>
                  {s.name}, {s.country}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {/* MAP */}
      <div className={styles.mapContainer}>
        {coordinates && (
          <MapContainer
            center={[coordinates.lat, coordinates.lon]}
            zoom={9}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            />
            <Marker position={[coordinates.lat, coordinates.lon]}>
              <Popup>{city}</Popup>
            </Marker>
          </MapContainer>
        )}
      </div>

      {/* WEATHER INFO */}
      {weather && (
        <footer className={styles.weatherCard}>
          <h2>
            {city} — {getWeatherIcon(weather.weathercode)}
          </h2>
          <div className={styles.weatherGrid}>
            <div className={styles.weatherItem}>
              <p className={styles.value}>{weather.temperature}°C</p>
              <p>Temperature</p>
            </div>
            <div className={styles.weatherItem}>
              <p className={styles.value}>{weather.windspeed} km/h</p>
              <p>Wind Speed</p>
            </div>
            <div className={styles.weatherItem}>
              <p className={styles.value}>{getWeatherIcon(forecast.code)}</p>
              <p>
                Tomorrow: {forecast.min}° / {forecast.max}°
              </p>
            </div>
          </div>
        </footer>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}
    </div>
  );
}

export default App;

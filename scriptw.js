const API_NOMINATIM = "https://nominatim.openstreetmap.org/search?format=json&q=";
const API_WEATHER = "https://api.open-meteo.com/v1/forecast";

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const tempEl = document.getElementById('temperature');
const descriptionEl = document.getElementById('weather-description');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind-speed');
const feelsLikeEl = document.getElementById('feels-like');
const forecastContainer = document.getElementById('forecast-container');
const weatherIconEl = document.getElementById('weather-icon');
const locBtn = document.getElementById('loc-btn');

// WMO Weather Codes to Descriptions and Icons
const weatherCodeMap = {
    0: { desc: "Clear Sky", icon: "sun" },
    1: { desc: "Mainly Clear", icon: "cloud-sun" },
    2: { desc: "Partly Cloudy", icon: "cloud" },
    3: { desc: "Overcast", icon: "cloud" },
    45: { desc: "Fog", icon: "cloud-fog" },
    48: { desc: "Depositing Rime Fog", icon: "cloud-fog" },
    51: { desc: "Light Drizzle", icon: "cloud-drizzle" },
    53: { desc: "Moderate Drizzle", icon: "cloud-drizzle" },
    55: { desc: "Dense Drizzle", icon: "cloud-drizzle" },
    61: { desc: "Slight Rain", icon: "cloud-rain" },
    63: { desc: "Moderate Rain", icon: "cloud-rain" },
    65: { desc: "Heavy Rain", icon: "cloud-rain" },
    71: { desc: "Slight Snow", icon: "cloud-snow" },
    73: { desc: "Moderate Snow", icon: "cloud-snow" },
    75: { desc: "Heavy Snow", icon: "cloud-snow" },
    95: { desc: "Thunderstorm", icon: "cloud-lightning" },
};

// Initial Load
window.addEventListener('load', () => {
    useLiveLocation();
    updateDate();
});

function useLiveLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.warn("Geolocation denied or failed, defaulting to Bengaluru:", error);
                fetchWeather("Bengaluru");
            }
        );
    } else {
        fetchWeather("Bengaluru");
    }
}

locBtn.addEventListener('click', useLiveLocation);

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.innerText = new Date().toLocaleDateString('en-US', options);
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

async function fetchWeather(city) {
    try {
        // 1. Get Coordinates
        const geoRes = await fetch(`${API_NOMINATIM}${encodeURIComponent(city)}`);
        const geoData = await geoRes.json();
        
        if (!geoData.length) {
            alert("City not found. Please try another.");
            return;
        }

        const { lat, lon, display_name } = geoData[0];
        const simpleName = display_name.split(',')[0];
        
        // 2. Get Weather Data
        const weatherRes = await fetch(`${API_WEATHER}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m&timezone=auto`);
        const weatherData = await weatherRes.json();

        updateUI(simpleName, weatherData);
    } catch (error) {
        console.error("Error fetching weather:", error);
        alert("Failed to fetch weather data.");
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        // 1. Get City Name via Reverse Geocoding
        const revGeoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const revGeoData = await revGeoRes.json();
        
        const address = revGeoData.address;
        const cityName = address.city || address.town || address.village || address.suburb || "Current Location";
        
        // 2. Get Weather Data
        const weatherRes = await fetch(`${API_WEATHER}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m&timezone=auto`);
        const weatherData = await weatherRes.json();

        updateUI(cityName, weatherData);
    } catch (error) {
        console.error("Error fetching weather by coords:", error);
        fetchWeather("Bengaluru");
    }
}

function updateUI(city, data) {
    const current = data.current_weather;
    const daily = data.daily;
    const hourly = data.hourly;

    // Update Current Weather
    cityNameEl.innerText = city;
    tempEl.innerText = Math.round(current.temperature);
    
    const condition = weatherCodeMap[current.weathercode] || { desc: "Unknown", icon: "cloud" };
    descriptionEl.innerText = condition.desc;
    
    // Update Icon
    weatherIconEl.setAttribute('data-lucide', condition.icon);
    
    // Update Details (using first hourly index as current approx)
    humidityEl.innerText = `${hourly.relativehumidity_2m[0]}%`;
    windEl.innerText = `${current.windspeed} km/h`;
    feelsLikeEl.innerText = `${Math.round(hourly.apparent_temperature[0])}°C`;

    // Update Forecast
    forecastContainer.innerHTML = '';
    for (let i = 1; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const forecastCond = weatherCodeMap[daily.weathercode[i]] || { desc: "Cloudy", icon: "cloud" };
        const maxTemp = Math.round(daily.temperature_2m_max[i]);

        const forecastHTML = `
            <div class="forecast-item glass fade-in" style="animation-delay: ${0.1 * i}s">
                <span class="forecast-day">${dayName}</span>
                <i data-lucide="${forecastCond.icon}"></i>
                <span class="forecast-temp">${maxTemp}°</span>
                <p class="forecast-desc">${forecastCond.desc}</p>
            </div>
        `;
        forecastContainer.insertAdjacentHTML('beforeend', forecastHTML);
    }

    // Reinitalize icons for new elements
    lucide.createIcons();
}
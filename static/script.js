/* DOM Elements -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
const themeIcon = document.getElementById("theme-icon");

const temperatureCelsius = document.getElementById("temperatureCelsius");
const temperatureFahrenheit = document.getElementById("temperatureFahrenheit");
const windSpeed = document.getElementById("windSpeed");
const humidity = document.getElementById("humidity");
const rainfall = document.getElementById("rainfall");
const atmosphericPressure = document.getElementById("atmosphericPressure");

const riskScore = document.getElementById("riskScore");
const comfortScore = document.getElementById("comfortScore");

const riskScoreElement = document.querySelector(".risk-score");
const riskClassification = document.getElementById("riskClassification");
const riskDot = document.getElementById("riskDot");

const veryHotProb = document.getElementById("veryHotProb");
const veryColdProb = document.getElementById("veryColdProb");
const veryWindyProb = document.getElementById("veryWindyProb");
const veryWetProb = document.getElementById("veryWetProb");
const veryUncomfortableProb = document.getElementById("veryUncomfortableProb");


/* Theme Toggle -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
const toggleTheme = () => {
    document.body.classList.toggle('light-mode');

    if (document.body.classList.contains("light-mode")) {
        themeIcon.classList.replace("fa-sun", "fa-moon");
    } else {
        themeIcon.classList.replace("fa-moon", "fa-sun");
    }
}

/* Grab recomms -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
async function loadRecommendations() {
    try {
        const response = await fetch('../static/recommendations.json');
        const data = await response.json();
        return data.weather_recommendations;
    } catch (error) {
         console.error('Error loading recommendations:', error);
            return [];
    }
}

function updateRecommendations(conditions) {
    const recommendationsList = document.querySelector('.card ul');
    recommendationsList.innerHTML = '';
                
    if (!conditions || conditions.length === 0) {
        recommendationsList.innerHTML = '<li>No recommendations available</li>';
        return;
    }
                        
    const allRecommendations = [];
    conditions.forEach(condition => {
        if (condition.recommendations) {
            allRecommendations.push(...condition.recommendations);
        }
    });
                                        
    const uniqueRecommendations = [...new Set(allRecommendations)].slice(0, 7);
    uniqueRecommendations.forEach(recommendation => {
        const li = document.createElement('li');
        li.textContent = recommendation;
        recommendationsList.appendChild(li);
    });
}

async function determineWeatherConditions(weatherData, riskData) {
    const recommendations = await loadRecommendations();
    const activeConditions = [];
                
    const tempC = weatherData["t_2m:C"];
    if (tempC > 30) {
        const veryHot = recommendations.find(r => r.weather_condition === "very_hot");
        if (veryHot) activeConditions.push(veryHot);
    } else if (tempC > 25) {
        const hot = recommendations.find(r => r.weather_condition === "hot");
        if (hot) activeConditions.push(hot);
    } else if (tempC < 0) {
        const veryCold = recommendations.find(r => r.weather_condition === "very_cold");
        if (veryCold) activeConditions.push(veryCold);
    } else if (tempC < 10) {
        const cold = recommendations.find(r => r.weather_condition === "cold");
        if (cold) activeConditions.push(cold);
    }
                                
    const rain = weatherData["precip_24h:mm"];
    if (rain > 10) {
        const rainCondition = recommendations.find(r => r.weather_condition === "rain");
        if (rainCondition) activeConditions.push(rainCondition);
    }
        
    const wind = weatherData["wind_speed_10m:ms"];
    if (wind > 7) {
        const windyCondition = recommendations.find(r => r.weather_condition === "windy");
        if (windyCondition) activeConditions.push(windyCondition);
    }
                                                                
    const humidity = weatherData["absolute_humidity_2m:gm3"];
    if (humidity > 15) {
        const humidCondition = recommendations.find(r => r.weather_condition === "humid");
        if (humidCondition) activeConditions.push(humidCondition);
    }
                                                                                
    if (rain < 1 && tempC > 15 && tempC < 28) {
        const sunnyCondition = recommendations.find(r => r.weather_condition === "sunny");
        if (sunnyCondition) activeConditions.push(sunnyCondition);
    }                                                                                            
    return activeConditions;
}

/* map -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
let map = L.map('map').setView([53.3489, -6.2430], 10);

L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=qp7uy5rCF4Ij9uDMupR6', {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
}).addTo(map);

let marker = L.marker([53.3489, -6.2430]).addTo(map);

/* Map interactions -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    marker.setLatLng([lat, lng]);
    // REMOVED: updateEverything();
});

function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchLocation();
    }
}

function searchLocation() {
    const location = document.getElementById('location-search').value.trim();
    if (!location) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                map.setView([lat, lon], 13);
                marker.setLatLng([lat, lon]);
            } else {
                alert('Location not found. Please try a different search term.');
            }
        })
        .catch(error => {
            console.error('Error searching location:', error);
            alert('Error searching for location. Please try again.');
        });
}

/* Sidebar scroll indicator -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
function initialiseScrollIndicator() {
    const sidebar = document.querySelector('.sidebar');
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    sidebar.appendChild(indicator);

    sidebar.addEventListener('scroll', function() {
        if (this.scrollTop > 10) {
            this.classList.add('scrolled');
        } else {
            this.classList.remove('scrolled');
        }
    });
}

/* Main scroll indicator -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
function initialiseMainScrollIndicator() {
    const dataPanel = document.querySelector('.data-scrollable');
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    dataPanel.appendChild(indicator);

    dataPanel.addEventListener('scroll', function() {
        
        if (this.scrollTop > 10) {
            this.classList.add('scrolled');
        } else {
            this.classList.remove('scrolled');
        }
    });
}

/* Date/time -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
function initialiseDateTime() {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    document.getElementById('eventDate').value = currentDate;
    document.getElementById('appt').value = currentTime;
    
    updateDateTimeDisplay();
}

function updateDateTimeDisplay() {
    const dateInput = document.getElementById('eventDate');
    const timeInput = document.getElementById('appt');
    const dateDisplay = document.getElementById('date-display');
    const timeDisplay = document.getElementById('time-display');
    
    if (dateInput.value) {
        const date = new Date(dateInput.value);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = date.toLocaleDateString('en-US', options);
    } else {
        dateDisplay.textContent = 'Day, Date';
    }
    
    if (timeInput.value) {
        const time = new Date('1970-01-01T' + timeInput.value);
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: false };
        timeDisplay.textContent = time.toLocaleTimeString('en-US', timeOptions).replace(' ', '');
    } else {
        timeDisplay.textContent = 'XX:XX';
    }
}

function updateEverything() {
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('appt').value;
    
    if (!date || !time) {
        alert('Please select both date and time.');
        return;
    }

    updateDateTimeDisplay();

    const markerLatLng = marker.getLatLng();
    const lat = markerLatLng.lat;
    const lng = markerLatLng.lng;

    Promise.race([
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`),
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
    ])
    .then(response => response.json())
    .then(data => {
        console.log('Reverse geocoding data:', data);
        
        let locationName = getBestLocationName(data, lat, lng);
        updateDisplayWithLocation(locationName);
        getResponse(lat, lng);
    })
    .catch(error => {
        console.error('Error getting location name:', error);
        updateDisplayWithLocation(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        getResponse(lat, lng);
    });

    getRiskScores(document.getElementById("eventDate").value, 
                document.getElementById("appt").value, 
                lat, 
                lng);
    
    getCurrentWeatherData(date, time, lat, lng);
    
    loadSunshineGraph(date, lat, lng);
    loadTemperatureGraph(date, lat, lng);
    loadWindGraph(date, lat, lng);
    loadRainfallGraph(date, lat, lng);
}

function getBestLocationName(data, lat, lng) {
    if (!data) return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    
    if (data.name && data.name !== data.display_name?.split(',')[0]) {
        return data.name;
    }
    
    if (data.display_name) {
        const parts = data.display_name.split(',');
        if (data.category === 'tourism' || data.type === 'attraction' || parts.length <= 3) {
            return parts.slice(0, 2).join(', ').trim();
        }
        return parts[0].trim();
    }
    
    if (data.address) {
        return data.address.venue || 
               data.address.attraction ||
               data.address.tourism ||
               data.address.building ||
               `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
    
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}

function updateDisplayWithLocation(locationName) {
    const dateDisplay = document.getElementById('date-display').textContent;
    const timeDisplay = document.getElementById('time-display').textContent;
    document.getElementById('location-display').innerHTML = 
        `${locationName}ㅤ//ㅤ<span id="date-display">${dateDisplay}</span>ㅤ//ㅤ<span id="time-display">${timeDisplay}</span>`;
}

/* Clouds -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
function createClouds() {
    const container = document.querySelector('.clouds');
    const maxWidth = window.innerWidth;

    for (let i = 0; i < 15; i++) {
        const cloud = document.createElement('div');
        cloud.classList.add('cloud');

        const width = Math.floor(Math.random() * (maxWidth / 3));
        const height = Math.floor(width / 2);
        cloud.style.width = `${width}px`;
        cloud.style.height = `${height}px`;

        const top = Math.floor(Math.random() * 80) + 10;
        cloud.style.top = `${top}%`;

        const left = Math.floor(Math.random() * 100);
        cloud.style.left = `-${left}%`;

        const duration = Math.floor(Math.random() * 20) + 20;
        const delay = Math.floor(Math.random() * -20);
        cloud.style.animation = `float ${duration}s infinite linear`;
        cloud.style.animationDelay = `${delay}s`;

        container.appendChild(cloud);
    }
}

/* Initialisation -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
document.addEventListener('DOMContentLoaded', function() {
    initialiseScrollIndicator();
    initialiseMainScrollIndicator();
    initialiseDateTime();
    createClouds();

    setTimeout(() => {
        updateEverything();
    }, 100);
});

/* Notes -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
const getResponse = (lat, lng) => {  //getReponse referenced but not defined
    /* Placeholder */
}

/* Fetching data from API */

async function getRiskScores(date, time, lat, lng) {
    const url = `/api/weather-prediction/${date}/${time}/${lat}/${lng}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        console.log(data.data);

        veryHotProb.innerText = data.data.very_hot
        veryColdProb.innerText = data.data.very_cold;
        veryWindyProb.innerText = data.data.very_windy;
        veryWetProb.innerText = data.data.very_wet;

        riskScore.innerText = data.data.risk_score;
        comfortScore.innerText = data.data.comfort_score;

        riskScoreElement.classList.remove('very-low-risk', 'low-risk', 'medium-risk', 'high-risk');

        let riskScoreValue = parseFloat(data.data.risk_score.replace('%', ''));

        if (riskScoreValue < 10) {
            riskScoreElement.classList.add('very-low-risk');
            riskClassification.innerText = 'Very Low Risk';
            riskDot.innerText = '🔵';
        } else if (riskScoreValue <= 35) {
            riskScoreElement.classList.add("low-risk");
            riskClassification.innerText = 'Low Risk';
            riskDot.innerText = '🟢';
        } else if (riskScoreValue < 75) {
            riskScoreElement.classList.add("medium-risk");
            riskClassification.innerText = 'Medium Risk';
            riskDot.innerText = '🟡';
        } else if (riskScoreValue <= 100) {
            riskScoreElement.classList.add("high-risk");
            riskClassification.innerText = 'High Risk';
            riskDot.innerText = '🔴';
        }

        const metrics = [
            { value: parseFloat(data.data.very_hot.replace('%', '')), element: document.getElementById("veryHot") },
            { value: parseFloat(data.data.very_cold.replace('%', '')), element: document.getElementById("veryCold") },
            { value: parseFloat(data.data.very_windy.replace('%', '')), element: document.getElementById("veryWindy") },
            { value: parseFloat(data.data.very_wet.replace('%', '')), element: document.getElementById("veryWet") },
        ];

        metrics.forEach(({ value, element }) => {
            if (!element) return;
            element.classList.remove('very-low-risk', 'low-risk', 'medium-risk', 'high-risk');
            
            if (value < 10) {
                element.classList.add('very-low-risk');
            } else if (value <= 35) {
                element.classList.add('low-risk');
            } else if (value < 75) {
                element.classList.add('medium-risk');
            } else if (value <= 100) {
                element.classList.add('high-risk');
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function getCurrentWeatherData(date, time, lat, lng) {
    const url = `/api/current-data/${date}/${time}/${lat}/${lng}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log("Current weather data:", data);

        const tempC = data["t_2m:C"];
        const wind = data["wind_speed_10m:ms"];
        const humidityVal = data["absolute_humidity_2m:gm3"];
        const rain = data["precip_24h:mm"];
        const pressure = data["msl_pressure:hPa"];

        temperatureCelsius.innerText = tempC.toFixed(1);
        temperatureFahrenheit.innerText = (tempC * 9/5 + 32).toFixed(1);
        windSpeed.innerText = wind.toFixed(1);
        humidity.innerText = humidityVal.toFixed(1);
        rainfall.innerText = rain.toFixed(1);
        atmosphericPressure.innerText = pressure.toFixed(1);

        const conditions = await determineWeatherConditions(data, null);
        updateRecommendations(conditions);

    } catch (error) {
        console.error("Error fetching current weather data:", error);
    }
}

async function loadRainfallGraph(date, lat, lng) {
    const response = await fetch(`/api/rainfall_chart/${date}/${lat}/${lng}`);
    const data = await response.json();

    const trace = {
        x: data.x,
        y: data.y,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#1f77b4', width: 2 },
        marker: { size: 5 }
    };

    const layout = {
        title: {
            text: 'Rainfall (mm)',
            font: { color: '#ffffff', size: 20 },
            xref: 'paper',
            x: 0.5
        },
        xaxis: { title: 'Time' },
        yaxis: { title: 'Rainfall (mm)' },
        margin: { t: 40, l: 50, r: 20, b: 40 },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ddd' }
    };

    Plotly.newPlot('rainfallGraph', [trace], layout, { displayModeBar: false, responsive: true });
}

async function loadTemperatureGraph(date, lat, lng) {
    const response = await fetch(`/api/temp-data/${date}/${lat}/${lng}`);
    const data = await response.json();

    const trace = {
        x: data.x,
        y: data.y,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: 'crimson', width: 2 },
        marker: { size: 5 }
    };

    const layout = {
        title: {
            text: 'Temperature (°C)',
            font: { color: '#ffffff', size: 20 },
            xref: 'paper',
            x: 0.5
        },
        xaxis: { title: 'Time' },
        yaxis: { title: 'Temperature (°C)' },
        margin: { t: 80, l: 50, r: 20, b: 40 },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ddd' }
    };

    Plotly.newPlot('temperatureGraph', [trace], layout, { displayModeBar: false, responsive: true });
}

async function loadSunshineGraph(date, lat, lng) {
    const response = await fetch(`/api/sunshine-data/${date}/${lat}/${lng}`);
    const data = await response.json();

    const trace = {
        x: data.x,
        y: data.y,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: 'orange', width: 2 },
        marker: { size: 5 }
    };

    const layout = {
        title: {
            text: 'Sunshine Duration (hours)',
            font: { color: '#ffffff', size: 20 },
            xref: 'paper',
            x: 0.5
        },
        xaxis: { title: 'Time' },
        yaxis: { title: 'Sunshine (h)' },
        margin: { t: 40, l: 50, r: 20, b: 40 },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ddd' }
    };

    Plotly.newPlot('sunshineGraph', [trace], layout, { displayModeBar: false, responsive: true });
}

async function loadWindGraph(date, lat, lng) {
    const response = await fetch(`/api/wind-data/${date}/${lat}/${lng}`);
    const data = await response.json();

    const trace = {
        x: data.x,
        y: data.y,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: 'grey', width: 2 },
        marker: { size: 5 }
    };

    const layout = {
        title: {
            text: 'Wind Speed (m/s)',
            font: { color: '#ffffff', size: 20 },
            xref: 'paper',
            x: 0.5
        },
        xaxis: { title: 'Time' },
        yaxis: { title: 'Wind Speed (m/s)' },
        margin: { t: 40, l: 50, r: 20, b: 40 },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ddd' }
    };

    Plotly.newPlot('windGraph', [trace], layout, { displayModeBar: false, responsive: true });
}

// random commewnt

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// Weather Context
const WeatherContext = createContext(null);

// Main App Component
const DotMatrixWeather = () => {
  const canvasRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  
  // Core state
  const [weather, setWeather] = useState({
    temp: 72,
    condition: 'clear',
    location: 'Loading...',
    country: '',
    humidity: 45,
    windSpeed: 8,
    hourly: [],
    nearby: []
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('current');
  const [unit, setUnit] = useState(() => localStorage.getItem('unit') || 'F');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [effects, setEffects] = useState(() => localStorage.getItem('effects') !== 'false');
  
  // Track mouse for bubble effect
  useEffect(() => {
    const handleMove = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  
  // Save preferences
  useEffect(() => {
    localStorage.setItem('unit', unit);
    localStorage.setItem('effects', effects);
  }, [unit, effects]);
  
  // Initialize and draw bubble background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const bubbleRadius = 80;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333333';
      
      for (let x = 0; x < canvas.width; x += 8) {
        for (let y = 0; y < canvas.height; y += 8) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let offsetX = 0, offsetY = 0;
          if (dist < bubbleRadius) {
            const factor = (bubbleRadius - dist) / bubbleRadius;
            const angle = Math.atan2(dy, dx);
            offsetX = Math.cos(angle) * factor * 4;
            offsetY = Math.sin(angle) * factor * 4;
          }
          
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
      }
      
      requestAnimationFrame(draw);
    };
    
    const animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [mouse]);
  
  // Get location and weather on load
  useEffect(() => {
    getLocationAndWeather();
  }, []);
  
  // Get user location and weather
  const getLocationAndWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          },
          async (err) => {
            console.warn("Geolocation error:", err);
            await getIPLocation();
          }
        );
      } else {
        await getIPLocation();
      }
    } catch (err) {
      setError("Failed to get location");
      setLoading(false);
    }
  };
  
  // Get location from IP
  const getIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('IP location unavailable');
      
      const data = await res.json();
      if (data.latitude && data.longitude) {
        await fetchWeather(data.latitude, data.longitude);
      } else if (data.city) {
        await searchCity(data.city);
      } else {
        throw new Error('Location unavailable');
      }
    } catch (err) {
      setError("Could not detect location");
      setLoading(false);
    }
  };
  
  // Fetch weather by coordinates
  const fetchWeather = async (lat, lon) => {
    try {
      // Fetch weather data
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m,relativehumidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=fahrenheit&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API error');
      const weatherData = await response.json();
      
      // Get location name
      const locData = await getLocationName(lat, lon);
      
      // Process data
      const currentTemp = Math.round(weatherData.current_weather.temperature);
      const condition = getCondition(weatherData.current_weather.weathercode);
      
      // Process hourly data
      const hourlyData = processHourlyData(weatherData);
      
      // Generate nearby locations
      const nearbyLocations = generateNearby(locData.city, currentTemp, condition);
      
      setWeather({
        temp: currentTemp,
        condition,
        location: locData.city,
        country: locData.country,
        humidity: weatherData.hourly.relativehumidity_2m[0],
        windSpeed: Math.round(weatherData.current_weather.windspeed),
        hourly: hourlyData,
        nearby: nearbyLocations
      });
      
      setLoading(false);
    } catch (err) {
      setError("Failed to get weather data");
      setLoading(false);
    }
  };
  
  // Process hourly data
  const processHourlyData = (data) => {
    const hourlyData = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i < 24; i++) {
      const index = data.hourly.time.findIndex(time => {
        const date = new Date(time);
        return date.getHours() === (currentHour + i) % 24 && 
               date.getDate() >= new Date().getDate();
      });
      
      if (index !== -1) {
        hourlyData.push({
          hour: (currentHour + i) % 24,
          temp: Math.round(data.hourly.temperature_2m[index]),
          condition: getCondition(data.hourly.weathercode[index]),
          precip: data.hourly.precipitation_probability[index],
          humidity: data.hourly.relativehumidity_2m[index]
        });
      }
    }
    
    return hourlyData;
  };
  
  // Get location name from coordinates
  const getLocationName = async (lat, lon) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DotMatrixWeather/1.0' }
      });
      
      if (!res.ok) throw new Error('Geocoding error');
      const data = await res.json();
      
      const city = data.address.city || 
                   data.address.town || 
                   data.address.village || 
                   data.address.county ||
                   'Unknown';
                   
      const country = data.address.country_code ? data.address.country_code.toUpperCase() : '';
      
      return { city, country };
    } catch (err) {
      return { city: 'Unknown', country: '' };
    }
  };
  
  // Search by city name
  const searchCity = async (city) => {
    try {
      // Get coordinates
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DotMatrixWeather/1.0' }
      });
      
      if (!res.ok) throw new Error('Geocoding error');
      const data = await res.json();
      
      if (data.length === 0) {
        throw new Error(`Could not find: ${city}`);
      }
      
      // Get first result
      const { lat, lon } = data[0];
      await fetchWeather(lat, lon);
      
    } catch (err) {
      setError(`Failed to find ${city}`);
      setLoading(false);
    }
  };
  
  // Handle search input with autocomplete
  const handleSearch = async (input) => {
    setSearch(input);
    
    if (input.trim().length > 2) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'DotMatrixWeather/1.0' }
        });
        
        if (!res.ok) throw new Error('Search error');
        const data = await res.json();
        
        const results = data.map(item => {
          const parts = item.display_name.split(', ');
          const display = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : item.display_name;
          
          return {
            name: display,
            lat: item.lat,
            lon: item.lon
          };
        });
        
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };
  
  // Handle search submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      searchCity(search);
      setSearch('');
      setSuggestions([]);
      setShowSearch(false);
    }
  };
  
  // Select suggestion
  const selectSuggestion = (item) => {
    setSearch('');
    setSuggestions([]);
    fetchWeather(item.lat, item.lon);
    setShowSearch(false);
  };
  
  // Convert temperature
  const convertTemp = (temp) => {
    return unit === 'C' ? Math.round((temp - 32) * 5 / 9) : temp;
  };
  
  // Map weather code to condition
  const getCondition = (code) => {
    if (code === 0) return 'clear';
    if ([1, 2, 3].includes(code)) return 'cloudy';
    if ([45, 48].includes(code)) return 'foggy';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
    if ([95, 96, 99].includes(code)) return 'thunderstorm';
    return 'clear';
  };
  
  // Generate nearby locations
  const generateNearby = (city, baseTemp, baseCondition) => {
    const prefixes = ['North', 'South', 'East', 'West'];
    const suffixes = ['Heights', 'Park', 'Valley', 'Hills'];
    const nearby = [];
    
    for (let i = 0; i < 4; i++) {
      let name;
      if (i % 2 === 0) {
        name = `${prefixes[i % 4]} ${city}`;
      } else {
        name = `${city} ${suffixes[i % 4]}`;
      }
      
      // Realistic variations
      const tempVar = Math.random() * 10 - 5;
      const temp = Math.round(baseTemp + tempVar);
      
      let condition = baseCondition;
      if (Math.random() > 0.7) {
        const conditions = ['clear', 'cloudy', 'rainy', 'snowy', 'foggy'];
        condition = conditions[Math.floor(Math.random() * conditions.length)];
      }
      
      nearby.push({
        name,
        temp,
        condition,
        distance: Math.round(Math.random() * 15) + 5,
        humidity: Math.round(Math.random() * 30 + 40)
      });
    }
    
    return nearby;
  };
  
  // Context value
  const contextValue = {
    weather,
    loading,
    error,
    unit,
    convertTemp,
    tab,
    setTab,
    effects,
    mouse
  };
  
  return (
    <WeatherContext.Provider value={contextValue}>
      <div className="flex flex-col h-screen bg-black p-4 items-center overflow-hidden">
        {/* Background */}
        <canvas ref={canvasRef} className="fixed inset-0 z-0" />
        
        {/* Effects */}
        {effects && !loading && <Effects condition={weather.condition} mouse={mouse} />}
        
        {/* Header */}
        <div className="z-10 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <MatrixText 
              text="MATRIX WEATHER" 
              size="lg" 
              onClick={getLocationAndWeather} 
              className="cursor-pointer hover:scale-105 transition-transform"
            />
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowSearch(!showSearch)} 
                className="p-2 border border-white hover:bg-gray-900"
              >
                <MatrixText text="SEARCH" size="sm" />
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="p-2 border border-white hover:bg-gray-900"
              >
                <MatrixText text="SETTINGS" size="sm" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          {showSearch && (
            <div className="mb-4 animate-fadeIn">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Enter city name..."
                    className="flex-grow p-2 bg-black border border-white text-white font-mono"
                    autoFocus
                  />
                  <button className="px-4 py-2 bg-gray-900 border border-white">
                    <MatrixText text="GO" size="sm" />
                  </button>
                </div>
                
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-black border border-white border-t-0 z-50">
                    {suggestions.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => selectSuggestion(item)}
                        className="block w-full text-left p-2 text-white hover:bg-gray-900 font-mono"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
        
        {/* Loading */}
        {loading && (
          <div className="flex-grow flex items-center justify-center z-10">
            <div className="text-center">
              <MatrixText text="LOCATING..." size="xl" className="animate-pulse" />
              <div className="mt-6 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-500"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error */}
        {error && !loading && (
          <div className="flex-grow flex items-center z-10">
            <div className="text-center">
              <MatrixText text="ERROR" size="xl" glow="error" />
              <div className="mt-4"><MatrixText text={error} /></div>
              <button 
                onClick={getLocationAndWeather}
                className="mt-6 px-4 py-2 border border-white hover:bg-gray-900"
              >
                <MatrixText text="RETRY" />
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        {!loading && !error && (
          <div className="z-10 w-full max-w-2xl flex-grow">
            {/* Tabs */}
            <div className="flex border-b border-white mb-4">
              <TabButton text="CURRENT" active={tab === 'current'} onClick={() => setTab('current')} />
              <TabButton text="HOURLY" active={tab === 'hourly'} onClick={() => setTab('hourly')} />
              <TabButton text="NEARBY" active={tab === 'nearby'} onClick={() => setTab('nearby')} />
              <TabButton text="MAP" active={tab === 'map'} onClick={() => setTab('map')} />
            </div>
            
            {/* Tab Content */}
            <div className="animate-fadeIn">
              {tab === 'current' && <CurrentWeather />}
              {tab === 'hourly' && <HourlyForecast />}
              {tab === 'nearby' && <NearbyLocations />}
              {tab === 'map' && <WeatherMap />}
            </div>
          </div>
        )}
        
        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal 
            unit={unit} 
            setUnit={setUnit} 
            effects={effects} 
            setEffects={setEffects} 
            onClose={() => setShowSettings(false)}
            refresh={getLocationAndWeather}
          />
        )}
        
        {/* Footer */}
        <div className="w-full max-w-2xl mt-4 mb-2 text-center z-10">
          <MatrixText text="MATRIX WEATHER v6.0" size="xs" />
        </div>
      </div>
    </WeatherContext.Provider>
  );
};

// Tab Button
const TabButton = ({ text, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 mr-2 transition-all ${
      active ? 'border-t border-l border-r border-white bg-gray-900' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    <MatrixText text={text} size="sm" glow={active ? "normal" : "dim"} />
  </button>
);

// Matrix Text
const MatrixText = ({ text, size = "md", glow = "normal", className = "", onClick = null }) => {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
    "2xl": "text-5xl"
  };
  
  const glowClasses = {
    normal: "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]",
    dim: "text-gray-600",
    error: "text-white drop-shadow-[0_0_4px_rgba(255,0,0,0.8)]"
  };
  
  return (
    <div 
      className={`font-mono ${sizeClasses[size]} ${glowClasses[glow]} dot-matrix ${className}`}
      onClick={onClick}
    >
      {text}
    </div>
  );
};

// Weather Effects
const Effects = ({ condition, mouse }) => {
  switch (condition) {
    case 'rainy': return <RainEffect mouse={mouse} />;
    case 'snowy': return <SnowEffect mouse={mouse} />;
    case 'clear': return <ClearEffect mouse={mouse} />;
    case 'cloudy': return <CloudEffect mouse={mouse} />;
    case 'thunderstorm': return <ThunderStormEffect mouse={mouse} />;
    case 'foggy': return <FogEffect mouse={mouse} />;
    default: return null;
  }
};

// Rain Effect
const RainEffect = ({ mouse }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 2}s`;
        const duration = `${Math.random() * 0.5 + 0.5}s`;
        
        // Calculate bubble effect
        const x = window.innerWidth * parseFloat(left) / 100;
        const dx = x - mouse.x;
        const dist = Math.abs(dx);
        const offsetX = dist < 100 ? (dx / 100) * 5 : 0;
        
        return (
          <div 
            key={i}
            className="absolute bg-gray-400 w-px h-3 opacity-50"
            style={{
              left,
              top: '-10px',
              transform: `translateX(${offsetX}px)`,
              animation: `fall ${duration} linear ${delay} infinite`
            }}
          ></div>
        );
      })}
    </div>
  );
};

// Snow Effect
const SnowEffect = ({ mouse }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 3}s`;
        const duration = `${Math.random() * 3 + 5}s`;
        const size = Math.random() * 3 + 1;
        
        // Calculate bubble effect
        const x = window.innerWidth * parseFloat(left) / 100;
        const dx = x - mouse.x;
        const dist = Math.abs(dx);
        const offsetX = dist < 100 ? (dx / 100) * 10 : 0;
        
        return (
          <div 
            key={i}
            className="absolute bg-gray-200 rounded-full opacity-70"
            style={{
              left,
              top: '-10px',
              width: `${size}px`,
              height: `${size}px`,
              transform: `translateX(${offsetX}px)`,
              animation: `snowfall ${duration} linear ${delay} infinite`
            }}
          ></div>
        );
      })}
    </div>
  );
};

// Clear Effect
const ClearEffect = ({ mouse }) => {
  // Calculate sun position
  const sunX = window.innerWidth * 0.8;
  const sunY = window.innerHeight * 0.2;
  const dx = sunX - mouse.x;
  const dy = sunY - mouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  let offsetX = 0, offsetY = 0;
  if (dist < 200) {
    const factor = (200 - dist) / 200;
    offsetX = dx * factor * 0.05;
    offsetY = dy * factor * 0.05;
  }
  
  return (
    <div 
      className="fixed top-12 right-12 z-0 pointer-events-none"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        transition: 'transform 0.3s ease-out'
      }}
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-gray-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute inset-2 bg-gray-300 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute inset-4 bg-gray-400 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute inset-6 bg-white rounded-full"></div>
      </div>
    </div>
  );
};

// Cloud Effect
const CloudEffect = ({ mouse }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {Array.from({ length: 3 }).map((_, i) => {
        const top = `${(Math.random() * 20) + 5}%`;
        const left = `${(Math.random() * 60) + 20}%`;
        const opacity = Math.random() * 0.3 + 0.1;
        
        // Calculate bubble effect
        const x = window.innerWidth * parseFloat(left) / 100;
        const y = window.innerHeight * parseFloat(top) / 100;
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let offsetX = 0, offsetY = 0;
        if (dist < 200) {
          const factor = (200 - dist) / 200;
          offsetX = dx * factor * 0.05;
          offsetY = dy * factor * 0.05;
        }
        
        return (
          <div 
            key={i}
            className="absolute bg-gray-400 w-20 h-12 rounded-full"
            style={{
              top,
              left,
              opacity,
              transform: `translate(${offsetX}px, ${offsetY}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          ></div>
        );
      })}
    </div>
  );
};

// Thunderstorm Effect
const ThunderStormEffect = ({ mouse }) => {
  const [flash, setFlash] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <RainEffect mouse={mouse} />
      {flash && <div className="absolute inset-0 bg-white opacity-20"></div>}
    </div>
  );
};

// Fog Effect
const FogEffect = ({ mouse }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {Array.from({ length: 3 }).map((_, i) => {
        const top = `${20 + i * 15}%`;
        const opacity = 0.1 + (i * 0.05);
        
        return (
          <div
            key={i}
            className="absolute left-0 right-0 h-12 bg-gray-400 opacity-20"
            style={{
              top,
              opacity,
              animation: 'fogMove 80s linear infinite alternate'
            }}
          ></div>
        );
      })}
    </div>
  );
};

// Current Weather
const CurrentWeather = () => {
  const { weather, unit, convertTemp } = useContext(WeatherContext);
  const [details, setDetails] = useState(false);
  
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <MatrixText text={`${weather.location.toUpperCase()}${weather.country ? ', ' + weather.country : ''}`} size="lg" />
      
      <div className="mt-6 mb-2">
        <MatrixText text={`${convertTemp(weather.temp)}°${unit}`} size="2xl" />
      </div>
      
      <div className="mb-4">
        <MatrixText text={weather.condition.toUpperCase()} size="lg" />
      </div>
      
      <button
        onClick={() => setDetails(!details)}
        className="my-2 px-4 py-1 border border-white hover:bg-gray-900"
      >
        <MatrixText text={details ? "HIDE DETAILS" : "SHOW DETAILS"} size="sm" />
      </button>
      
      {details && (
        <div className="w-full max-w-md grid grid-cols-2 gap-4 my-4 p-4 border border-white animate-fadeIn">
          <div className="text-center">
            <MatrixText text="HUMIDITY" size="sm" glow="dim" />
            <MatrixText text={`${weather.humidity}%`} />
          </div>
          <div className="text-center">
            <MatrixText text="WIND" size="sm" glow="dim" />
            <MatrixText text={`${weather.windSpeed} MPH`} />
          </div>
        </div>
      )}
      
      <div className="my-4 p-3 border border-white">
        <MatrixText text={getCurrentDate()} />
      </div>
    </div>
  );
};

// Hourly Forecast
const HourlyForecast = () => {
  const { weather, unit, convertTemp } = useContext(WeatherContext);
  const [selected, setSelected] = useState(null);
  const currentHour = new Date().getHours();
  
  return (
    <div>
      {selected && (
        <div className="mb-4 p-4 border border-white animate-fadeIn">
          <div className="flex justify-between items-center mb-3">
            <MatrixText text={`${selected.hour}:00`} />
            <button onClick={() => setSelected(null)}>
              <MatrixText text="×" size="lg" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MatrixText text="TEMPERATURE" size="xs" glow="dim" />
              <MatrixText text={`${convertTemp(selected.temp)}°${unit}`} />
            </div>
            <div>
              <MatrixText text="CONDITION" size="xs" glow="dim" />
              <MatrixText text={selected.condition.toUpperCase()} />
            </div>
            <div>
              <MatrixText text="PRECIPITATION" size="xs" glow="dim" />
              <MatrixText text={`${selected.precip}%`} />
            </div>
            <div>
              <MatrixText text="HUMIDITY" size="xs" glow="dim" />
              <MatrixText text={`${selected.humidity}%`} />
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-2 pb-2 min-w-max">
          {weather.hourly.map((hour, i) => (
            <button 
              key={i} 
              onClick={() => setSelected(hour === selected ? null : hour)}
              className={`flex flex-col items-center p-2 min-w-16 border ${
                hour.hour === currentHour 
                  ? 'border-white bg-gray-900' 
                  : hour === selected
                    ? 'border-white bg-gray-800'
                    : 'border-transparent hover:border-gray-600'
              }`}
            >
              <MatrixText text={`${hour.hour}:00`} size="sm" />
              <div className="my-2">
                <MatrixText text={`${convertTemp(hour.temp)}°`} />
              </div>
              <MatrixText text={hour.condition.toUpperCase()} size="xs" glow="dim" />
              <div className="mt-1">
                <MatrixText text={`${hour.precip}%`} size="xs" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Nearby Locations
const NearbyLocations = () => {
  const { weather, unit, convertTemp } = useContext(WeatherContext);
  const [selected, setSelected] = useState(null);
  
  return (
    <div>
      {selected && (
        <div className="mb-4 p-4 border border-white animate-fadeIn">
          <div className="flex justify-between items-center mb-3">
            <MatrixText text={selected.name.toUpperCase()} />
            <button onClick={() => setSelected(null)}>
              <MatrixText text="×" size="lg" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MatrixText text="TEMPERATURE" size="xs" glow="dim" />
              <MatrixText text={`${convertTemp(selected.temp)}°${unit}`} />
            </div>
            <div>
              <MatrixText text="CONDITION" size="xs" glow="dim" />
              <MatrixText text={selected.condition.toUpperCase()} />
            </div>
            <div>
              <MatrixText text="DISTANCE" size="xs" glow="dim" />
              <MatrixText text={`${selected.distance} MI`} />
            </div>
            <div>
              <MatrixText text="HUMIDITY" size="xs" glow="dim" />
              <MatrixText text={`${selected.humidity}%`} />
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {weather.nearby.map((loc, i) => (
          <button
            key={i} 
            className={`border text-left p-3 hover:bg-gray-900 ${
              selected === loc ? 'border-white bg-gray-800' : 'border-gray-700'
            }`}
            onClick={() => setSelected(loc === selected ? null : loc)}
          >
            <div className="flex justify-between items-center">
              <MatrixText text={loc.name.toUpperCase()} />
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-white mr-1"></div>
                <MatrixText text={`${loc.distance} MI`} size="xs" />
              </div>
            </div>
            
            <div className="mt-2 flex justify-between">
              <MatrixText text={`${convertTemp(loc.temp)}°${unit}`} size="lg" />
              <MatrixText text={loc.condition.toUpperCase()} size="sm" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Weather Map
const WeatherMap = () => {
  const { weather, mouse } = useContext(WeatherContext);
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dotSize = 1;
    const dotSpacing = 16 * zoom;
    
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const drawMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = mouse.x - rect.left;
      const mouseY = mouse.y - rect.top;
      
      // Draw dots
      ctx.fillStyle = '#444444';
      for (let x = 0; x < canvas.width; x += dotSpacing) {
        for (let y = 0; y < canvas.height; y += dotSpacing) {
          const dx = x - mouseX;
          const dy = y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let offsetX = 0, offsetY = 0;
          if (dist < 80) {
            const factor = (80 - dist) / 80;
            const angle = Math.atan2(dy, dx);
            offsetX = Math.cos(angle) * factor * 4;
            offsetY = Math.sin(angle) * factor * 4;
          }
          
          ctx.fillRect(x + offsetX, y + offsetY, dotSize, dotSize);
        }
      }
      
      // Draw center marker
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw radius
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Draw nearby locations
      weather.nearby.forEach((loc, i) => {
        const angle = i * (360 / weather.nearby.length) * (Math.PI / 180);
        const distance = loc.distance / 20 * zoom;
        const x = canvas.width / 2 + Math.cos(angle) * distance * 50;
        const y = canvas.height / 2 + Math.sin(angle) * distance * 50;
        
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      
      requestAnimationFrame(drawMap);
    };
    
    const animId = requestAnimationFrame(drawMap);
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mouse, zoom, weather.nearby]);
  
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <MatrixText text={`LOCATION: ${weather.location}`} />
        <div className="flex space-x-2">
          <button 
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="w-8 h-8 flex items-center justify-center border border-white hover:bg-gray-900"
            disabled={zoom <= 0.5}
          >
            <MatrixText text="-" />
          </button>
          <button 
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            className="w-8 h-8 flex items-center justify-center border border-white hover:bg-gray-900"
            disabled={zoom >= 2}
          >
            <MatrixText text="+" />
          </button>
        </div>
      </div>
      
      <div className="relative w-full h-64 border border-white overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 bg-black"
          style={{ width: '100%', height: '100%' }}
        ></canvas>
        
        <div className="absolute bottom-2 right-2 z-10">
          <MatrixText text={`ZOOM: ${zoom.toFixed(1)}x`} size="xs" glow="dim" />
        </div>
      </div>
    </div>
  );
};

// Settings Modal
const SettingsModal = ({ unit, setUnit, effects, setEffects, onClose, refresh }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 animate-fadeIn">
      <div className="bg-black border border-white p-4 w-64">
        <div className="flex justify-between items-center mb-4">
          <MatrixText text="SETTINGS" size="lg" />
          <button onClick={onClose}>
            <MatrixText text="X" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <MatrixText text="UNIT" size="sm" />
            <button
              onClick={() => setUnit(unit === 'F' ? 'C' : 'F')}
              className="px-3 py-1 border border-white hover:bg-gray-900"
            >
              <MatrixText text={`°${unit}`} size="sm" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <MatrixText text="EFFECTS" size="sm" />
            <button
              onClick={() => setEffects(!effects)}
              className={`px-3 py-1 border border-white hover:bg-gray-900 ${effects ? 'bg-gray-900' : ''}`}
            >
              <MatrixText text={effects ? "ON" : "OFF"} size="sm" />
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <button
              className="w-full py-2 border border-white hover:bg-gray-900"
              onClick={() => {
                refresh();
                onClose();
              }}
            >
              <MatrixText text="REFRESH DATA" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for date
function getCurrentDate() {
  const date = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options).toUpperCase();
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
@keyframes fall {
  0% { transform: translateY(0); }
  100% { transform: translateY(100vh); }
}

@keyframes snowfall {
  0% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(50vh) translateX(20px); }
  100% { transform: translateY(100vh) translateX(0); }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes fogMove {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

.delay-200 {
  animation-delay: 0.2s;
}

.delay-500 {
  animation-delay: 0.5s;
}

@keyframes pulse {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}

.dot-matrix {
  letter-spacing: 0.15em;
  text-shadow: 0 0 5px currentColor;
  font-variant-numeric: tabular-nums;
}
`;
document.head.appendChild(style);

export default DotMatrixWeather;

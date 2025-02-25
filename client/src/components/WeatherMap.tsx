
import { useState, useEffect, useRef } from 'react';
import { MatrixText } from './MatrixText';
import { Weather } from '@/types';

interface WeatherMapProps {
  weather: Weather;
  lat: number;
  lon: number;
}

export default function WeatherMap({ weather, lat, lon }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Generate city districts based on location
  useEffect(() => {
    if (weather && weather.location) {
      const seed = hashString(weather.location);
      const newDistricts = generateCityDistricts(seed, weather.nearby || []);
      setDistricts(newDistricts);
    }
  }, [weather]);

  // Handle mouse events for dragging
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - mapOffset.x,
        y: e.clientY - mapOffset.y
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
      
      if (isDragging) {
        setMapOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, mapOffset]);

  // Main drawing function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !districts.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2 + mapOffset.x;
      const centerY = canvas.height / 2 + mapOffset.y;
      
      // Draw background dot matrix
      drawDotMatrix(ctx, canvas.width, canvas.height, mouse, centerX, centerY);
      
      // Draw districts
      districts.forEach((district, index) => {
        const districtX = centerX + district.x * 50 * zoom;
        const districtY = centerY + district.y * 50 * zoom;
        
        if (
          districtX + 100 * zoom >= 0 &&
          districtX - 100 * zoom <= canvas.width &&
          districtY + 100 * zoom >= 0 &&
          districtY - 100 * zoom <= canvas.height
        ) {
          drawDistrict(
            ctx, 
            district, 
            districtX, 
            districtY, 
            zoom, 
            selectedDistrict === index,
            mouse
          );
        }
      });
      
      // Draw city center
      drawCityCenter(ctx, centerX, centerY, zoom);
      
      // Draw roads between districts
      drawRoads(ctx, districts, centerX, centerY, zoom);
      
      // Draw compass
      drawCompass(ctx, 20, 20);
      
      // Draw current location name
      drawLocationName(ctx, weather.location, canvas.width, canvas.height);
      
      requestAnimationFrame(drawMap);
    };

    const animId = requestAnimationFrame(drawMap);
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [districts, mouse, zoom, selectedDistrict, weather, mapOffset, isDragging]);

  // Check if mouse is over a district
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !districts.length) return;

    const getRelativeMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) return;
      
      const mousePos = getRelativeMousePos(e);
      const centerX = canvas.width / 2 + mapOffset.x;
      const centerY = canvas.height / 2 + mapOffset.y;
      
      let hoveredDistrict = null;
      
      districts.forEach((district, index) => {
        const districtX = centerX + district.x * 50 * zoom;
        const districtY = centerY + district.y * 50 * zoom;
        const size = district.size * 20 * zoom;
        
        if (
          mousePos.x >= districtX - size / 2 &&
          mousePos.x <= districtX + size / 2 &&
          mousePos.y >= districtY - size / 2 &&
          mousePos.y <= districtY + size / 2
        ) {
          hoveredDistrict = index;
        }
      });
      
      setSelectedDistrict(hoveredDistrict);
      
      canvas.style.cursor = hoveredDistrict !== null ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [districts, zoom, mapOffset, isDragging]);

  // Reset map view
  const resetMapView = () => {
    setMapOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <MatrixText text={`CITY MAP: ${weather.location}`} />
        <div className="flex space-x-2">
          <button 
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="w-8 h-8 flex items-center justify-center border border-white hover:bg-gray-900"
            disabled={zoom <= 0.5}
          >
            <MatrixText text="-" />
          </button>
          <button 
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="w-8 h-8 flex items-center justify-center border border-white hover:bg-gray-900"
            disabled={zoom >= 3}
          >
            <MatrixText text="+" />
          </button>
          <button 
            onClick={resetMapView}
            className="flex items-center justify-center px-2 border border-white hover:bg-gray-900"
          >
            <MatrixText text="RESET" size="xs" />
          </button>
        </div>
      </div>
      
      <div className="relative w-full h-64 border border-white overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 bg-black"
          style={{ width: '100%', height: '100%' }}
        />
        
        <div className="absolute bottom-2 right-2 z-10">
          <MatrixText text={`ZOOM: ${zoom.toFixed(1)}x`} size="xs" glow="dim" />
        </div>
        
        {selectedDistrict !== null && (
          <div className="absolute bottom-2 left-2 z-10 p-2 border border-white bg-black bg-opacity-70">
            <MatrixText 
              text={districts[selectedDistrict].name} 
              size="sm" 
            />
            <MatrixText 
              text={districts[selectedDistrict].info} 
              size="xs" 
              glow="dim" 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
};

const generateCityDistricts = (seed: number, nearbyLocations: any[] = []) => {
  const seededRandom = (min: number, max: number) => {
    const x = Math.sin(seed++) * 10000;
    const rand = x - Math.floor(x);
    return min + rand * (max - min);
  };
  
  const districtTypes = [
    { type: 'residential', names: ['Heights', 'Garden', 'Village', 'Homes', 'Quarter'] },
    { type: 'commercial', names: ['Downtown', 'Square', 'Center', 'Plaza', 'Market'] },
    { type: 'industrial', names: ['Works', 'Factory', 'Mill', 'Yard', 'Harbor'] },
    { type: 'entertainment', names: ['Park', 'Theater', 'Stadium', 'Gardens', 'Festival'] },
    { type: 'educational', names: ['Campus', 'Academy', 'Institute', 'College', 'Library'] }
  ];
  
  const directions = ['North', 'East', 'South', 'West', 'Upper', 'Lower', 'Central', 'Old', 'New'];
  
  const numDistricts = Math.floor(seededRandom(5, 10));
  const districts = [];
  
  if (nearbyLocations && nearbyLocations.length) {
    nearbyLocations.forEach((location, index) => {
      const angle = index * (360 / nearbyLocations.length) * (Math.PI / 180);
      const distance = location.distance / 20;
      
      districts.push({
        name: location.name,
        type: districtTypes[Math.floor(seededRandom(0, districtTypes.length))].type,
        size: seededRandom(1.5, 3),
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        weather: {
          temp: location.temp,
          condition: location.condition
        },
        info: `${location.distance} miles - ${location.temp}°`
      });
    });
  }
  
  while (districts.length < numDistricts) {
    const typeIndex = Math.floor(seededRandom(0, districtTypes.length));
    const districtType = districtTypes[typeIndex];
    const direction = directions[Math.floor(seededRandom(0, directions.length))];
    const nameIndex = Math.floor(seededRandom(0, districtType.names.length));
    const districtName = `${direction} ${districtType.names[nameIndex]}`;
    
    let x, y, overlapping;
    do {
      overlapping = false;
      const angle = seededRandom(0, Math.PI * 2);
      const distance = seededRandom(1, 5);
      x = Math.cos(angle) * distance;
      y = Math.sin(angle) * distance;
      
      for (const district of districts) {
        const dx = district.x - x;
        const dy = district.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) {
          overlapping = true;
          break;
        }
      }
    } while (overlapping);
    
    districts.push({
      name: districtName,
      type: districtType.type,
      size: seededRandom(1.5, 3),
      x,
      y,
      info: districtType.type.charAt(0).toUpperCase() + districtType.type.slice(1)
    });
  }
  
  return districts;
};

const drawDotMatrix = (ctx: CanvasRenderingContext2D, width: number, height: number, mouse: {x: number, y: number}, centerX: number, centerY: number) => {
  const dotSpacing = 12;
  const dotSize = 1;
  
  ctx.fillStyle = '#333333';
  
  const rect = ctx.canvas.getBoundingClientRect();
  const mouseX = mouse.x - rect.left;
  const mouseY = mouse.y - rect.top;
  
  const startX = Math.floor((0 - centerX) / dotSpacing) * dotSpacing;
  const startY = Math.floor((0 - centerY) / dotSpacing) * dotSpacing;
  const endX = startX + width + dotSpacing * 2;
  const endY = startY + height + dotSpacing * 2;
  
  for (let x = startX; x < endX; x += dotSpacing) {
    for (let y = startY; y < endY; y += dotSpacing) {
      const screenX = x + centerX;
      const screenY = y + centerY;
      
      if (screenX < -dotSpacing || screenX > width + dotSpacing ||
          screenY < -dotSpacing || screenY > height + dotSpacing) {
        continue;
      }
      
      const dx = screenX - mouseX;
      const dy = screenY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let offsetX = 0, offsetY = 0;
      if (dist < 80) {
        const factor = (80 - dist) / 80;
        const angle = Math.atan2(dy, dx);
        offsetX = Math.cos(angle) * factor * 4;
        offsetY = Math.sin(angle) * factor * 4;
      }
      
      ctx.fillRect(screenX + offsetX, screenY + offsetY, dotSize, dotSize);
    }
  }
};

const drawDistrict = (ctx: CanvasRenderingContext2D, district: any, x: number, y: number, zoom: number, isSelected: boolean, mouse: {x: number, y: number}) => {
  const size = district.size * 20 * zoom;
  
  ctx.save();
  
  const rect = ctx.canvas.getBoundingClientRect();
  const mouseX = mouse.x - rect.left;
  const mouseY = mouse.y - rect.top;
  const dx = x - mouseX;
  const dy = y - mouseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isHovered = dist < size;
  
  if (isSelected) {
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 10;
  }
  
  const patterns: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => void> = {
    residential: drawGridPattern,
    commercial: drawDensePattern,
    industrial: drawSparsePattern,
    entertainment: drawRadialPattern,
    educational: drawCrossPattern
  };
  
  (patterns[district.type] || drawDefaultPattern)(ctx, x, y, size, isSelected, isHovered);
  
  ctx.strokeStyle = isSelected ? 'white' : '#666666';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  
  if (district.weather && district.weather.condition) {
    drawWeatherIndicator(ctx, district.weather.condition, x + size / 2 - 10, y - size / 2 + 10, zoom);
  }
  
  ctx.restore();
};

const drawGridPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const cellSize = Math.max(4, size / 6);
  const opacity = isSelected ? 0.8 : 0.5;
  
  ctx.fillStyle = `rgba(100, 200, 255, ${opacity})`;
  
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(
          x - size / 2 + i * cellSize, 
          y - size / 2 + j * cellSize, 
          cellSize - 1, 
          cellSize - 1
        );
      }
    }
  }
};

const drawDensePattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const opacity = isSelected ? 0.8 : 0.5;
  ctx.fillStyle = `rgba(200, 180, 100, ${opacity})`;
  
  const numRects = 12;
  const rectSize = size / 6;
  
  for (let i = 0; i < numRects; i++) {
    const rx = x - size / 2 + Math.random() * size;
    const ry = y - size / 2 + Math.random() * size;
    const rw = Math.random() * rectSize + rectSize / 2;
    const rh = Math.random() * rectSize + rectSize / 2;
    
    ctx.fillRect(rx, ry, rw, rh);
  }
};

const drawSparsePattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const opacity = isSelected ? 0.8 : 0.5;
  ctx.fillStyle = `rgba(150, 150, 150, ${opacity})`;
  
  const numBlocks = 4;
  const blockSize = size / 3;
  
  for (let i = 0; i < numBlocks; i++) {
    const bx = x - size / 2 + Math.random() * (size - blockSize);
    const by = y - size / 2 + Math.random() * (size - blockSize);
    const bw = Math.random() * blockSize + blockSize / 2;
    const bh = Math.random() * blockSize + blockSize / 2;
    
    ctx.fillRect(bx, by, bw, bh);
  }
};

const drawRadialPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const opacity = isSelected ? 0.8 : 0.5;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
  
  gradient.addColorStop(0, `rgba(150, 255, 150, ${opacity})`);
  gradient.addColorStop(1, 'rgba(150, 255, 150, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = `rgba(100, 200, 100, ${opacity})`;
  const numCircles = 5;
  
  for (let i = 0; i < numCircles; i++) {
    const angle = i * (Math.PI * 2 / numCircles);
    const distance = size / 3;
    const cx = x + Math.cos(angle) * distance;
    const cy = y + Math.sin(angle) * distance;
    const radius = size / 10;
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawCrossPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const opacity = isSelected ? 0.8 : 0.5;
  ctx.fillStyle = `rgba(200, 100, 200, ${opacity})`;
  
  const crossWidth = size / 4;
  ctx.fillRect(x - size / 2, y - crossWidth / 2, size, crossWidth);
  ctx.fillRect(x - crossWidth / 2, y - size / 2, crossWidth, size);
};

const drawDefaultPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, isHovered: boolean) => {
  const opacity = isSelected ? 0.8 : 0.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x + size / 2, y);
  ctx.lineTo(x, y + size / 2);
  ctx.lineTo(x - size / 2, y);
  ctx.closePath();
  ctx.fill();
};

const drawWeatherIndicator = (ctx: CanvasRenderingContext2D, condition: string, x: number, y: number, zoom: number) => {
  const size = 8 * zoom;
  ctx.fillStyle = 'white';
  
  switch (condition.toLowerCase()) {
    case 'clear':
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'clouds':
      ctx.beginPath();
      ctx.arc(x - size / 3, y, size / 3, 0, Math.PI * 2);
      ctx.arc(x, y - size / 4, size / 3, 0, Math.PI * 2);
      ctx.arc(x + size / 3, y, size / 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rain':
      ctx.beginPath();
      ctx.arc(x, y - size / 4, size / 3, 0, Math.PI * 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x - size / 3, y + size / 2);
      ctx.lineTo(x + size / 3, y + size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'snow':
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x, y + size / 2);
      ctx.moveTo(x - size / 3, y - size / 3);
      ctx.lineTo(x + size / 3, y + size / 3);
      ctx.moveTo(x - size / 3, y + size / 3);
      ctx.lineTo(x + size / 3, y - size / 3);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = zoom;
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, size / 3, 0, Math.PI * 2);
      ctx.fill();
  }
};

const drawCityCenter = (ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) => {
  const size = 10 * zoom;
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, size / 3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 0.3 / i;
    ctx.beginPath();
    ctx.arc(x, y, size * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
  
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const drawRoads = (ctx: CanvasRenderingContext2D, districts: any[], centerX: number, centerY: number, zoom: number) => {
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 1;
  
  districts.forEach(district => {
    const x = centerX + district.x * 50 * zoom;
    const y = centerY + district.y * 50 * zoom;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  
  for (let i = 0; i < districts.length; i++) {
    for (let j = i + 1; j < districts.length; j++) {
      const dist1 = districts[i];
      const dist2 = districts[j];
      
      const dx = dist1.x - dist2.x;
      const dy = dist1.y - dist2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 3 && Math.random() > 0.5) {
        const x1 = centerX + dist1.x * 50 * zoom;
        const y1 = centerY + dist1.y * 50 * zoom;
        const x2 = centerX + dist2.x * 50 * zoom;
        const y2 = centerY + dist2.y * 50 * zoom;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
};

const drawCompass = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const size = 20;
  
  ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x, y - size / 4);
  
  ctx.moveTo(x + size / 2, y);
  ctx.lineTo(x + size / 4, y);
  
  ctx.moveTo(x, y + size / 2);
  ctx.lineTo(x, y + size / 4);
  
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x - size / 4, y);
  
  ctx.stroke();
  
  ctx.fillStyle = 'white';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText('N', x, y - size / 2 - 4);
  ctx.fillText('E', x + size / 2 + 4, y);
  ctx.fillText('S', x, y + size / 2 + 4);
  ctx.fillText('W', x - size / 2 - 4, y);
};

const drawLocationName = (ctx: CanvasRenderingContext2D, name: string, width: number, height: number) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(name.toUpperCase(), width / 2, height / 2);
};

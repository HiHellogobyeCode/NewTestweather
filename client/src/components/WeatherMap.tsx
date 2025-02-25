
import { useEffect, useRef, useState } from 'react';

interface WeatherMapProps {
  weather: any;
  location: { lat: number; lon: number } | null;
}

export default function WeatherMap({ weather, location }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('temp');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!weather || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    const drawMatrix = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const baseSpacing = 20;
      const spacing = baseSpacing * zoom;
      const cols = Math.ceil(canvas.width / spacing) + 1;
      const rows = Math.ceil(canvas.height / spacing) + 1;

      const offsetX = pan.x % spacing;
      const offsetY = pan.y % spacing;

      for (let y = -1; y < rows; y++) {
        for (let x = -1; x < cols; x++) {
          const xPos = x * spacing + offsetX;
          const yPos = y * spacing + offsetY;
          const distFromCenter = Math.sqrt(
            Math.pow((xPos - canvas.width/2), 2) + 
            Math.pow((yPos - canvas.height/2), 2)
          );

          const time = Date.now() / 1000;
          const windEffect = weather.current?.wind_speed 
            ? Math.sin(time + x * 0.2) * (weather.current.wind_speed / 10)
            : 0;

          let dotSize = Math.max(1, 4 * zoom);
          let dotColor;

          if (activeTab === 'temp') {
            const temp = weather.current?.temp || 0;
            const hue = Math.max(0, Math.min(240, (100 - temp) * 2.4));
            dotColor = `hsla(${hue}, 70%, 50%, ${0.7 - distFromCenter/1000})`;
            dotSize *= 1.5;
          } else if (activeTab === 'rain') {
            const rainIntensity = weather.current?.rain ? 0.8 : 0.2;
            const blue = Math.sin(time + x * 0.1 + y * 0.1) * 50 + 200;
            dotColor = `rgba(0, ${blue}, 255, ${rainIntensity})`;
          } else if (activeTab === 'wind') {
            const windSpeed = weather.current?.wind_speed || 0;
            const intensity = 0.3 + Math.sin(time + x * 0.1 + windEffect) * 0.2;
            dotColor = `rgba(200, 200, 200, ${intensity * (windSpeed/10)})`;
          }

          ctx.beginPath();
          ctx.arc(xPos, yPos, dotSize/2, 0, Math.PI * 2);
          ctx.fillStyle = dotColor || '#666';
          ctx.fill();
        }
      }

      // Draw city center marker
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, 8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      requestAnimationFrame(drawMatrix);
    };

    const animId = requestAnimationFrame(drawMatrix);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [weather, activeTab, zoom, pan, isDragging, lastPos]);

  return (
    <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button 
          className={`px-4 py-1 rounded ${activeTab === 'temp' ? 'bg-white text-black' : 'text-white'}`}
          onClick={() => setActiveTab('temp')}
        >
          TEMP
        </button>
        <button 
          className={`px-4 py-1 rounded ${activeTab === 'rain' ? 'bg-white text-black' : 'text-white'}`}
          onClick={() => setActiveTab('rain')}
        >
          RAIN
        </button>
        <button 
          className={`px-4 py-1 rounded ${activeTab === 'wind' ? 'bg-white text-black' : 'text-white'}`}
          onClick={() => setActiveTab('wind')}
        >
          WIND
        </button>
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button 
          className="px-2 py-1 text-white"
          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
        >
          -
        </button>
        <button 
          className="px-2 py-1 text-white"
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
        >
          +
        </button>
      </div>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
}

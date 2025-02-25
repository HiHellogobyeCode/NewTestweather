import { useEffect, useRef } from 'react';

export default function DotMatrixDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    // Track mouse position
    let mouseX = 0;
    let mouseY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Draw dot matrix
    const drawMatrix = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333333';
      
      const spacing = 8;
      const radius = 80;
      
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const dx = x - mouseX;
          const dy = y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let offsetX = 0, offsetY = 0;
          if (dist < radius) {
            const factor = (radius - dist) / radius;
            const angle = Math.atan2(dy, dx);
            offsetX = Math.cos(angle) * factor * 4;
            offsetY = Math.sin(angle) * factor * 4;
          }
          
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
      }
      
      requestAnimationFrame(drawMatrix);
    };
    
    const animId = requestAnimationFrame(drawMatrix);
    
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 bg-black"
    />
  );
}

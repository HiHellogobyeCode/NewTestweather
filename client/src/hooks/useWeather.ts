import { useQuery } from '@tanstack/react-query';

export function useWeather(lat?: number, lon?: number) {
  return useQuery({
    queryKey: ['/api/weather', lat, lon],
    queryFn: async () => {
      if (!lat || !lon) return null;
      
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('Failed to fetch weather');
      
      return res.json();
    },
    enabled: !!lat && !!lon
  });
}

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Location {
  display_name: string;
  lat: string;
  lon: string;
  importance: number;
  class: string;
  type: string;
}

interface LocationSearchProps {
  onSearch: (query: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function LocationSearch({ onSearch, onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchLocations = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=10&addressdetails=1`,
          { 
            headers: { 'User-Agent': 'DotMatrixWeather/1.0' }
          }
        );
        const data = await res.json();

        // Filter and sort by importance (which correlates with population for cities)
        const cityResults = data
          .filter((loc: Location) => loc.class === 'place' && ['city', 'town'].includes(loc.type))
          .sort((a: Location, b: Location) => b.importance - a.importance);

        setSuggestions(cityResults);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search US cities..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-gray-900/30 border-gray-700 text-gray-300 placeholder:text-gray-500 backdrop-blur-sm"
        />
        <Button 
          type="submit" 
          variant="outline" 
          size="icon" 
          disabled={isLoading}
          className="backdrop-blur-sm bg-gray-900/30 border-gray-700 hover:bg-gray-800/50"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {suggestions.length > 0 && (
        <Card className="absolute w-full mt-1 bg-black/40 border-gray-800 backdrop-blur-md z-50">
          <div className="p-2 space-y-1">
            {suggestions.map((loc, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800/50 rounded transition-colors"
                onClick={() => {
                  onLocationSelect(parseFloat(loc.lat), parseFloat(loc.lon));
                  setQuery(loc.display_name.split(',')[0]);
                  setSuggestions([]);
                }}
              >
                {loc.display_name}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
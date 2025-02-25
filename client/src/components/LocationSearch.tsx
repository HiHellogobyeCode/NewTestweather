
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import debounce from 'lodash/debounce';

interface Location {
  display_name: string;
  lat: string;
  lon: string;
  importance: number;
  class: string;
  type: string;
}

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = debounce(searchLocations, 300);

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query]);

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-black/40 border-gray-800 pr-10 focus:ring-1 focus:ring-gray-700"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>

      {suggestions.length > 0 && (
        <Card className="absolute w-full mt-1 bg-black/40 border-gray-800 backdrop-blur-md z-50 max-h-[300px] overflow-auto">
          <div className="p-2 space-y-1">
            {suggestions.map((loc, i) => {
              const mainName = loc.display_name.split(',')[0];
              const restName = loc.display_name.split(',').slice(1).join(',');
              
              return (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800/50 rounded transition-colors flex flex-col"
                  onClick={() => {
                    onLocationSelect(parseFloat(loc.lat), parseFloat(loc.lon));
                    setQuery(mainName);
                    setSuggestions([]);
                  }}
                >
                  <span className="text-gray-200">{mainName}</span>
                  <span className="text-gray-500 text-xs">{restName}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {isLoading && query && (
        <Card className="absolute w-full mt-1 bg-black/40 border-gray-800 backdrop-blur-md z-50">
          <div className="p-4 text-center text-sm text-gray-400">
            Searching...
          </div>
        </Card>
      )}
    </div>
  );
}

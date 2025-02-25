
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
        )}&countrycodes=us&limit=15&addressdetails=1&featuretype=city&featuretype=state`,
        { headers: { 'User-Agent': 'DotMatrixWeather/1.0' } }
      );
      const data = await response.json();
      
      // Process and enhance results
      const processedResults = data
        .filter((loc: any) => {
          // Keep cities, towns, and major administrative areas
          return (loc.type === 'city' || 
                  loc.type === 'town' || 
                  loc.type === 'administrative' ||
                  loc.class === 'place');
        })
        .map((loc: any) => {
          const address = loc.address || {};
          const state = address.state || '';
          const stateCode = getStateAbbreviation(state);
          
          // Calculate relevance score based on multiple factors
          const relevanceScore = 
            (loc.importance || 0) * 2 + // Base importance
            (address.city ? 0.5 : 0) +  // Bonus for cities
            (loc.class === 'place' ? 0.3 : 0) + // Bonus for places
            (address.population ? Math.log(address.population) / 10 : 0); // Population factor
            
          return {
            ...loc,
            relevanceScore,
            display_name: `${address.city || address.town || loc.display_name.split(',')[0]}, ${stateCode}`,
            state: stateCode
          };
        })
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
        
      setSuggestions(processedResults);

      function getStateAbbreviation(state: string): string {
        const stateMap: {[key: string]: string} = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
          'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
          'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
          'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
          'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
          'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
          'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
          'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
          'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
          'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
          'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        return stateMap[state] || state;
      }
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

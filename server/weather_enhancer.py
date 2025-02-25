
import numpy as np
import pandas as pd
import json
import os
from typing import Dict, Union, List, Tuple, Optional
from dataclasses import dataclass, field
import logging
from datetime import datetime, timedelta

@dataclass
class WeatherVariable:
    """Representation of a single weather variable with metadata."""
    name: str
    units: str
    data: np.ndarray
    confidence: np.ndarray = None
    enhancement_delta: np.ndarray = None

@dataclass
class WeatherData:
    """Container for weather data with location and time information."""
    variables: Dict[str, WeatherVariable]
    timestamps: List[datetime]
    latitude: float
    longitude: float
    radius_miles: float = 10.0
    metadata: Dict[str, any] = field(default_factory=dict)

class WeatherEnhancer:
    """ML-based weather data enhancement."""
    
    def __init__(
        self,
        time_window_days: int = 7,
        spatial_radius_miles: float = 10.0,
        variables: List[str] = None,
        precision: str = "float32",
        enable_physics_constraints: bool = True,
        confidence_threshold: float = 0.7,
        cache_dir: str = None
    ):
        self.time_window_days = time_window_days
        self.spatial_radius_miles = spatial_radius_miles
        self.enable_physics_constraints = enable_physics_constraints
        self.confidence_threshold = confidence_threshold
        self.cache_dir = cache_dir
        
        # Default variables to enhance
        self.variables = variables or [
            "temperature_2m",
            "precipitation",
            "mean_sea_level_pressure", 
            "wind_u_10m",
            "wind_v_10m",
            "relative_humidity",
            "cloud_cover"
        ]
        
        self.precision = np.float32 if precision == "float32" else np.float16
        
        # Initialize logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("WeatherEnhancer")
        
        # Initialize calibration parameters
        self._init_calibration()
        
        if self.cache_dir and not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
            
        self.logger.info(f"WeatherEnhancer initialized with window of {time_window_days} days")

    def _init_calibration(self):
        """Initialize bias correction parameters."""
        self.calibration = {
            "temperature_2m": {"bias": -0.2, "scale": 0.95},
            "precipitation": {"bias": 0.05, "scale": 1.1},
            "mean_sea_level_pressure": {"bias": 0, "scale": 1.0},
            "wind_u_10m": {"bias": 0, "scale": 0.9},
            "wind_v_10m": {"bias": 0, "scale": 0.9}
        }
        
        # Default calibration for other variables
        for var in self.variables:
            if var not in self.calibration:
                self.calibration[var] = {"bias": 0, "scale": 1.0}
                
    def enhance(self, weather_data: Union[WeatherData, Dict, str]) -> WeatherData:
        """Enhance weather forecast data."""
        # Convert input to WeatherData format
        data = self._standardize_input(weather_data)
        
        # Check cache
        cached = self._check_cache(data)
        if cached:
            return cached
            
        # Apply statistical enhancement
        enhanced = self._statistical_enhancement(data)
        
        # Apply physics constraints if enabled 
        if self.enable_physics_constraints:
            enhanced = self._apply_physics_constraints(enhanced, data)
            
        # Calculate confidence
        enhanced_with_confidence = self._calculate_confidence(enhanced, data)
        
        # Create enhanced WeatherData
        result = self._create_enhanced_weather_data(enhanced_with_confidence, data)
        
        # Cache result
        if self.cache_dir:
            self._cache_result(result)
            
        return result

    def _statistical_enhancement(self, data: WeatherData) -> Dict[str, np.ndarray]:
        """Apply statistical enhancements to weather data."""
        enhanced = {}
        
        for var_name, var in data.variables.items():
            if var_name not in self.variables:
                continue
                
            # Apply calibration
            bias = self.calibration[var_name]["bias"]
            scale = self.calibration[var_name]["scale"] 
            
            enhanced_data = var.data * scale + bias
            
            # Variable-specific adjustments
            if var_name == "temperature_2m":
                # Add diurnal pattern
                hours = np.array([t.hour for t in data.timestamps])
                diurnal = np.sin(2 * np.pi * hours / 24) 
                enhanced_data += diurnal
                
            elif var_name == "precipitation":
                # Increase precipitation slightly
                enhanced_data = enhanced_data * 1.1
                
            enhanced[var_name] = enhanced_data
            
        return enhanced

    def _apply_physics_constraints(self, enhanced: Dict[str, np.ndarray], original: WeatherData) -> Dict[str, np.ndarray]:
        """Apply physical constraints to ensure meteorological consistency."""
        constrained = enhanced.copy()
        
        # Non-negative precipitation
        if "precipitation" in constrained:
            constrained["precipitation"] = np.maximum(0, constrained["precipitation"])
            
        # Humidity 0-100%
        if "relative_humidity" in constrained:
            constrained["relative_humidity"] = np.clip(constrained["relative_humidity"], 0, 100)
            
        # Temperature-humidity relationship
        if "temperature_2m" in constrained and "relative_humidity" in constrained:
            temp_diff = constrained["temperature_2m"] - original.variables["temperature_2m"].data
            humidity_adj = -0.2 * temp_diff
            constrained["relative_humidity"] = np.clip(
                constrained["relative_humidity"] + humidity_adj, 
                0, 100
            )
            
        return constrained
        
    def _calculate_confidence(self, enhanced: Dict[str, np.ndarray], original: WeatherData) -> Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """Calculate confidence scores for enhanced variables."""
        confidences = {}
        
        for var_name, enhanced_data in enhanced.items():
            orig_data = original.variables[var_name].data
            
            # Calculate relative change
            delta = enhanced_data - orig_data
            rel_change = np.abs(delta) / (np.abs(orig_data) + 1e-6)
            
            # Base confidence reduced by relative change
            confidence = np.full_like(enhanced_data, 0.9)
            confidence -= rel_change * 0.3
            confidence = np.clip(confidence, 0.5, 0.95)
            
            confidences[var_name] = (enhanced_data, confidence, delta)
            
        return confidences
        
    def _standardize_input(self, data: Union[WeatherData, Dict, str]) -> WeatherData:
        """Convert input to WeatherData format."""
        if isinstance(data, WeatherData):
            return data
            
        # Convert dictionary
        variables = {}
        for var_name in self.variables:
            if var_name in data:
                var_data = np.array(data[var_name], dtype=self.precision)
                variables[var_name] = WeatherVariable(
                    name=var_name,
                    units="",
                    data=var_data
                )
                
        timestamps = [datetime.now() + timedelta(hours=i) for i in range(24)]
                
        return WeatherData(
            variables=variables,
            timestamps=timestamps,
            latitude=data.get("latitude", 0),
            longitude=data.get("longitude", 0)
        )

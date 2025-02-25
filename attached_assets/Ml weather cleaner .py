import numpy as np
import pandas as pd
import json
import os
from typing import Dict, Union, List, Tuple, Optional
from dataclasses import dataclass, field
import onnxruntime as ort
from datetime import datetime, timedelta
import logging

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
    """
    A model for enhancing weather forecasts using ML and physics-based constraints.
    
    This model takes raw weather forecast data and enhances it using a combination of:
    1. Machine learning inference using a GraphCast-inspired model
    2. Physics-based constraints for meteorological consistency
    3. Statistical bias correction based on historical performance
    
    The model works within a specified spatial and temporal window (default: 10 mile radius, 7 days).
    """
    
    def __init__(
        self, 
        model_path: str = None,
        time_window_days: int = 7,
        spatial_radius_miles: float = 10.0,
        variables: List[str] = None,
        precision: str = "float32",
        enable_physics_constraints: bool = True,
        confidence_threshold: float = 0.7,
        cache_dir: str = None
    ):
        """
        Initialize the WeatherEnhancer model.
        
        Args:
            model_path: Path to the ONNX model file. If None, uses a default lightweight model.
            time_window_days: Number of days to enhance forecasts for.
            spatial_radius_miles: Radius around the center point to consider.
            variables: List of variable names to enhance. If None, enhances all available variables.
            precision: Numerical precision for calculations ("float32" or "float16").
            enable_physics_constraints: Whether to apply physics-based constraints.
            confidence_threshold: Threshold below which to fall back to original data.
            cache_dir: Directory to cache enhanced forecasts.
        """
        self.time_window_days = time_window_days
        self.spatial_radius_miles = spatial_radius_miles
        self.enable_physics_constraints = enable_physics_constraints
        self.confidence_threshold = confidence_threshold
        self.cache_dir = cache_dir
        
        # Default variables to enhance if none specified
        self.variables = variables or [
            "temperature_2m", 
            "precipitation", 
            "mean_sea_level_pressure",
            "wind_u_10m",
            "wind_v_10m",
            "relative_humidity",
            "cloud_cover"
        ]
        
        # Configure precision
        self.precision = np.float32 if precision == "float32" else np.float16
        
        # Load the ML model
        self._load_model(model_path)
        
        # Initialize cache if needed
        if self.cache_dir and not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
        
        # Set up logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("WeatherEnhancer")
        
        self.logger.info(f"WeatherEnhancer initialized with window of {time_window_days} days")
    
    def _load_model(self, model_path: str) -> None:
        """Load the ONNX model for inference."""
        if model_path and os.path.exists(model_path):
            self.logger.info(f"Loading model from {model_path}")
            self.session = ort.InferenceSession(model_path)
        else:
            # If no model provided, use a simple fallback approach
            self.logger.warning(
                "No valid model path provided. Using statistical enhancement only."
            )
            self.session = None
        
        # Initialize calibration parameters
        self._init_calibration()
    
    def _init_calibration(self) -> None:
        """Initialize bias correction parameters based on historical performance."""
        # These would typically be learned from data, but for demonstration
        # we'll use some reasonable defaults
        self.calibration = {
            "temperature_2m": {
                "bias": -0.2,  # Models tend to overpredict temperature
                "scale": 0.95  # Reduce variance slightly
            },
            "precipitation": {
                "bias": 0.05,  # Models tend to underpredict light rain
                "scale": 1.1   # Increase variance slightly
            },
            "mean_sea_level_pressure": {
                "bias": 0,     # Usually well-predicted
                "scale": 1.0
            },
            "wind_u_10m": {
                "bias": 0,
                "scale": 0.9   # Models tend to overestimate wind
            },
            "wind_v_10m": {
                "bias": 0,
                "scale": 0.9   # Models tend to overestimate wind
            }
        }
        
        # Default calibration for other variables
        for var in self.variables:
            if var not in self.calibration:
                self.calibration[var] = {"bias": 0, "scale": 1.0}
    
    def enhance(self, weather_data: Union[WeatherData, Dict, str]) -> WeatherData:
        """
        Enhance the provided weather forecast data.
        
        Args:
            weather_data: Input weather data in one of several formats:
                - WeatherData object
                - Dictionary with weather variables
                - JSON string
                - Path to a JSON or CSV file
        
        Returns:
            Enhanced WeatherData object with improved forecasts and confidence metrics
        """
        # Convert input to standardized WeatherData format
        data = self._standardize_input(weather_data)
        
        # Check cache for this location and time range
        cached_result = self._check_cache(data)
        if cached_result is not None:
            return cached_result
        
        # Preprocess the data for the model
        model_input = self._preprocess(data)
        
        # Run ML inference if model is available
        if self.session is not None:
            raw_enhanced = self._run_inference(model_input)
        else:
            # Use statistical enhancement if no model available
            raw_enhanced = self._statistical_enhancement(model_input)
        
        # Apply physics-based constraints if enabled
        if self.enable_physics_constraints:
            constrained_enhanced = self._apply_physics_constraints(raw_enhanced, data)
        else:
            constrained_enhanced = raw_enhanced
        
        # Apply bias correction based on calibration
        corrected_enhanced = self._apply_bias_correction(constrained_enhanced)
        
        # Calculate confidence metrics
        enhanced_with_confidence = self._calculate_confidence(corrected_enhanced, data)
        
        # Convert back to WeatherData format
        result = self._create_enhanced_weather_data(enhanced_with_confidence, data)
        
        # Cache the result if caching is enabled
        if self.cache_dir:
            self._cache_result(result)
        
        return result
    
    def _standardize_input(self, input_data: Union[WeatherData, Dict, str]) -> WeatherData:
        """Convert various input formats to standardized WeatherData object."""
        if isinstance(input_data, WeatherData):
            return input_data
        
        if isinstance(input_data, str):
            # Check if it's a file path
            if os.path.exists(input_data):
                if input_data.endswith('.json'):
                    with open(input_data, 'r') as f:
                        input_data = json.load(f)
                elif input_data.endswith('.csv'):
                    input_data = pd.read_csv(input_data).to_dict()
                else:
                    raise ValueError(f"Unsupported file format: {input_data}")
            else:
                # Assume it's a JSON string
                try:
                    input_data = json.loads(input_data)
                except json.JSONDecodeError:
                    raise ValueError("Invalid JSON string provided")
        
        # Now input_data should be a dictionary
        if not isinstance(input_data, dict):
            raise ValueError("Input data must be a WeatherData object, dictionary, file path, or JSON string")
        
        # Convert dictionary to WeatherData
        try:
            # Extract essential metadata
            latitude = input_data.get('latitude', input_data.get('lat', 0.0))
            longitude = input_data.get('longitude', input_data.get('lon', 0.0))
            
            # Parse timestamps
            if 'timestamps' in input_data:
                timestamps = [
                    datetime.fromisoformat(ts) if isinstance(ts, str) else ts 
                    for ts in input_data['timestamps']
                ]
            elif 'time' in input_data:
                timestamps = [
                    datetime.fromisoformat(ts) if isinstance(ts, str) else ts 
                    for ts in input_data['time']
                ]
            else:
                # Generate timestamps for the next 7 days if not provided
                start_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                timestamps = [start_time + timedelta(days=i) for i in range(self.time_window_days)]
            
            # Extract variables
            variables = {}
            for var_name in self.variables:
                if var_name in input_data:
                    var_data = input_data[var_name]
                    if isinstance(var_data, list):
                        var_data = np.array(var_data, dtype=self.precision)
                    elif isinstance(var_data, dict) and 'data' in var_data:
                        var_data = np.array(var_data['data'], dtype=self.precision)
                    
                    variables[var_name] = WeatherVariable(
                        name=var_name,
                        units=input_data.get(f"{var_name}_units", ""),
                        data=var_data
                    )
            
            return WeatherData(
                variables=variables,
                timestamps=timestamps,
                latitude=latitude,
                longitude=longitude,
                radius_miles=self.spatial_radius_miles,
                metadata={k: v for k, v in input_data.items() if k not in variables and k not in ('latitude', 'longitude', 'timestamps', 'time')}
            )
            
        except Exception as e:
            raise ValueError(f"Failed to convert input to WeatherData: {str(e)}")
    
    def _check_cache(self, data: WeatherData) -> Optional[WeatherData]:
        """Check if we have a cached result for this location and time range."""
        if not self.cache_dir:
            return None
        
        # Create a cache key based on location, time range, and data hash
        cache_key = f"{data.latitude:.2f}_{data.longitude:.2f}_{data.timestamps[0].isoformat()}"
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                
                # Check if cache is still valid (not older than 6 hours)
                cache_time = datetime.fromisoformat(cached_data.get('cache_time', '2000-01-01'))
                if datetime.now() - cache_time < timedelta(hours=6):
                    self.logger.info(f"Using cached result from {cache_time}")
                    return self._standardize_input(cached_data)
            except Exception as e:
                self.logger.warning(f"Failed to load cache: {str(e)}")
        
        return None
    
    def _cache_result(self, result: WeatherData) -> None:
        """Cache the enhanced result."""
        if not self.cache_dir:
            return
        
        try:
            # Create a serializable version of the result
            serializable = {
                'latitude': result.latitude,
                'longitude': result.longitude,
                'timestamps': [ts.isoformat() for ts in result.timestamps],
                'cache_time': datetime.now().isoformat(),
                'radius_miles': result.radius_miles,
                'metadata': result.metadata
            }
            
            # Add variables
            for var_name, var in result.variables.items():
                serializable[var_name] = {
                    'data': var.data.tolist(),
                    'units': var.units,
                    'confidence': var.confidence.tolist() if var.confidence is not None else None,
                    'enhancement_delta': var.enhancement_delta.tolist() if var.enhancement_delta is not None else None
                }
            
            # Write to cache file
            cache_key = f"{result.latitude:.2f}_{result.longitude:.2f}_{result.timestamps[0].isoformat()}"
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            
            with open(cache_file, 'w') as f:
                json.dump(serializable, f)
                
            self.logger.info(f"Cached result to {cache_file}")
            
        except Exception as e:
            self.logger.warning(f"Failed to cache result: {str(e)}")
    
    def _preprocess(self, data: WeatherData) -> Dict[str, np.ndarray]:
        """Preprocess the data for the model."""
        processed = {}
        
        # Extract and normalize each variable
        for var_name, var in data.variables.items():
            if var_name in self.variables:
                # Apply variable-specific preprocessing
                if var_name == 'temperature_2m':
                    # Normalize temperature to [-1, 1] range assuming -50C to +50C range
                    processed[var_name] = (var.data - 273.15) / 50.0  # Assuming Kelvin input
                elif var_name == 'precipitation':
                    # Log transform for precipitation (add small epsilon to avoid log(0))
                    processed[var_name] = np.log1p(var.data) / 5.0
                elif var_name == 'mean_sea_level_pressure':
                    # Normalize around standard pressure
                    processed[var_name] = (var.data - 101325) / 5000
                else:
                    # Generic normalization assuming data is already in appropriate units
                    processed[var_name] = var.data / self._get_normalization_factor(var_name)
        
        # Add time encoding (cyclical encoding of hour of day, day of year)
        time_features = self._encode_time(data.timestamps)
        processed.update(time_features)
        
        # Add location encoding
        processed['latitude'] = np.full(len(data.timestamps), data.latitude) / 90.0  # Normalize to [-1, 1]
        processed['longitude'] = np.full(len(data.timestamps), data.longitude) / 180.0  # Normalize to [-1, 1]
        
        return processed
    
    def _get_normalization_factor(self, var_name: str) -> float:
        """Get appropriate normalization factor for each variable."""
        normalization_factors = {
            'wind_u_10m': 30.0,  # Typical max wind speed in m/s
            'wind_v_10m': 30.0,
            'relative_humidity': 100.0,  # 0-100%
            'cloud_cover': 100.0,  # 0-100%
            'temperature_2m': 50.0,  # Default for temp in C
            'precipitation': 5.0,  # Default for log-transformed precip
            'mean_sea_level_pressure': 5000.0  # Default pressure deviation
        }
        
        return normalization_factors.get(var_name, 1.0)
    
    def _encode_time(self, timestamps: List[datetime]) -> Dict[str, np.ndarray]:
        """Create cyclical time encodings."""
        hour_sin = np.array([np.sin(2 * np.pi * ts.hour / 24) for ts in timestamps])
        hour_cos = np.array([np.cos(2 * np.pi * ts.hour / 24) for ts in timestamps])
        
        day_of_year = np.array([(ts.timetuple().tm_yday - 1) / 365 for ts in timestamps])
        day_sin = np.sin(2 * np.pi * day_of_year)
        day_cos = np.cos(2 * np.pi * day_of_year)
        
        return {
            'hour_sin': hour_sin,
            'hour_cos': hour_cos,
            'day_sin': day_sin,
            'day_cos': day_cos
        }
    
    def _run_inference(self, model_input: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Run inference using the ML model."""
        try:
            # Prepare input in the format expected by the model
            input_names = self.session.get_inputs()[0].name
            output_names = [output.name for output in self.session.get_outputs()]
            
            # Stack all inputs into a single array
            stacked_input = np.stack([model_input[var] for var in self.variables], axis=1)
            
            # Run inference
            outputs = self.session.run(output_names, {input_names: stacked_input})
            
            # Process outputs
            result = {}
            for i, var_name in enumerate(self.variables):
                # Denormalize output
                normalization_factor = self._get_normalization_factor(var_name)
                
                # Inverse transform if needed
                if var_name == 'precipitation':
                    # Inverse of log transform
                    result[var_name] = np.expm1(outputs[0][:, i] * 5.0)
                elif var_name == 'temperature_2m':
                    # Inverse of temperature normalization
                    result[var_name] = outputs[0][:, i] * 50.0 + 273.15
                elif var_name == 'mean_sea_level_pressure':
                    # Inverse of pressure normalization
                    result[var_name] = outputs[0][:, i] * 5000 + 101325
                else:
                    # Generic denormalization
                    result[var_name] = outputs[0][:, i] * normalization_factor
            
            return result
            
        except Exception as e:
            self.logger.error(f"Inference failed: {str(e)}")
            # Fallback to statistical enhancement
            return self._statistical_enhancement(model_input)
    
    def _statistical_enhancement(self, model_input: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Apply statistical enhancement when ML model is not available."""
        result = {}
        
        # Apply simple statistical adjustments to each variable
        for var_name in self.variables:
            if var_name not in model_input:
                continue
                
            orig_data = model_input[var_name] * self._get_normalization_factor(var_name)
            
            # Apply variable-specific statistical corrections
            if var_name == 'temperature_2m':
                # Temperature tends to have diurnal patterns
                hour_sin = model_input['hour_sin']
                # Add a small hourly adjustment
                result[var_name] = orig_data + hour_sin * 1.0
            elif var_name == 'precipitation':
                # Precipitation tends to be under-predicted
                # Apply a small increase to precipitation values > 0
                result[var_name] = orig_data * 1.1
            elif var_name == 'wind_u_10m' or var_name == 'wind_v_10m':
                # Wind tends to be over-predicted
                result[var_name] = orig_data * 0.9
            else:
                # Default: no change
                result[var_name] = orig_data
        
        return result
    
    def _apply_physics_constraints(self, enhanced: Dict[str, np.ndarray], original: WeatherData) -> Dict[str, np.ndarray]:
        """Apply physics-based constraints to ensure meteorological consistency."""
        constrained = enhanced.copy()
        
        # Get original values for comparison
        original_values = {
            var_name: var.data for var_name, var in original.variables.items()
            if var_name in self.variables
        }
        
        # Apply constraints
        
        # 1. Ensure non-negative precipitation
        if 'precipitation' in constrained:
            constrained['precipitation'] = np.maximum(0, constrained['precipitation'])
        
        # 2. Ensure humidity between 0-100%
        if 'relative_humidity' in constrained:
            constrained['relative_humidity'] = np.clip(constrained['relative_humidity'], 0, 100)
        
        # 3. Ensure cloud cover between 0-100%
        if 'cloud_cover' in constrained:
            constrained['cloud_cover'] = np.clip(constrained['cloud_cover'], 0, 100)
        
        # 4. Enforce relationship between temperature and humidity
        if 'temperature_2m' in constrained and 'relative_humidity' in constrained:
            # Simple constraint: humidity should generally decrease when temperature increases
            # compared to original values
            temp_diff = constrained['temperature_2m'] - original_values.get('temperature_2m', constrained['temperature_2m'])
            humidity_adjustment = -0.2 * temp_diff  # Small adjustment factor
            
            if 'relative_humidity' in original_values:
                # Apply adjustment but ensure we stay within 0-100%
                new_humidity = original_values['relative_humidity'] + humidity_adjustment
                constrained['relative_humidity'] = np.clip(new_humidity, 0, 100)
        
        # 5. Consistency between precipitation and cloud cover
        if 'precipitation' in constrained and 'cloud_cover' in constrained:
            # If precipitation is significant, cloud cover should be high
            high_precip_mask = constrained['precipitation'] > 1.0  # 1mm/hr threshold
            if np.any(high_precip_mask):
                # Ensure cloud cover is at least 70% when precipitation is significant
                constrained['cloud_cover'][high_precip_mask] = np.maximum(
                    constrained['cloud_cover'][high_precip_mask], 70
                )
        
        # 6. Limit extreme changes to ensure forecast stability
        for var_name in constrained:
            if var_name in original_values:
                # Calculate maximum allowed change (as % of value range)
                max_change_factor = 0.3  # Allow up to 30% change
                
                # Different handling for different variables
                if var_name == 'temperature_2m':
                    # For temperature, limit absolute change to 5 degrees
                    max_abs_change = 5.0
                    changes = constrained[var_name] - original_values[var_name]
                    limited_changes = np.clip(changes, -max_abs_change, max_abs_change)
                    constrained[var_name] = original_values[var_name] + limited_changes
                    
                elif var_name == 'mean_sea_level_pressure':
                    # For pressure, limit absolute change to 500 Pa
                    max_abs_change = 500.0
                    changes = constrained[var_name] - original_values[var_name]
                    limited_changes = np.clip(changes, -max_abs_change, max_abs_change)
                    constrained[var_name] = original_values[var_name] + limited_changes
                    
                else:
                    # For other variables, limit relative change
                    var_range = np.max(original_values[var_name]) - np.min(original_values[var_name])
                    if var_range > 0:
                        max_change = var_range * max_change_factor
                        changes = constrained[var_name] - original_values[var_name]
                        limited_changes = np.clip(changes, -max_change, max_change)
                        constrained[var_name] = original_values[var_name] + limited_changes
        
        return constrained
    
    def _apply_bias_correction(self, data: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Apply bias correction based on calibration parameters."""
        corrected = {}
        
        for var_name, var_data in data.items():
            if var_name in self.calibration:
                # Apply bias and scale correction
                bias = self.calibration[var_name]['bias']
                scale = self.calibration[var_name]['scale']
                
                # Center, scale, then re-center
                mean_value = np.mean(var_data)
                corrected[var_name] = (var_data - mean_value) * scale + mean_value + bias
            else:
                corrected[var_name] = var_data
        
        return corrected
    
    def _calculate_confidence(
        self, 
        enhanced: Dict[str, np.ndarray], 
        original: WeatherData
    ) -> Dict[str, Tuple[np.ndarray, np.ndarray]]:
        """
        Calculate confidence scores and deltas for each variable.
        
        Returns dict with tuple values: (enhanced_data, confidence)
        """
        result = {}
        
        # Get original values
        original_values = {
            var_name: var.data for var_name, var in original.variables.items()
            if var_name in enhanced
        }
        
        # Default confidence parameters by variable type
        confidence_params = {
            'temperature_2m': {'base': 0.85, 'change_penalty': 0.05},
            'precipitation': {'base': 0.75, 'change_penalty': 0.1},  
            'mean_sea_level_pressure': {'base': 0.9, 'change_penalty': 0.03},
            'wind_u_10m': {'base': 0.8, 'change_penalty': 0.07},
            'wind_v_10m': {'base': 0.8, 'change_penalty': 0.07},
            'relative_humidity': {'base': 0.8, 'change_penalty': 0.05},
            'cloud_cover': {'base': 0.75, 'change_penalty': 0.05}
        }
        
        # Calculate confidence for each variable
        for var_name, enhanced_data in enhanced.items():
            if var_name not in original_values:
                # If we don't have original data, use default high confidence
                confidence = np.full_like(enhanced_data, 0.8, dtype=np.float32)
                delta = np.zeros_like(enhanced_data, dtype=np.float32)
            else:
                original_data = original_values[var_name]
                
                # Calculate relative change
                delta = enhanced_data - original_data
                
                # Get variable-specific parameters
                params = confidence_params.get(
                    var_name, 
                    {'base': 0.8, 'change_penalty': 0.05}
                )
                
                # Calculate confidence based on magnitude of change
                # Larger changes reduce confidence
                base_confidence = params['base']
                
                # Normalize delta for confidence calculation
                if var_name == 'temperature_2m':
                    # For temperature, changes of up to 3 degrees are expected
                    normalized_delta = np.abs(delta) / 3.0
                elif var_name == 'precipitation':
                    # For precipitation, use relative change
                    epsilon = 0.1  # To avoid division by zero
                    normalized_delta = np.abs(delta) / (original_data + epsilon)
                elif var_name == 'mean_sea_level_pressure':
                    # For pressure, changes of up to 300 Pa are expected
                    normalized_delta = np.abs(delta) / 300.0
                else:
                    # For other variables, use relative change
                    var_range = np.max(original_data) - np.min(original_data)
                    if var_range > 0:
                        normalized_delta = np.abs(delta) / var_range
                    else:
                        normalized_delta = np.abs(delta) / (np.mean(original_data) + 0.1)
                
                # Calculate confidence penalties
                change_penalty = params['change_penalty'] * normalized_delta
                
                # Apply penalties with a minimum confidence floor
                confidence = np.maximum(0.5, base_confidence - change_penalty)
            
            # Store results
            result[var_name] = (enhanced_data, confidence, delta)
        
        return result
    
    def _create_enhanced_weather_data(
        self,
        enhanced_with_confidence: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]],
        original: WeatherData
    ) -> WeatherData:
        """Create enhanced WeatherData object from raw outputs."""
        # Create new variables dict
        variables = {}
        for var_name, (enhanced_data, confidence, delta) in enhanced_with_confidence.items():
            if var_name in original.variables:
                # Get original variable for units
                orig_var = original.variables[var_name]
                
                # Apply confidence threshold - use original data where confidence is low
                mask = confidence < self.confidence_threshold
                if np.any(mask):
                    enhanced_data[mask] = orig_var.data[mask]
                    delta[mask] = 0
                
                variables[var_name] = WeatherVariable(
                    name=var_name,
                    units=orig_var.units,
                    data=enhanced_data,
                    confidence=confidence,
                    enhancement_delta=delta
                )
        
        # Copy any variables that weren't enhanced
        for var_name, var in original.variables.items():
            if var_name not in variables:
                variables[var_name] = var
        
        # Create new WeatherData with enhanced variables
        return WeatherData(
            variables=variables,
            timestamps=original.timestamps,
            latitude=original.latitude,
            longitude=original.longitude,
            radius_miles=original.radius_miles,
            metadata=original.metadata
        )
    
    def get_enhancement_metrics(self, enhanced_data: WeatherData) -> Dict[str, float]:
        """Calculate overall enhancement metrics."""
        metrics = {
            'overall_confidence': 0.0,
            'variables_enhanced': 0,
            'average_enhancement_magnitude': 0.0,
            'variables': {}
        }
        
        total_confidence = 0.0
        total_magnitude = 0.0
        count = 0
        
        for var_name, var in enhanced_data.variables.items():
            if var.confidence is not None and var.enhancement_delta is not None:
                # Calculate average confidence for this variable
                var_confidence = float(np.mean(var.confidence))
                
                # Calculate average absolute enhancement
                var_magnitude = float(np.mean(np.abs(var.enhancement_delta)))
                
                # Store in metrics
                metrics['variables'][var_name] = {
                    'confidence': var_confidence,
                    'enhancement_magnitude': var_magnitude
                }
                
                # Add to totals
                total_confidence += var_confidence
                total_magnitude += var_magnitude
                count += 1
        
        if count > 0:
            metrics['overall_confidence'] = total_confidence / count
            metrics['variables_enhanced'] = count
            metrics['average_enhancement_magnitude'] = total_magnitude / count
        
        return metrics

    def save_to_json(self, weather_data: WeatherData, filepath: str) -> None:
        """Save enhanced weather data to a JSON file."""
        try:
            serializable = {
                'latitude': weather_data.latitude,
                'longitude': weather_data.longitude,
                'timestamps': [ts.isoformat() for ts in weather_data.timestamps],
                'radius_miles': weather_data.radius_miles,
                'metadata': weather_data.metadata,
                'enhancement_metrics': self.get_enhancement_metrics(weather_data)
            }
            
            # Add variables
            for var_name, var in weather_data.variables.items():
                serializable[var_name] = {
                    'data': var.data.tolist(),
                    'units': var.units
                }
                
                if var.confidence is not None:
                    serializable[var_name]['confidence'] = var.confidence.tolist()
                    
                if var.enhancement_delta is not None:
                    serializable[var_name]['enhancement_delta'] = var.enhancement_delta.tolist()
            
            # Write to file
            with open(filepath, 'w') as f:
                json.dump(serializable, f, indent=2)
                
            self.logger.info(f"Saved enhanced weather data to {filepath}")
            
        except Exception as e:
            self.logger.error(f"Failed to save to JSON: {str(e)}")
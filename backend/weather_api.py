"""
WeatherGuard AI - OpenWeather API Integration Module
Responsible for communicating with OpenWeatherMap API and extracting
Automatic Weather Station (AWS) telemetry variables.
"""

import os
import requests
from datetime import datetime

class OpenWeatherAPI:
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "")
        self.latitude = float(os.getenv("LATITUDE", "13.0827"))
        self.longitude = float(os.getenv("LONGITUDE", "80.2707"))
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"

    def is_configured(self):
        return bool(self.api_key and self.api_key.strip() != "")

    def fetch_live_weather(self):
        """
        Fetches live weather data from OpenWeather API using metric units.
        Returns a parsed dictionary or raises an exception with diagnostic information.
        """
        if not self.is_configured():
            raise ValueError("OPENWEATHER_API_KEY is not set in environment variables.")

        params = {
            "lat": self.latitude,
            "lon": self.longitude,
            "appid": self.api_key,
            "units": "metric"
        }

        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return self.parse_weather_data(data)
        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 401:
                raise PermissionError("Invalid OpenWeather API Key (HTTP 401). Verify credentials.")
            elif response.status_code == 429:
                raise ConnectionRefusedError("OpenWeather API rate limit exceeded (HTTP 429).")
            else:
                raise RuntimeError(f"OpenWeather HTTP Error: {http_err}")
        except requests.exceptions.RequestException as req_err:
            raise ConnectionError(f"Network error connecting to OpenWeather API: {req_err}")

    def parse_weather_data(self, data):
        """
        Extracts AWS parameters into standardized telemetry structure:
        timestamp, latitude, longitude, temperature, feels_like, pressure, humidity,
        wind_speed, wind_direction, cloudiness, rainfall, visibility, weather_condition
        """
        # Formatted timestamp matching standard YYYY-MM-DD HH:MM:SS
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        coord = data.get("coord", {})
        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds = data.get("clouds", {})
        rain = data.get("rain", {})
        weather_list = data.get("weather", [{}])

        rainfall_1h = 0.0
        if isinstance(rain, dict):
            rainfall_1h = float(rain.get("1h", rain.get("3h", 0.0)))

        return {
            "timestamp": timestamp,
            "latitude": float(coord.get("lat", self.latitude)),
            "longitude": float(coord.get("lon", self.longitude)),
            "temperature": float(main.get("temp", 0.0)),
            "feels_like": float(main.get("feels_like", 0.0)),
            "pressure": float(main.get("pressure", 1013.25)),
            "humidity": float(main.get("humidity", 50.0)),
            "wind_speed": float(wind.get("speed", 0.0)),
            "wind_direction": float(wind.get("deg", 0.0)),
            "cloudiness": float(clouds.get("all", 0.0)),
            "rainfall": rainfall_1h,
            "visibility": float(data.get("visibility", 10000.0)),
            "weather_condition": weather_list[0].get("main", "Clear") if weather_list else "Clear"
        }

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Calendar,
  Compass,
  Radio,
  Share2,
  Crosshair,
  Info,
  Cloud,
  Sun,
  CloudRain,
  Navigation,
  ArrowRight,
} from "lucide-react";
import { WeatherStationItem, StationOperationalStatus, WeeklyWeatherResponse } from "../types";
import { DashboardDataSource } from "../services/dashboardDataSource";

interface WeatherMapProps {
  onSelectStationForWeekly?: (station: WeatherStationItem) => void;
  onSelectLocationForWeekly?: (loc: { latitude: number; longitude: number; name: string }) => void;
  activeStationCoords?: { latitude: number; longitude: number };
}

interface CustomProbePoint {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
  loadingWeather?: boolean;
  weatherData?: WeeklyWeatherResponse | null;
  weatherError?: string | null;
}

export const WeatherMap: React.FC<WeatherMapProps> = ({
  onSelectStationForWeekly,
  onSelectLocationForWeekly,
  activeStationCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const probeMarkerRef = useRef<L.Marker | null>(null);

  const [stations, setStations] = useState<WeatherStationItem[]>([]);
  const [loadingStations, setLoadingStations] = useState<boolean>(true);
  const [selectedStation, setSelectedStation] = useState<WeatherStationItem | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<CustomProbePoint | null>(null);
  const [nearbyComparison, setNearbyComparison] = useState<any | null>(null);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Global popup callback to seamlessly navigate to 15-day view from Leaflet popups
  useEffect(() => {
    (window as any).__weatherGuardExploreLocation = (lat: number, lon: number, name: string) => {
      if (onSelectLocationForWeekly) {
        onSelectLocationForWeekly({ latitude: lat, longitude: lon, name });
      } else if (onSelectStationForWeekly) {
        onSelectStationForWeekly({
          id: `PROBE-${Date.now()}`,
          name,
          type: "VIRTUAL_PROBE",
          country: "Global",
          region: "Map Probe",
          network: "Virtual Synoptic Probe",
          status: "NORMAL",
          lastObservationTime: new Date().toISOString(),
          dataSource: "Open-Meteo Synoptic Grid",
          coordinates: { latitude: lat, longitude: lon },
          isPrimaryStation: false,
        });
      }
    };

    return () => {
      delete (window as any).__weatherGuardExploreLocation;
    };
  }, [onSelectLocationForWeekly, onSelectStationForWeekly]);

  // Wind cardinal helper
  const getWindCardinal = (degrees?: number): string => {
    if (degrees === undefined || degrees === null) return "";
    const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round((degrees % 360) / 22.5) % 16;
    return cardinals[index];
  };

  // Load verified stations from backend registry
  const fetchStations = async () => {
    setLoadingStations(true);
    try {
      const list = await DashboardDataSource.getStations();
      setStations(list || []);
      // Default selected station to primary AWS station
      const primary = list.find((s) => s.isPrimaryStation) || list[0] || null;
      if (primary && !selectedStation && !selectedProbe) {
        setSelectedStation(primary);
      }
    } catch (e) {
      console.error("Failed to load weather stations", e);
    } finally {
      setLoadingStations(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Fetch nearby comparisons whenever a physical station is selected
  useEffect(() => {
    if (!selectedStation) {
      setNearbyComparison(null);
      return;
    }
    const loadNearby = async () => {
      setLoadingComparison(true);
      try {
        const comp = await DashboardDataSource.getNearbyComparison(selectedStation.id);
        setNearbyComparison(comp);
      } catch (e) {
        console.error("Could not fetch nearby station comparison", e);
        setNearbyComparison(null);
      } finally {
        setLoadingComparison(false);
      }
    };
    loadNearby();
  }, [selectedStation?.id]);

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await DashboardDataSource.geocode(searchQuery.trim());
        setSearchResults(res || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Handle placing or moving a virtual probe point
  const setProbeAtCoordinates = async (lat: number, lon: number, name?: string, country?: string) => {
    if (!mapInstanceRef.current) return;
    const probeName = name || `Touched Area (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`;

    const probe: CustomProbePoint = {
      latitude: lat,
      longitude: lon,
      name: probeName,
      country: country || "",
      loadingWeather: true,
      weatherData: null,
      weatherError: null,
    };

    setSelectedProbe(probe);
    setSelectedStation(null); // Deselect physical station

    // Update or create Leaflet probe marker
    if (probeMarkerRef.current) {
      probeMarkerRef.current.setLatLng([lat, lon]);
    } else {
      const probeIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 32px; height: 32px;">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-indigo-500"></span>
            <div class="relative rounded-full shadow-lg flex items-center justify-center border-2 border-white bg-indigo-600 text-white" style="width: 28px; height: 28px;">
              <span style="font-size: 13px; font-weight: bold;">⊕</span>
            </div>
          </div>
        `,
        className: "custom-probe-pin",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lon], { icon: probeIcon }).addTo(mapInstanceRef.current);
      probeMarkerRef.current = marker;

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedStation(null);
        setSelectedProbe((prev) => (prev ? { ...prev } : null));
      });
    }

    // Display immediate loading popup at the touched location
    const loadingHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${probeName}</span>
          <span style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 9999px; font-weight: 600;">Point Telemetry</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; color: #475569;">
          <div style="width: 16px; height: 16px; border: 2px solid #6366f1; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Loading live weather & 7-day forecast...</span>
        </div>
      </div>
    `;

    probeMarkerRef.current.bindPopup(loadingHtml, { autoClose: false, closeOnClick: false }).openPopup();

    try {
      const data = await DashboardDataSource.getWeeklyWeather(lat, lon, name);
      if (data && data.status === "success") {
        const resolvedName = data.location?.name || probeName;
        setSelectedProbe({
          latitude: lat,
          longitude: lon,
          name: resolvedName,
          country: country || "",
          loadingWeather: false,
          weatherData: data,
          weatherError: null,
        });

        // Update popup with high-contrast live atmospheric data card
        const safeName = resolvedName.replace(/'/g, "\\'");
        const curr = data.current;
        const condition = curr?.weather_condition || "Available Telemetry";
        const temp = curr ? `${curr.temperature}°C` : "Telemetry Loaded";
        const feels = curr ? `Feels ${curr.feels_like}°C` : "";
        const timestamp = curr?.timestamp || "";
        const humidity = curr ? `${curr.humidity}%` : "N/A";
        const precip = curr?.precipitation !== undefined ? `${curr.precipitation} mm` : "0.0 mm";
        const wind = curr ? `${curr.wind_speed} km/h` : "N/A";
        const pressure = curr ? `${curr.pressure} hPa` : "N/A";

        const livePopupHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 260px; padding: 4px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 13px; color: #0f172a; line-height: 1.25;">${resolvedName}</div>
                <div style="font-size: 10px; color: #6366f1; font-weight: 600; margin-top: 2px;">
                  ${lat.toFixed(4)}°, ${lon.toFixed(4)}° &bull; ${data.location?.elevation || 0}m alt
                </div>
              </div>
              <span style="background: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; white-space: nowrap; margin-left: 6px;">
                ${condition}
              </span>
            </div>

            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
              <div>
                <span style="font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1;">${temp}</span>
                ${feels ? `<span style="font-size: 11px; color: #64748b; margin-left: 6px;">${feels}</span>` : ""}
              </div>
              <span style="font-size: 10px; color: #64748b;">${timestamp}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div>💧 Humidity: <strong>${humidity}</strong></div>
              <div>🌧️ Rain: <strong>${precip}</strong></div>
              <div>💨 Wind: <strong>${wind}</strong></div>
              <div>⏱️ Press: <strong>${pressure}</strong></div>
            </div>

            <button onclick="window.__weatherGuardExploreLocation && window.__weatherGuardExploreLocation(${lat}, ${lon}, '${safeName}')" style="width: 100%; background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; padding: 7px 10px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
              <span>Explore 15-Day Weather Analysis &rarr;</span>
            </button>
          </div>
        `;

        if (probeMarkerRef.current) {
          probeMarkerRef.current.setPopupContent(livePopupHtml);
        }
      } else {
        throw new Error("Telemetry response was empty");
      }
    } catch (err: any) {
      setSelectedProbe({
        latitude: lat,
        longitude: lon,
        name: probeName,
        country: country || "",
        loadingWeather: false,
        weatherData: null,
        weatherError: "Could not retrieve atmospheric data for these coordinates.",
      });

      if (probeMarkerRef.current) {
        probeMarkerRef.current.setPopupContent(`
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 6px;">
            <div style="font-weight: 700; font-size: 13px; color: #dc2626;">Observation Unavailable</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Could not retrieve atmospheric telemetry for (${lat.toFixed(3)}°, ${lon.toFixed(3)}°).</div>
          </div>
        `);
      }
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const initialLat = activeStationCoords?.latitude ?? 11.2722;
    const initialLon = activeStationCoords?.longitude ?? 77.604;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
    });

    // High-reliability OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors • WeatherGuard Synoptic Network',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Map click handler: allows users to click ANYWHERE in the world to inspect coordinates
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setProbeAtCoordinates(lat, lng);
    });

    // Resize observer to ensure full container fit
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update physical station map markers when stations or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const group = markersLayerRef.current;
    group.clearLayers();

    const filtered = stations.filter((s) => {
      if (statusFilter === "ALL") return true;
      return s.status === statusFilter;
    });

    filtered.forEach((station) => {
      const { latitude, longitude } = station.coordinates;
      const statusColor =
        station.status === "NORMAL"
          ? "#10b981" // Green
          : station.status === "WARNING"
          ? "#f59e0b" // Yellow
          : station.status === "ANOMALY"
          ? "#ef4444" // Red
          : "#64748b"; // Gray

      const isPrimary = station.isPrimaryStation;
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 36px; height: 36px;">
          ${
            isPrimary
              ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${statusColor};"></span>`
              : ""
          }
          <div class="relative rounded-full shadow-md flex items-center justify-center border-2 border-white transition-transform hover:scale-110" style="background-color: ${statusColor}; width: ${
        isPrimary ? "32px" : "26px"
      }; height: ${isPrimary ? "32px" : "26px"};">
            <span style="color: white; font-size: 11px; font-weight: bold;">
              ${isPrimary ? "★" : station.currentReading ? Math.round(station.currentReading.temperature) + "°" : "•"}
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-station-pin",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${station.name}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${station.network} • ${station.country} (Physical Station)
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; font-size: 11px; margin-bottom: 6px;">
            ${
              station.currentReading
                ? `<div><strong>Temp:</strong> ${station.currentReading.temperature}°C &bull; <strong>Humidity:</strong> ${station.currentReading.humidity}%</div>
                   <div><strong>Wind:</strong> ${station.currentReading.wind_speed} m/s &bull; <strong>Pressure:</strong> ${station.currentReading.pressure} hPa</div>
                   <div style="color: #0284c7; margin-top: 2px;"><strong>Condition:</strong> ${station.currentReading.weather_condition}</div>`
                : `<span style="color: #64748b;">Telemetry offline or unavailable</span>`
            }
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; margin-bottom: 6px;">
            <span style="font-weight: 700; color: ${statusColor}; text-transform: uppercase;">Status: ${station.status}</span>
            <span style="color: #64748b;">${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°</span>
          </div>
          <button onclick="window.__weatherGuardExploreLocation && window.__weatherGuardExploreLocation(${latitude}, ${longitude}, '${station.name.replace(/'/g, "\\'")}')" style="width: 100%; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
            <span>Explore 15-Day Weather Analysis &rarr;</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedStation(station);
        setSelectedProbe(null);
      });

      marker.addTo(group);
    });
  }, [stations, statusFilter]);

  const handleFlyTo = (lat: number, lon: number, zoom = 10) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], zoom, { duration: 1.2 });
    }
  };

  const handleSelectSearchedPlace = (place: any) => {
    handleFlyTo(place.latitude, place.longitude, 10);
    setProbeAtCoordinates(
      place.latitude,
      place.longitude,
      `${place.name}${place.admin1 ? ", " + place.admin1 : ""}`,
      place.country
    );
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleSelectKarur = () => {
    handleFlyTo(10.95771, 78.08095, 11);
    // Check if Karur is registered as a physical station
    const karurStation = stations.find((s) => s.id === "AWS-IND-KARUR-01" || s.name.toLowerCase().includes("karur"));
    if (karurStation) {
      setSelectedStation(karurStation);
      setSelectedProbe(null);
    } else {
      setProbeAtCoordinates(10.95771, 78.08095, "Karur, Tamil Nadu", "India");
    }
  };

  const getStatusBadge = (status: StationOperationalStatus) => {
    switch (status) {
      case "NORMAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Normal Operation
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Sensor Warning
          </span>
        );
      case "ANOMALY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Anomaly Flagged
          </span>
        );
      case "OFFLINE":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Offline / Unavailable
          </span>
        );
    }
  };

  return (
    <div id="weather-map-section" className="space-y-6">
      {/* Top Map Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Layers className="w-3.5 h-3.5" />
                Worldwide Weather Explorer & Map
              </span>
              <span className="text-xs text-slate-500">
                Pan, Zoom & Click Any Location On Earth • Physical Station Markers
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-1 flex items-center gap-2">
              <span>Worldwide Meteorological Map</span>
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                {stations.length} Physical Stations Registered
              </span>
            </h2>
          </div>

          {/* Search bar & status filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Location Search Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="map-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search world city, town, or coordinates..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {isSearching && (
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 animate-spin" />
              )}

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearchedPlace(r)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-900">{r.name}, {r.country}</span>
                      <span className="text-[10px] font-mono text-slate-400">{r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter Buttons for Physical Stations */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded transition ${statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NORMAL")}
                className={`px-2 py-1 rounded flex items-center gap-1 transition ${statusFilter === "NORMAL" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("WARNING")}
                className={`px-2 py-1 rounded flex items-center gap-1 transition ${statusFilter === "WARNING" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"}`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ANOMALY")}
                className={`px-2 py-1 rounded flex items-center gap-1 transition ${statusFilter === "ANOMALY" ? "bg-white text-red-700 shadow-xs" : "text-slate-600"}`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" /> Anomaly
              </button>
            </div>
          </div>
        </div>

        {/* Quick Example Jumps Strip (Including Karur, Tamil Nadu) */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500">Quick Jumps:</span>

          {/* Karur Featured Example Button */}
          <button
            type="button"
            id="map-jump-karur-btn"
            onClick={handleSelectKarur}
            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-md border border-amber-300 transition flex items-center gap-1"
          >
            ★ Karur, Tamil Nadu (Example Location)
          </button>

          <button
            type="button"
            onClick={() => {
              const primary = stations.find((s) => s.isPrimaryStation);
              if (primary) {
                handleFlyTo(primary.coordinates.latitude, primary.coordinates.longitude, 11);
                setSelectedStation(primary);
                setSelectedProbe(null);
              }
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
          >
            WeatherGuard Primary AWS
          </button>

          <button
            type="button"
            onClick={() => {
              handleFlyTo(11.03, 77.0434, 11);
              const stn = stations.find((s) => s.name.includes("Coimbatore"));
              if (stn) { setSelectedStation(stn); setSelectedProbe(null); }
              else { setProbeAtCoordinates(11.03, 77.0434, "Coimbatore, Tamil Nadu", "India"); }
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
          >
            Coimbatore
          </button>

          <button
            type="button"
            onClick={() => {
              handleFlyTo(13.0, 80.18, 11);
              const stn = stations.find((s) => s.name.includes("Chennai"));
              if (stn) { setSelectedStation(stn); setSelectedProbe(null); }
              else { setProbeAtCoordinates(13.0, 80.18, "Chennai, Tamil Nadu", "India"); }
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
          >
            Chennai
          </button>

          <button
            type="button"
            onClick={() => {
              handleFlyTo(51.5074, -0.1278, 10);
              const stn = stations.find((s) => s.name.includes("London"));
              if (stn) { setSelectedStation(stn); setSelectedProbe(null); }
              else { setProbeAtCoordinates(51.5074, -0.1278, "London", "United Kingdom"); }
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
          >
            London
          </button>

          <button
            type="button"
            onClick={() => {
              handleFlyTo(35.6762, 139.6503, 10);
              const stn = stations.find((s) => s.name.includes("Tokyo"));
              if (stn) { setSelectedStation(stn); setSelectedProbe(null); }
              else { setProbeAtCoordinates(35.6762, 139.6503, "Tokyo", "Japan"); }
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
          >
            Tokyo
          </button>
        </div>

        {/* Legend strip */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100">
          <span className="font-semibold text-slate-500">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Green = Normal Station</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Yellow = Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>Red = Sensor Anomaly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
            <span>Purple ⊕ = Clicked Map Probe Point</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-blue-600 font-bold">★</span>
            <span className="font-medium text-slate-800">Starred = Primary WeatherGuard AWS</span>
          </div>
        </div>
      </div>

      {/* Main Map Container and Side Detail Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet Interactive Map */}
        <div className="lg:col-span-2 relative bg-slate-100 rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[540px] flex flex-col">
          <div
            id="leaflet-weather-map"
            ref={mapContainerRef}
            className="w-full h-full min-h-[540px] z-10 cursor-crosshair"
          />

          {/* Instruction hint floating over map */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] px-3.5 py-2 rounded-lg shadow-lg border border-slate-700 pointer-events-none flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span>Touch or click any location on Earth to inspect live weather data &amp; 7-day forecast</span>
          </div>

          {/* Floating Map Controls overlay */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            <button
              type="button"
              id="map-focus-primary-btn"
              onClick={() => {
                const primary = stations.find((s) => s.isPrimaryStation);
                if (primary) {
                  handleFlyTo(primary.coordinates.latitude, primary.coordinates.longitude, 11);
                  setSelectedStation(primary);
                  setSelectedProbe(null);
                }
              }}
              title="Focus Primary Station AWS"
              className="px-3 py-1.5 bg-white/95 backdrop-blur-xs hover:bg-white text-slate-800 rounded-lg shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Radio className="w-3.5 h-3.5 text-blue-600" /> Focus Primary AWS
            </button>
            <button
              type="button"
              onClick={() => fetchStations()}
              title="Refresh Station Telemetry"
              className="p-2 bg-white/95 backdrop-blur-xs hover:bg-white text-slate-800 rounded-lg shadow-md border border-slate-200 text-xs font-semibold flex items-center justify-center transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStations ? "animate-spin text-blue-600" : "text-slate-600"}`} />
            </button>
          </div>
        </div>

        {/* Right Col: Selected Station or Selected Probe Details */}
        <div className="space-y-4">
          {/* CASE A: Physical Weather Station Selected */}
          {selectedStation && (
            <div
              id="station-detail-panel"
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              {/* Header */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(selectedStation.status)}
                    {selectedStation.isPrimaryStation && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Primary Station
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedStation.code || "AWS"}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-2">
                  {selectedStation.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStation.network} &bull; {selectedStation.region}, {selectedStation.country}
                </p>
                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-slate-400" />
                  {selectedStation.coordinates.latitude.toFixed(4)}° N,{" "}
                  {selectedStation.coordinates.longitude.toFixed(4)}° E &bull; Elev:{" "}
                  {selectedStation.coordinates.elevationMeters ?? 260}m
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Genuine Physical Station Sensor
                </div>
              </div>

              {/* Live Telemetry Readings */}
              {selectedStation.currentReading ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Current Sensor Telemetry
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-orange-500" /> Temperature
                      </span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedStation.currentReading.temperature.toFixed(1)}°C
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-500" /> Humidity
                      </span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedStation.currentReading.humidity}%
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-indigo-500" /> Pressure
                      </span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedStation.currentReading.pressure} hPa
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Wind className="w-3 h-3 text-teal-500" /> Wind Speed
                      </span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedStation.currentReading.wind_speed} m/s
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {(selectedStation.currentReading.wind_speed * 3.6).toFixed(1)} km/h
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span>Conditions: <strong className="text-slate-800">{selectedStation.currentReading.weather_condition}</strong></span>
                    <span className="text-[11px] text-slate-500">Rain: {selectedStation.currentReading.rainfall ?? 0} mm</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                  Live sensor stream currently offline for this station.
                </div>
              )}

              {/* Anomaly Detection Status & Explanation */}
              {selectedStation.anomalyDetails && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    selectedStation.status === "ANOMALY"
                      ? "bg-red-50 border-red-200 text-red-900"
                      : selectedStation.status === "WARNING"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {selectedStation.status === "ANOMALY" ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : selectedStation.status === "WARNING" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    Anomaly Score: {selectedStation.anomalyDetails.score} ({selectedStation.anomalyDetails.category})
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    {selectedStation.anomalyDetails.explanation}
                  </p>
                </div>
              )}

              {/* Action Button: View Weekly History & Forecast for this Station */}
              {onSelectStationForWeekly && (
                <button
                  type="button"
                  id="view-station-weekly-btn"
                  onClick={() => onSelectStationForWeekly(selectedStation)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition"
                >
                  <Calendar className="w-4 h-4" />
                  View 15-Day History & Forecast
                </button>
              )}

              {/* Nearby Station Comparison & Spatial Consistency */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" /> Nearby Station Comparison
                  </h4>
                  {nearbyComparison && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        nearbyComparison.spatialConsistencyScore >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : nearbyComparison.spatialConsistencyScore >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {nearbyComparison.spatialConsistencyScore}% Spatial Concordance
                    </span>
                  )}
                </div>

                {loadingComparison && (
                  <div className="text-center py-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Comparing regional microclimate gradients...
                  </div>
                )}

                {nearbyComparison && !loadingComparison && (
                  <>
                    <p className="text-[11px] text-slate-500 mb-2 leading-tight">
                      {nearbyComparison.overallAssessment}
                    </p>

                    {nearbyComparison.nearbyStations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No neighboring meteorological stations within 600 km radius.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {nearbyComparison.nearbyStations.slice(0, 4).map((nb: any, i: number) => (
                          <div
                            key={i}
                            className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                {nb.station.name}
                              </div>
                              <div className="text-slate-400 text-[10px]">
                                {nb.distanceKm} km away &bull; {nb.station.currentReading?.temperature}°C
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`font-mono font-bold ${
                                  Math.abs(nb.tempDiff) > 8 ? "text-red-600" : "text-slate-700"
                                }`}
                              >
                                {nb.tempDiff > 0 ? `+${nb.tempDiff}` : nb.tempDiff}°C
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {nb.pressureDiff > 0 ? `+${nb.pressureDiff}` : nb.pressureDiff} hPa
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* CASE B: Virtual Probe Point Selected (Clicked Anywhere On Earth) */}
          {selectedProbe && !selectedStation && (
            <div
              id="probe-detail-panel"
              className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 space-y-4"
            >
              {/* Header with Title and Coordinates */}
              <div className="border-b border-indigo-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-indigo-600" /> Touched Location Probe
                  </span>
                  {selectedProbe.weatherData?.location?.elevation !== undefined && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Alt: {selectedProbe.weatherData.location.elevation}m
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-2 leading-snug">
                  {selectedProbe.name}
                </h3>
                {selectedProbe.country && (
                  <p className="text-xs text-slate-500">{selectedProbe.country}</p>
                )}
                <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-slate-400" />
                  {selectedProbe.latitude.toFixed(4)}° N, {selectedProbe.longitude.toFixed(4)}° E
                </div>
              </div>

              {/* State 1: Loading Telemetry */}
              {selectedProbe.loadingWeather && (
                <div className="py-8 px-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative flex h-10 w-10 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
                    <div className="relative w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Querying Atmospheric Telemetry</div>
                    <div className="text-[11px] text-slate-500 mt-1">Fetching live weather observations and 7-day model forecasts for this area...</div>
                  </div>
                </div>
              )}

              {/* State 2: Error Fetching Telemetry */}
              {selectedProbe.weatherError && !selectedProbe.loadingWeather && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600" /> Telemetry Unavailable
                  </div>
                  <p>{selectedProbe.weatherError}</p>
                  <button
                    type="button"
                    onClick={() => setProbeAtCoordinates(selectedProbe.latitude, selectedProbe.longitude, selectedProbe.name)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry Telemetry Query
                  </button>
                </div>
              )}

              {/* State 3: Successfully Loaded Weather Telemetry */}
              {selectedProbe.weatherData && !selectedProbe.loadingWeather && (
                <div className="space-y-3">
                  {selectedProbe.weatherData.current ? (
                    <>
                      {/* Current conditions banner */}
                      <div className="bg-gradient-to-br from-indigo-50/90 to-slate-50 border border-indigo-100 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {selectedProbe.weatherData.current.weather_condition}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {selectedProbe.weatherData.current.timestamp}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                              {selectedProbe.weatherData.current.temperature}°C
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              Feels like {selectedProbe.weatherData.current.feels_like}°C
                            </div>
                          </div>
                          {selectedProbe.weatherData.currentDay && (
                            <div className="text-right text-xs">
                              <span className="text-slate-500 text-[10px]">Today's Range</span>
                              <div className="font-bold text-slate-800">
                                {selectedProbe.weatherData.currentDay.tempMax}° / {selectedProbe.weatherData.currentDay.tempMin}°
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6-metric atmospheric telemetry grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Droplets className="w-3.5 h-3.5 text-blue-500" /> Relative Humidity
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.current.humidity}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {selectedProbe.weatherData.current.humidity > 70 ? "High Moisture" : selectedProbe.weatherData.current.humidity < 35 ? "Dry" : "Moderate"}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <CloudRain className="w-3.5 h-3.5 text-sky-500" /> Precipitation
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.current.precipitation ?? 0} mm
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(selectedProbe.weatherData.current.precipitation ?? 0) > 0 ? "Rain Observed" : "No Precipitation"}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Wind className="w-3.5 h-3.5 text-teal-500" /> Wind Velocity
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.current.wind_speed} km/h
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {selectedProbe.weatherData.current.wind_direction ?? 0}° ({getWindCardinal(selectedProbe.weatherData.current.wind_direction ?? 0)})
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Gauge className="w-3.5 h-3.5 text-purple-500" /> Surface Pressure
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.current.pressure} hPa
                          </div>
                          <div className="text-[10px] text-slate-400">Barometric Sea-Level</div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Cloud className="w-3.5 h-3.5 text-slate-500" /> Cloud Cover
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.current.cloud_cover ?? 0}%
                          </div>
                          <div className="text-[10px] text-slate-400">Sky Visibility</div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Compass className="w-3.5 h-3.5 text-amber-500" /> Terrain Elevation
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {selectedProbe.weatherData.location?.elevation ?? 0} m
                          </div>
                          <div className="text-[10px] text-slate-400">Above Sea Level</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                      Current instantaneous readings are calibrating. Daily summary and forecast are accessible below.
                    </div>
                  )}

                  {/* Upcoming 3-Day Forecast mini strip */}
                  {selectedProbe.weatherData.forecast7Days && selectedProbe.weatherData.forecast7Days.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>Upcoming 3-Day Forecast</span>
                        <span className="text-[10px] text-indigo-600 font-medium">Model NWP</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {selectedProbe.weatherData.forecast7Days.slice(0, 3).map((f, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-center">
                            <div className="text-[10px] font-medium text-slate-500 truncate">{f.dayLabel}</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">{f.tempMax}° / {f.tempMin}°</div>
                            <div className="text-[10px] text-indigo-600 truncate mt-0.5">{f.weatherCondition}</div>
                            {f.precipitationProbabilityMax !== undefined && (
                              <div className="text-[9px] text-sky-600 mt-0.5">🌧️ {f.precipitationProbabilityMax}%</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Integrity Notice: Not a physical station */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>Data Provenance:</strong> High-Resolution Gridded Reanalysis (ERA5) and Numerical Weather Prediction models (Open-Meteo Global Network).
                </div>
              </div>

              {/* Action Button: Open Weekly Weather for these coordinates */}
              {(onSelectLocationForWeekly || onSelectStationForWeekly) && (
                <button
                  type="button"
                  id="view-probe-weekly-btn"
                  onClick={() => {
                    if (onSelectLocationForWeekly) {
                      onSelectLocationForWeekly({
                        latitude: selectedProbe.latitude,
                        longitude: selectedProbe.longitude,
                        name: selectedProbe.name,
                      });
                    } else if (onSelectStationForWeekly) {
                      onSelectStationForWeekly({
                        id: `PROBE-${Date.now()}`,
                        name: selectedProbe.name,
                        type: "VIRTUAL_PROBE",
                        country: selectedProbe.country || "Global",
                        region: "Map Probe",
                        network: "Virtual Synoptic Probe",
                        status: "NORMAL",
                        lastObservationTime: new Date().toISOString(),
                        dataSource: "Open-Meteo Synoptic Grid",
                        coordinates: {
                          latitude: selectedProbe.latitude,
                          longitude: selectedProbe.longitude,
                        },
                        isPrimaryStation: false,
                      });
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition"
                >
                  <Calendar className="w-4 h-4" />
                  Explore 15-Day Weather for this Location
                </button>
              )}
            </div>
          )}

          {/* CASE C: Nothing Selected */}
          {!selectedStation && !selectedProbe && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Click any physical station marker or anywhere on the map to inspect weather conditions and open the 15-day explorer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

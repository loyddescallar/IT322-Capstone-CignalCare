import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, Trash2 } from 'lucide-react';

const DEFAULT_CENTER = [13.9, 120.75];
const DEFAULT_ZOOM = 10;
const PIN_ZOOM = 17;

function normalizePoint(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

const markerIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;background:#cc0000;border:3px solid #fff;border-radius:9999px;box-shadow:0 2px 8px rgba(15,23,42,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function LocationPinPicker({ value, onChange }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [locationState, setLocationState] = useState({ loading: false, error: '', accuracy: null });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const initialPoint = normalizePoint(value?.latitude, value?.longitude);
    const map = L.map(mapElementRef.current, {
      center: initialPoint
        ? [initialPoint.latitude, initialPoint.longitude]
        : DEFAULT_CENTER,
      zoom: initialPoint ? PIN_ZOOM : DEFAULT_ZOOM,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const placeMarker = (point, shouldNotify = true) => {
      if (!point) return;
      const latLng = [point.latitude, point.longitude];

      if (!markerRef.current) {
        const marker = L.marker(latLng, {
          draggable: true,
          icon: markerIcon,
          keyboard: true,
          title: 'Selected service location',
        }).addTo(map);

        marker.on('dragend', () => {
          const dragged = marker.getLatLng();
          const next = normalizePoint(dragged.lat, dragged.lng);
          if (next) {
            setLocationState({ loading: false, error: '', accuracy: null });
            onChangeRef.current?.(next);
          }
        });

        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(latLng);
      }

      if (shouldNotify) {
        setLocationState({ loading: false, error: '', accuracy: null });
        onChangeRef.current?.(point);
      }
    };

    map.on('click', (event) => {
      const point = normalizePoint(event.latlng.lat, event.latlng.lng);
      if (point) placeMarker(point, true);
    });

    if (initialPoint) placeMarker(initialPoint, false);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
    // The map is intentionally created once. External value changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const point = normalizePoint(value?.latitude, value?.longitude);

    if (!point) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: markerIcon,
        keyboard: true,
        title: 'Selected service location',
      }).addTo(map);

      marker.on('dragend', () => {
        const dragged = marker.getLatLng();
        const next = normalizePoint(dragged.lat, dragged.lng);
        if (next) {
          setLocationState({ loading: false, error: '', accuracy: null });
          onChangeRef.current?.(next);
        }
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([point.latitude, point.longitude]);
    }
  }, [value?.latitude, value?.longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({
        loading: false,
        error: 'Location services are not supported by this browser. Place the pin manually instead.',
        accuracy: null,
      });
      return;
    }

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) {
      setLocationState({
        loading: false,
        error: 'Device location requires a secure HTTPS connection. Use the deployed CignalCare+ site or place the pin manually.',
        accuracy: null,
      });
      return;
    }

    // Important for mobile browsers: request geolocation immediately from the
    // button tap. Awaiting another API first can cause some browsers to lose the
    // user-activation context and skip the permission prompt.
    setLocationState({ loading: true, error: '', accuracy: null });

    const applyPosition = (position) => {
      const point = normalizePoint(position?.coords?.latitude, position?.coords?.longitude);

      if (!point) {
        setLocationState({
          loading: false,
          error: 'The device returned an invalid location. Place the pin manually instead.',
          accuracy: null,
        });
        return;
      }

      const map = mapRef.current;
      if (map) {
        map.invalidateSize();
        map.flyTo([point.latitude, point.longitude], PIN_ZOOM, {
          animate: true,
          duration: 0.6,
        });
      }

      onChangeRef.current?.(point);
      setLocationState({
        loading: false,
        error: '',
        accuracy: Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null,
      });
    };

    const locationErrorMessage = (error) => {
      if (error?.code === 1) {
        return 'Location permission was denied or blocked. On your phone, open this site’s permissions and set Location to Allow, make sure device Location/GPS is turned on, then tap Use My Current Location again. You can still place the pin manually.';
      }
      if (error?.code === 3) {
        return 'Location detection timed out. Make sure Location/GPS and Wi-Fi or mobile data are on, then try again or place the pin manually.';
      }
      if (error?.code === 2) {
        return 'Your device location is currently unavailable. Turn on Location/GPS and Wi-Fi or mobile data, then try again or place the pin manually.';
      }
      return 'Your current location could not be detected. Try again or place the pin manually.';
    };

    const tryFallbackLocation = (primaryError) => {
      if (primaryError?.code === 1) {
        setLocationState({
          loading: false,
          error: locationErrorMessage(primaryError),
          accuracy: null,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (fallbackError) => {
          setLocationState({
            loading: false,
            error: locationErrorMessage(fallbackError),
            accuracy: null,
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 15000,
        }
      );
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      tryFallbackLocation,
      {
        enableHighAccuracy: true,
        timeout: 18000,
        maximumAge: 0,
      }
    );
  };

  const clearPin = () => {
    onChange?.(null);
    setLocationState({ loading: false, error: '', accuracy: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600">
            Exact Map Pin <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tap/click the map or drag the marker. On phones, tap Use My Current Location to let the browser request Location permission. If no prompt appears, Location may already be blocked in the browser/site settings. The written service address remains required.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locationState.loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cc0000] bg-[#cc0000] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:bg-white sm:px-3 sm:py-2 sm:text-slate-700 sm:hover:border-[#cc0000] sm:hover:bg-white sm:hover:text-[#cc0000]"
          >
            <LocateFixed size={15} />
            {locationState.loading ? 'Locating...' : 'Use My Current Location'}
          </button>

          {value && (
            <button
              type="button"
              onClick={clearPin}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={14} /> Clear Pin
            </button>
          )}
        </div>
      </div>

      <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div
          ref={mapElementRef}
          className="h-[280px] w-full sm:h-[320px]"
          aria-label="Map for selecting an optional exact service location"
        />
      </div>

      {value ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <MapPin size={13} className="text-[#cc0000]" /> Selected pin
          </span>
          <span>Lat: {Number(value.latitude).toFixed(6)}</span>
          <span>Lng: {Number(value.longitude).toFixed(6)}</span>
          {locationState.accuracy != null && <span>Accuracy: ±{locationState.accuracy} m</span>}
        </div>
      ) : (
        <p className="text-xs leading-5 text-slate-500">
          No exact pin selected. This does not prevent submission.
        </p>
      )}

      {locationState.error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
          {locationState.error}
        </p>
      )}
    </div>
  );
}

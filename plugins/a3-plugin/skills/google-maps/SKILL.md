---
name: google-maps
description: Google Maps JavaScript API reference — @googlemaps/js-api-loader for map rendering, geocoding, and county selection in A3
version: 0.1.0
---

# Google Maps JavaScript API Reference

## Package: @googlemaps/js-api-loader

The official Google Maps JavaScript API loader. A3 uses this to dynamically load the Maps API without a script tag.

### Installation

```bash
pnpm add @googlemaps/js-api-loader
```

### Loading the API

```typescript
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: 'YOUR_API_KEY',
  version: 'weekly',
  libraries: ['places', 'geocoding', 'drawing', 'geometry'],
});

// Load the core maps library
const { Map } = await loader.importLibrary('maps');

// Load additional libraries as needed
const { Geocoder } = await loader.importLibrary('geocoding');
const { PlacesService, Autocomplete } = await loader.importLibrary('places');
```

**Key rule:** Only create one Loader instance per page. Multiple instances with different options will throw. In A3, the loader is typically initialized in a service and shared across components.

### Loader Options

| Option       | Type     | Description                                      |
|--------------|----------|--------------------------------------------------|
| `apiKey`     | string   | Your Google Maps API key                         |
| `version`    | string   | API version: `'weekly'`, `'quarterly'`, `'beta'` |
| `libraries`  | string[] | Libraries to load: `places`, `geocoding`, etc.   |
| `language`   | string   | Language code, e.g. `'en'`                       |
| `region`     | string   | Region bias, e.g. `'US'`                         |
| `authReferrerPolicy` | string | `'origin'` restricts to origin only     |

## Map Constructor

```typescript
const map = new google.maps.Map(containerElement, {
  center: { lat: 39.8283, lng: -98.5795 }, // Center of US
  zoom: 4,
  mapTypeId: 'roadmap',        // 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'cooperative', // 'cooperative' | 'greedy' | 'none' | 'auto'
  styles: [],                     // Custom styling array
  mapId: 'YOUR_MAP_ID',          // For cloud-based styling
});
```

### Common Map Methods

```typescript
map.setCenter({ lat, lng });
map.setZoom(10);
map.panTo({ lat, lng });
map.fitBounds(bounds);            // Adjusts zoom to fit a LatLngBounds
map.getBounds();                   // Returns current visible bounds
map.getZoom();
map.setOptions({ draggable: false });
```

## Markers

### Advanced Markers (recommended, requires Map ID)

```typescript
const { AdvancedMarkerElement } = await loader.importLibrary('marker');

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 34.0522, lng: -118.2437 },
  title: 'Los Angeles',
  gmpDraggable: false,
});

// Custom HTML content
const pinElement = document.createElement('div');
pinElement.innerHTML = '<span class="custom-pin">A</span>';
marker.content = pinElement;

// Click event
marker.addEventListener('gmp-click', () => {
  infoWindow.open({ anchor: marker, map });
});
```

### Legacy Markers (still used in A3 county-map)

```typescript
const marker = new google.maps.Marker({
  position: { lat, lng },
  map,
  title: 'Label',
  icon: {
    url: '/assets/pin.svg',
    scaledSize: new google.maps.Size(30, 40),
  },
  draggable: false,
});

marker.addListener('click', () => { /* handle */ });
marker.setMap(null); // Remove from map
```

## Polygons

Used heavily in A3's county-map component to render county boundaries.

```typescript
const countyPolygon = new google.maps.Polygon({
  paths: coordinatesArray, // Array of {lat, lng}
  strokeColor: '#1a73e8',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#1a73e8',
  fillOpacity: 0.25,
  clickable: true,
  editable: false,
  zIndex: 1,
});

countyPolygon.setMap(map);

// Event: click on polygon
countyPolygon.addListener('click', (event) => {
  const latLng = event.latLng;
  // Toggle selection, update fillColor, etc.
});

// Update style dynamically
countyPolygon.setOptions({
  fillColor: '#34a853',
  fillOpacity: 0.5,
});

// Remove from map
countyPolygon.setMap(null);
```

### Working with Polygon Paths

```typescript
const path = countyPolygon.getPath();
path.forEach((latLng, index) => {
  console.log(latLng.lat(), latLng.lng());
});

// Check if point is inside polygon (requires geometry library)
const isInside = google.maps.geometry.poly.containsLocation(
  new google.maps.LatLng(lat, lng),
  countyPolygon
);
```

## Geocoding

```typescript
const { Geocoder } = await loader.importLibrary('geocoding');
const geocoder = new Geocoder();

// Address to coordinates
const { results } = await geocoder.geocode({
  address: '1600 Amphitheatre Parkway, Mountain View, CA',
});

if (results.length > 0) {
  const location = results[0].geometry.location;
  console.log(location.lat(), location.lng());
  console.log(results[0].formatted_address);
  // Extract county from address_components
  const county = results[0].address_components.find(
    (c) => c.types.includes('administrative_area_level_2')
  );
}

// Coordinates to address (reverse geocoding)
const { results: reverseResults } = await geocoder.geocode({
  location: { lat: 37.4221, lng: -122.0841 },
});
```

### Extracting County from Geocode Results

A3 pattern for county identification:

```typescript
function extractCountyFromResults(results: google.maps.GeocoderResult[]): string | null {
  for (const result of results) {
    const countyComponent = result.address_components.find((component) =>
      component.types.includes('administrative_area_level_2')
    );
    if (countyComponent) {
      return countyComponent.long_name.replace(' County', '');
    }
  }
  return null;
}
```

## Places API

```typescript
const { Autocomplete } = await loader.importLibrary('places');

const autocomplete = new Autocomplete(inputElement, {
  types: ['address'],
  componentRestrictions: { country: 'us' },
  fields: ['address_components', 'geometry', 'formatted_address'],
});

autocomplete.addListener('place_changed', () => {
  const place = autocomplete.getPlace();
  if (!place.geometry) return;

  map.panTo(place.geometry.location);
  map.setZoom(15);
});
```

## County-Map Component Pattern in A3

The county-map component (~37KB) renders a US map with selectable county polygons. Key patterns:

```typescript
// Component structure
// app/components/county-map.gts (Glimmer component)

interface CountyMapSignature {
  Args: {
    selectedCounties: string[];        // FIPS codes
    onCountySelect: (fips: string) => void;
    onCountyDeselect: (fips: string) => void;
    stateFilter?: string;              // Two-letter state code
    readonly?: boolean;
  };
  Element: HTMLDivElement;
}

// The component loads GeoJSON county boundary data,
// converts to google.maps.Polygon instances, and manages selection state.

// GeoJSON data is loaded from a static asset:
// public/assets/us-counties.json (~5MB)
// Each feature has properties: { FIPS, NAME, STATE }

// Performance: polygons are created lazily per-state
// and destroyed when the state filter changes.
```

### Responsive Map Handling

```typescript
// Resize observer pattern used in A3
const resizeObserver = new ResizeObserver(() => {
  google.maps.event.trigger(map, 'resize');
  map.fitBounds(currentBounds);
});
resizeObserver.observe(containerElement);

// Cleanup in willDestroy
resizeObserver.disconnect();
```

## Event Handling Summary

| Target   | Event            | Callback Arg                        |
|----------|------------------|-------------------------------------|
| Map      | `click`          | `MapMouseEvent` (latLng)            |
| Map      | `zoom_changed`   | none                                |
| Map      | `bounds_changed` | none                                |
| Map      | `idle`           | none (fires after pan/zoom settles) |
| Marker   | `click`          | `MapMouseEvent`                     |
| Marker   | `dragend`        | `MapMouseEvent`                     |
| Polygon  | `click`          | `PolyMouseEvent` (latLng)           |
| Polygon  | `mouseover`      | `PolyMouseEvent`                    |
| Polygon  | `mouseout`       | `PolyMouseEvent`                    |

### Removing Listeners

```typescript
const listener = map.addListener('click', handler);
google.maps.event.removeListener(listener);

// Remove all listeners from an object
google.maps.event.clearInstanceListeners(marker);
```

## API Key Configuration in A3

The Maps API key is stored in environment config and injected via the Ember environment:

```typescript
// config/environment.js
ENV.googleMaps = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
};

// Access in a service
const apiKey = this.config.googleMaps.apiKey;
```

Restrict the key in Google Cloud Console to HTTP referrers matching your domain and limit to Maps JavaScript API, Geocoding API, and Places API.

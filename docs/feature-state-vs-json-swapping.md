# WBGT Heat Map: Feature State vs Data Swapping Implementation Decision

## Overview

This document explains the reasoning behind adopting a hybrid approach combining **Feature State** for high-frequency time-based animations and **Data Swapping** for low-frequency dataset changes in the WBGT heat map visualization.

## Implementation Approaches Comparison

### Feature State Approach
- **Mechanism**: Maintains static GeoJSON data in the map source while dynamically updating feature properties via `setFeatureState()` calls.
- **Pros**:
  - Lightweight differential updates without re-parsing or re-indexing geometry.
  - Ideal for high-frequency updates (e.g., time slider playback at 500-1000ms intervals).
  - Popup interactions can retrieve current values via `getFeatureState()`.
  - No geometry re-indexing overhead.
- **Cons**:
  - Feature state is temporary and resets on style/source changes, requiring re-application.
  - Looping `setFeatureState()` over thousands of features can strain the main thread if updates are too frequent.
  - State is internal to the map instance; external persistence requires separate handling.

### Data Swapping Approach
- **Mechanism**: Replaces the entire `Source.data` with new GeoJSON on each update.
- **Pros**:
  - Properties are always "true" values, simplifying styling, hit-testing, and popups.
  - No state management complexity; properties are directly in the data.
  - Straightforward for filtering, aggregation, or complex property-based logic.
- **Cons**:
  - Each update triggers re-parsing and re-indexing in the map worker, causing potential stuttering with large datasets.
  - Inefficient for high-frequency updates due to full data transfer and processing.
  - Larger GeoJSON payloads increase memory and transfer overhead.

## Why Official Examples Use Data Swapping

Examples like [react-map-gl geojson](https://github.com/visgl/react-map-gl/blob/8.0-release/examples/maplibre/geojson/src/app.tsx) and [geojson-animation](https://github.com/visgl/react-map-gl/blob/8.0-release/examples/maplibre/geojson-animation/src/app.tsx) recreate data because:

- **Low-frequency changes**: Year/month switches are infrequent events, not continuous animations.
- **Simplicity**: Direct property updates make demos clearer and avoid state management complexity.
- **Geometry changes**: Animation examples involve moving geometry (e.g., point coordinates), which feature-state cannot handle.

## Adopted Strategy for This Project

### Hybrid Approach
- **High-frequency time animation** (slider playback): Use Feature State for efficient updates.
- **Low-frequency dataset changes** (year/month/scenario switches): Use Data Swapping for clean state reset.
- **Data optimization**: Pass minimal GeoJSON to Source (coordinates, stable IDs, latest display properties only). Keep time-series arrays in React state, render via feature-state.

### Rationale
- **Dataset characteristics**: ~1000+ weather stations with static coordinates but time-varying WBGT values and colors.
- **Usage patterns**: Time slider for hourly playback (high-frequency) vs. monthly data switches (low-frequency).
- **Performance**: Feature-state avoids re-parsing overhead during animation; data swapping ensures clean resets on major changes.
- **Memory efficiency**: Separating time-series from map data reduces worker memory and transfer costs.

### Implementation Details
- **Stable IDs**: Each GeoJSON feature has a top-level `id` for reliable feature-state targeting.
- **State re-application**: On style load or data swap, re-apply current time's feature states.
- **Optimization**: Batch updates, use `requestAnimationFrame`, and limit update frequency to prevent main thread overload.
- **Fallback**: Style expressions use `coalesce(["feature-state", "riskColor"], ["get", "riskColor"])` to handle initial renders.

## Conclusion

The hybrid approach balances performance and simplicity: Feature State for smooth animations, Data Swapping for reliable resets. This ensures the heat map remains responsive during time playback while maintaining data integrity across dataset changes. For future optimizations, consider measuring FPS/CPU usage to fine-tune update intervals or add diagnostic toggles between approaches.
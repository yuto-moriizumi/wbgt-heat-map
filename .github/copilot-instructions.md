# GitHub Copilot Instructions

## About This Project

This is a Next.js application that displays a nationwide Wet Bulb Globe Temperature (WBGT) heat map for Japan. The primary goal is to provide a user-friendly visualization of heat stress levels, similar to the Tokyo WBGT Map.

The application fetches real-time and forecast data from the Ministry of the Environment's data service and presents it on an interactive map.

## Architecture

The project follows a standard Next.js App Router structure.

- **`src/app/page.tsx`**: The main entry point of the application. It's a Server Component that fetches the initial WBGT data using `fetchWbgtData`.
- **`src/components/WbgtMap.tsx`**: A Client Component (`"use client"`) that renders the interactive map using `maplibre-gl`. It takes the GeoJSON data as a prop and is responsible for all map-related UI and interactions, including markers, popups, and styling.
- **`src/lib/wbgt-data.ts`**: This is the core of the data fetching and processing logic.
  - `fetchWbgtData`: Fetches WBGT data from the Ministry of the Environment's API. It handles fetching from multiple potential URLs.
  - `getStations`: Retrieves station metadata from `public/data/stations.json`.
  - `getRiskLevel`, `getWBGTColor`, `getWBGTLevel`: These utility functions determine the risk level and corresponding color for a given WBGT value.
- **`public/data/stations.json`**: A static JSON file containing the master list of observation stations, including their ID, name, and coordinates.

## Data Flow

1.  The `Home` component (`src/app/page.tsx`) is rendered on the server.
2.  It calls `fetchWbgtData()` from `src/lib/wbgt-data.ts`.
3.  `fetchWbgtData()` fetches the latest WBGT data (CSV format) from the external API and station data from `public/data/stations.json`.
4.  The CSV data is parsed, and both data sources are combined into a GeoJSON `FeatureCollection`.
5.  The GeoJSON is passed as a prop to the `WbgtMap` component.
6.  `WbgtMap` renders the map on the client-side, visualizing the GeoJSON data as points.

## Developer Workflow

- **Run development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Run production server**: `npm run start`
- **Lint code**: `npm run lint`

## Key Libraries

- **Next.js (App Router)**: The primary framework.
- **React**: For building the UI.
- **MapLibre GL JS**: For rendering the interactive map.
- **Tailwind CSS**: For styling.
- **TypeScript**: For type safety.

## Coding Conventions

- Use server components for data fetching whenever possible to improve performance.
- Isolate client-side logic (like map interactions) into Client Components (`"use client"`).
- Keep data fetching and business logic separate from UI components, primarily in the `src/lib` directory.
- When working with map layers, refer to the `WbgtMap` component for examples of how to add sources and layers for WBGT data. The circle color is determined by the `riskColor` property in the GeoJSON.

## Meta Instructions

- This `copilot-instructions.md` file should be kept up-to-date as the project evolves.
- The `docs/plan.md` file contains the project's TODO list. Refer to it to understand the next development steps, and update it after planning and completing each task.
- Before finishing a task, start the development server and use Playwright MCP tools to open the application and verify that the page title is visible on the screen. Once you confirm "WBGT" is shown in <h1> element, you can consider the task as completed.
- After making code changes, run `npm run typecheck` to check for type errors.
- If you're Grok Code Fast 1 or Sonnic, don't take screenshot.

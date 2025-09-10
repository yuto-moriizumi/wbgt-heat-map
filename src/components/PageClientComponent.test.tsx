
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PageClientComponent } from "./PageClientComponent";
import { WbgtGeoJSON } from "@/lib/types";
import dayjs from "dayjs";

// Mock MapRenderer
const mockMapRenderer = vi.fn();
vi.mock("./MapRenderer", () => ({
  MapRenderer: (props: {
    wbgtData: WbgtGeoJSON;
    currentTimeIndex: number;
    showDailyMax?: boolean;
  }) => {
    mockMapRenderer(props);
    return <div data-testid="mock-map-renderer" />;
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: { [key: string]: string } = {
      stationName: "Station Name",
      wbgt: "WBGT",
      riskLevel: "Risk Level",
      dailyMaxLabel: "Show daily max",
      play: "再生",
      pause: "一時停止",
      previous: "前へ",
      next: "次へ",
    };
    return translations[key] || key;
  },
}));

const mockWbgtData: WbgtGeoJSON = {
  type: "FeatureCollection",
  features: [],
};

const mockTimePoints = [
  "2023-07-21T10:00:00Z",
  "2023-07-21T11:00:00Z",
  "2023-07-22T10:00:00Z",
  "2023-07-22T11:00:00Z",
];

describe("PageClientComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render correctly and pass initial props to MapRenderer", () => {
    render(
      <PageClientComponent
        wbgtData={mockWbgtData}
        timePoints={mockTimePoints}
      />
    );

    expect(screen.getByTestId("mock-map-renderer")).toBeInTheDocument();
    expect(mockMapRenderer).toHaveBeenCalledTimes(1);

    const lastCallProps = mockMapRenderer.mock.calls[0][0];
    expect(lastCallProps.wbgtData).toEqual(mockWbgtData);
    expect(lastCallProps.currentTimeIndex).toBe(0);
    expect(lastCallProps.showDailyMax).toBe(false);
  });

  it("should update props for MapRenderer when DailyMaxToggle is clicked", () => {
    render(
      <PageClientComponent
        wbgtData={mockWbgtData}
        timePoints={mockTimePoints}
      />
    );

    const checkbox = screen.getByLabelText("Show daily max");
    fireEvent.click(checkbox);

    expect(mockMapRenderer).toHaveBeenCalledTimes(2);
    const lastCallProps = mockMapRenderer.mock.calls[1][0];

    expect(lastCallProps.showDailyMax).toBe(true);
    expect(lastCallProps.currentTimeIndex).toBe(0); // Should reset to 0
  });

  it("should update currentTimeIndex when TimeSlider is changed", () => {
    render(
      <PageClientComponent
        wbgtData={mockWbgtData}
        timePoints={mockTimePoints}
      />
    );

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "2" } });

    expect(mockMapRenderer).toHaveBeenCalledTimes(2);
    const lastCallProps = mockMapRenderer.mock.calls[1][0];

    expect(lastCallProps.currentTimeIndex).toBe(2);
  });

  it("should toggle isPlaying state when play/pause button is clicked", () => {
    render(
      <PageClientComponent
        wbgtData={mockWbgtData}
        timePoints={mockTimePoints}
      />
    );

    // Initial state: should show "再生" (Play) button
    const playButton = screen.getByTitle("再生");
    expect(playButton).toBeInTheDocument();

    // Click to play
    fireEvent.click(playButton);

    // After click: should show "一時停止" (Pause) button
    const pauseButton = screen.getByTitle("一時停止");
    expect(pauseButton).toBeInTheDocument();

    // Click to pause
    fireEvent.click(pauseButton);

    // After second click: should show "再生" (Play) button again
    expect(screen.getByTitle("再生")).toBeInTheDocument();
  });
});

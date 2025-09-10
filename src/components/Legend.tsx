import { getTranslations } from "next-intl/server";
import { LEGEND_ITEMS } from "@/lib/wbgt-config";

interface LegendProps {
  locale: string;
}

export async function Legend({ locale }: LegendProps) {
  const tMap = await getTranslations({ locale, namespace: "WbgtMap" });

  const legendItems = LEGEND_ITEMS.map((item) => ({
    color: item.color,
    label: tMap(item.level),
  }));

  return (
    <div className="absolute bottom-10 left-2 bg-white p-3 rounded-lg shadow-lg">
      <h4 className="font-bold text-sm mb-2 text-black">
        {tMap("legendTitle")}
      </h4>
      <div className="space-y-1 text-xs">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-black font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

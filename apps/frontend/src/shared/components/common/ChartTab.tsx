import React, { useEffect, useState } from "react";

interface TabOption {
  key: string;
  label: string;
}

interface ChartTabProps {
  tabs: TabOption[];
  defaultKey?: string;
  onChange?: (key: string) => void;
}

const ChartTab: React.FC<ChartTabProps> = ({
  tabs,
  defaultKey,
  onChange,
}) => {
  const [selected, setSelected] = useState(defaultKey || tabs[0]?.key);

  useEffect(() => {
    if (!defaultKey) return;
    setSelected(defaultKey);
  }, [defaultKey]);

  const handleSelect = (key: string) => {
    setSelected(key);
    onChange?.(key);
  };

  const getButtonClass = (key: string) =>
    selected === key
      ? "shadow-theme-xs bg-app text-app"
      : "text-app-muted";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-app-subtle p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleSelect(tab.key)}
          className={`rounded-md px-3 py-2 text-theme-sm font-medium transition hover:text-app ${getButtonClass(
            tab.key
          )}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ChartTab;

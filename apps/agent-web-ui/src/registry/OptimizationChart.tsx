import React from "react";

interface OptimizationChartProps {
  data?: number[];
  label?: string;
}

const OptimizationChart: React.FC<OptimizationChartProps> = ({
  data = [10, 20, 15, 30, 25],
  label = "Optimization Progress",
}) => {
  const maxVal = Math.max(...data);
  const height = 100;
  const width = 200;

  return (
    <div
      style={{
        padding: "15px",
        border: "1px solid #333",
        borderRadius: "4px",
        backgroundColor: "#050505",
      }}
    >
      <div
        style={{
          marginBottom: "10px",
          fontSize: "12px",
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: `${height}px`,
          gap: "4px",
        }}
      >
        {data.map((val, i) => (
          <div
            key={i}
            style={{
              width: `${width / data.length - 4}px`,
              height: `${(val / maxVal) * height}px`,
              backgroundColor: "#fff",
              transition: "height 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizationChart;

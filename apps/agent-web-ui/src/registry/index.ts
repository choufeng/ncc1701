import React from "react";
import OptimizationChart from "./OptimizationChart";

export const COMPONENT_REGISTRY: Record<string, React.FC<any>> = {
  OptimizationChart: OptimizationChart,
};

export const buildChartData = (metrics: any[]) => {
  return metrics.map((m) => ({
    label: m.metric,
    value: m.value
  }));
};

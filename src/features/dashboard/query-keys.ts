export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  alerts: () => [...dashboardKeys.all, 'alerts'] as const,
};

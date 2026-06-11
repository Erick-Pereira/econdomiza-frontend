import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card } from '../../../components/ui/Card';
function formatCurrencyBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
import type { MonthlyChartPoint } from '../../../lib/dashboard-monthly-series';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  series: MonthlyChartPoint[];
  year: number;
  isLoading?: boolean;
  error?: string | null;
};

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
          return `${ctx.dataset.label}: ${formatCurrencyBrl(value)}`;
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) => formatCurrencyBrl(Number(value)),
      },
    },
  },
};

export function DashboardMonthlyChart({ series, year, isLoading, error }: Props) {
  const hasData = series.some((p) => p.totalAmount > 0 || p.outstanding > 0);

  const data = {
    labels: series.map((p) => p.label),
    datasets: [
      {
        label: 'Gasto processado',
        data: series.map((p) => p.totalAmount),
        backgroundColor: 'rgba(37, 99, 235, 0.65)',
        borderRadius: 6,
      },
      {
        label: 'Em aberto',
        data: series.map((p) => p.outstanding),
        backgroundColor: 'rgba(245, 158, 11, 0.75)',
        borderRadius: 6,
      },
    ],
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-main">Gastos por mês ({year})</h2>
          <p className="text-sm text-text-muted">
            Visualização interativa de valores auditados e pendências por competência.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-status-warning" role="status">
          Não foi possível carregar o gráfico: {error}
        </p>
      )}

      {!error && isLoading && (
        <div className="flex h-64 items-center justify-center text-sm text-text-muted">
          Carregando gráfico…
        </div>
      )}

      {!error && !isLoading && !hasData && (
        <div className="flex h-64 items-center justify-center text-sm text-text-muted">
          Sem despesas processadas neste ano para exibir no gráfico.
        </div>
      )}

      {!error && !isLoading && hasData && (
        <div className="h-64 min-h-[16rem] w-full" aria-label={`Gráfico de gastos mensais ${year}`}>
          <Bar data={data} options={chartOptions} />
        </div>
      )}
    </Card>
  );
}

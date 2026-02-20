
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { GlassCard } from './GlassCard';
import { formatCurrency } from '@/lib/format';
import { Scissors, TrendingUp } from 'lucide-react';

interface RevenueData {
  name: string;
  revenue: number;
  count: number;
  photo?: string;
}

interface RevenueByBarberChartProps {
  data: RevenueData[];
  total: number;
}

const BARBER_COLORS = [
  { bar: '#6366f1', glow: 'rgba(99,102,241,0.3)' },   // indigo
  { bar: '#a855f7', glow: 'rgba(168,85,247,0.3)' },   // purple
  { bar: '#ec4899', glow: 'rgba(236,72,153,0.3)' },   // pink
  { bar: '#f43f5e', glow: 'rgba(244,63,94,0.3)' },    // rose
  { bar: '#14b8a6', glow: 'rgba(20,184,166,0.3)' },   // teal
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-sm font-bold text-white">{d.name}</p>
      <p className="text-xs text-gray-400 mt-1">
        <span className="text-white font-semibold">{formatCurrency(d.revenue)}</span> • {d.count} atendimentos
      </p>
    </div>
  );
};

export function RevenueByBarberChart({ data, total }: RevenueByBarberChartProps) {
  const hasData = data.length > 0 && data.some(d => d.revenue > 0);

  return (
    <GlassCard className="p-6 h-full flex flex-col" glowColor="rgba(99,102,241,0.4)">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20">
            <Scissors size={18} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Faturamento por Barbeiro</h3>
            <p className="text-xs text-gray-500">Receita gerada este mês</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          <TrendingUp size={12} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400">{formatCurrency(total)}</span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
          <Scissors size={40} className="opacity-20" />
          <p className="text-sm">Nenhum atendimento com barbeiro registrado este mês</p>
          <p className="text-xs text-gray-600">Atribua barbeiros nos atendimentos para ver os dados aqui</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {data.map((_, index) => (
                    <linearGradient id={`barGrad-${index}`} x1="0" y1="0" x2="1" y2="0" key={index}>
                      <stop offset="0%" stopColor={BARBER_COLORS[index % BARBER_COLORS.length].bar} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={BARBER_COLORS[index % BARBER_COLORS.length].bar} stopOpacity={0.9} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  width={85}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={28} animationDuration={1200} animationEasing="ease-out">
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGrad-${index})`}
                      stroke={BARBER_COLORS[index % BARBER_COLORS.length].bar}
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {data.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-lg"
                  style={{
                    backgroundColor: BARBER_COLORS[index % BARBER_COLORS.length].bar,
                    boxShadow: `0 0 8px ${BARBER_COLORS[index % BARBER_COLORS.length].glow}`,
                  }}
                />
                <span className="text-xs text-gray-400">{entry.name}</span>
                <span className="text-xs font-bold text-white">{formatCurrency(entry.revenue)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}

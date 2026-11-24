'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardChart({ data }: { data: any[] }) {
  const chartData = (data ?? []).map((d: any) => ({
    date: d?.date?.slice(5) ?? '',
    Criados: d?.created ?? 0,
    Enviados: d?.sent ?? 0,
  }));

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
          <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'Dia', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }} />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Criados" fill="#60B5FF" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Enviados" fill="#1A7A3C" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ReportsChart({ data }: { data: any[] }) {
  const chartData = (data ?? []).map((d: any) => ({
    date: d?.date?.slice(5) ?? '',
    Receita: d?.revenue ?? 0,
    Pedidos: d?.sent ?? 0,
  }));

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#CD0301" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#CD0301" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any, name: any) => name === 'Receita' ? [`R$ ${Number(v).toFixed(2)}`, 'Receita'] : [v, 'Pedidos']} />
          <Area type="monotone" dataKey="Receita" stroke="#CD0301" strokeWidth={2} fill="url(#revGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

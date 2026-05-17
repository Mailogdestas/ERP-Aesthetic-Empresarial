import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
export const RevenueChart = ({ data }: { data: Array<{ date: string; revenue: number }> }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="revenue" stroke="#3182CE" />
    </LineChart>
  </ResponsiveContainer>
);
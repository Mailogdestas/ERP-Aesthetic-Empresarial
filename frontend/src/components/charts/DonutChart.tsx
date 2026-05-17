import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card } from '../ui/Card';
import { Heading } from '@chakra-ui/react';

const COLORS = ['#5D0C95', '#ECC94B', '#68D391', '#CBD5E0'];

export const DonutChartCard: React.FC<{ title: string; data: Array<{ name: string; value: number }> }>
  = ({ title, data }) => (
  <Card>
    <Heading size="sm" mb={2}>{title}</Heading>
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </Card>
);
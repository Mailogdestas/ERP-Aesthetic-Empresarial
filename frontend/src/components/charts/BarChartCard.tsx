import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Card } from '../ui/Card';
import { Heading } from '@chakra-ui/react';

type Item = Record<string, string | number>;

export const BarChartCard: React.FC<{
  title: string;
  data: Item[];
  xKey: string;
  yKey: string;
  orientation?: 'vertical' | 'horizontal';
  color?: string;
}> = ({ title, data, xKey, yKey, orientation = 'vertical', color = '#5D0C95' }) => (
  <Card>
    <Heading size="sm" mb={2}>{title}</Heading>
    <ResponsiveContainer width="100%" height={240}>
      {orientation === 'vertical' ? (
        <BarChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={yKey} fill={color} />
        </BarChart>
      ) : (
        // Horizontal: XAxis is numeric and YAxis is categorical
        <BarChart data={data} layout="vertical">
          <XAxis type="number" />
          <YAxis type="category" dataKey={xKey} width={100} />
          <Tooltip />
          <Bar dataKey={yKey} fill={color} />
        </BarChart>
      )}
    </ResponsiveContainer>
  </Card>
);
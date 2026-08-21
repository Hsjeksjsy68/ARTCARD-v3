import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PricePoint } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO } from 'date-fns';

interface PriceChartProps {
  data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
  const isPositive = data.length > 1 ? data[data.length - 1].price >= data[0].price : true;
  const strokeColor = isPositive ? '#000000' : '#ef4444'; // Black or red
  const fillColor = isPositive ? '#D4FF00' : '#fee2e2';

  // If there's only one point, duplicate it to draw a flat line
  const chartData = data.length === 1 ? [
    { ...data[0], date: new Date(new Date(data[0].date).getTime() - 24 * 60 * 60 * 1000).toISOString() },
    data[0]
  ] : data;

  return (
    <div className="h-[250px] w-full mt-4 font-sans font-black">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" vertical={false} strokeWidth={1} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
              try {
                return format(parseISO(tick), 'MMM d, h:mm a').toUpperCase();
              } catch (e) {
                return tick;
              }
            }}
            stroke="#a3a3a3" 
            fontSize={10}
            tickMargin={12}
            minTickGap={30}
            axisLine={{ stroke: '#000000', strokeWidth: 2 }}
            tickLine={{ stroke: '#000000', strokeWidth: 2 }}
          />
          <YAxis 
            stroke="#a3a3a3" 
            fontSize={10}
            tickFormatter={(value) => `৳${value}`}
            axisLine={{ stroke: '#000000', strokeWidth: 2 }}
            tickLine={{ stroke: '#000000', strokeWidth: 2 }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderColor: '#000', borderWidth: '2px', borderRadius: '0px', color: '#000', padding: '12px' }}
            itemStyle={{ color: strokeColor, fontWeight: '900', fontSize: '16px' }}
            labelStyle={{ color: '#737373', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900' }}
            formatter={(value: number) => [formatCurrency(value), 'PRICE']}
            labelFormatter={(label) => {
              try {
                return format(parseISO(label as string), 'MMM d, yyyy h:mm a').toUpperCase();
              } catch (e) {
                return label;
              }
            }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={strokeColor} 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorPrice)"
            activeDot={{ r: 6, fill: strokeColor, stroke: '#fff', strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

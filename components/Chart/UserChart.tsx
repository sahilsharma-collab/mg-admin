"use client"
import { useTheme } from '@/context/theme-context';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Define data structure types
interface MonthlyStat {
  month: string;
  totalUsers: number;
  activeUsers: number;
  exnessVerifiedUsers: number;
  guestUsers: number;
}

// Type for the tooltip payload
interface CustomTooltipPayload {
  name: string;
  value: number;
  fill: string;
}

// Props type for CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

// Props type for CustomCursor
interface CustomCursorProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// Props for UserChart component
interface UserChartProps {
  monthlyStats: MonthlyStat[];
}

// Custom white tooltip component
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'white',
        padding: '12px',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        color: '#333',
        fontSize: '12px',
        minWidth: '160px',
      }}>
        <p className="label" style={{
          marginBottom: '10px',
          fontWeight: 'bold',
          borderBottom: '1px solid #eaeaea',
          paddingBottom: '6px',
          color: '#000',
          fontSize: '14px'
        }}>{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '8px 0',
            color: '#555'
          }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                marginRight: '6px',
                backgroundColor: entry.fill,
                borderRadius: '2px'
              }}></span>
              <span>{entry.name}:</span>
            </span>
            <span style={{
              fontWeight: '600',
              color: '#000',
              marginLeft: '12px'
            }}>{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Define custom cursor for a slightly darker hover effect
const CustomCursor: React.FC<CustomCursorProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0 } = props;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(0, 0, 0, 0.08)"
    />
  );
};

const UserChart: React.FC<UserChartProps> = ({ monthlyStats }) => {
  const { theme } = useTheme();

  // Transform month names to short format if needed
  const chartData = monthlyStats.map(stat => ({
    ...stat,
    month: stat.month.split(' ')[0], // Takes only the month part (e.g., "Mar" from "Mar 2025")
    approvedUsers: stat.exnessVerifiedUsers // Map to the expected key
  }));

  return (
    <div style={{ width: '100%', height: 450 }} className='bg-[#4A87D833] border dark:border-[#FFFFFF33] border-[#00000033] py-3 rounded-2xl'>
      {/* custom legend */}
      <div className="flex flex-wrap gap-4 ml-10 my-4">
        <div className="flex items-center">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#C350C8' }} className="mr-2"></div>
          <span className="">Total Users</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#0ABAB5' }} className="mr-2"></div>
          <span className="">Active Users</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#5F0ABA' }} className="mr-2"></div>
          <span className="">Verified Users</span>
        </div>
        <div className="flex items-center">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#BEBDBF' }} className="mr-2"></div>
          <span className="">Guest Users</span>
        </div>
      </div>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 10,
            bottom: 50,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === 'dark' ? 'rgba(179, 165, 198, 0.2)' : 'rgba(0, 0, 0, 0.1)'}
          />
          <XAxis
            dataKey="month"
            tick={{
              fill: theme === 'dark' ? '#B3A5C6' : 'black'
            }}
            axisLine={{
              stroke: theme === 'dark' ? '#B3A5C6' : 'black'
            }}
          />
          <YAxis
            tick={{
              fill: theme === 'dark' ? '#B3A5C6' : 'black'
            }}
            axisLine={{
              stroke: theme === 'dark' ? '#B3A5C6' : 'black'
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={<CustomCursor />}
            wrapperStyle={{ outline: 'none' }}
            animationDuration={300}
          />
          <Bar dataKey="totalUsers" stackId="a" fill="#C350C8" name="Total Users" />
          <Bar dataKey="activeUsers" stackId="a" fill="#0ABAB5" name="Active Users" />
          <Bar dataKey="approvedUsers" stackId="a" fill="#5F0ABA" name="Verified Users" />
          <Bar dataKey="guestUsers" stackId="a" fill="#BEBDBF" name="Guest Users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserChart;
'use client';

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Subscription } from '@/utils/supabase';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface UpdateDistributionChartProps {
  subscriptions: Subscription[];
  userProfiles: { [key: string]: { display_name: string } };
}

export function UpdateDistributionChart({ subscriptions, userProfiles }: UpdateDistributionChartProps) {
  // Calculate update distribution
  const updatesByUser = subscriptions.reduce((acc: { [key: string]: number }, subscription) => {
    if (subscription.updated_by) {
      acc[subscription.updated_by] = (acc[subscription.updated_by] || 0) + 1;
    }
    return acc;
  }, {});

  // Prepare data for the chart
  const data: ChartData<'pie'> = {
    labels: Object.keys(updatesByUser).map(userId => 
      userProfiles[userId]?.display_name || 'Unknown User'
    ),
    datasets: [{
      data: Object.values(updatesByUser),
      backgroundColor: [
        'rgba(147, 51, 234, 0.7)',  // Purple
        'rgba(234, 179, 8, 0.7)',   // Yellow
        'rgba(34, 197, 94, 0.7)',   // Green
        'rgba(59, 130, 246, 0.7)',  // Blue
        'rgba(239, 68, 68, 0.7)',   // Red
      ],
      borderColor: [
        'rgba(147, 51, 234, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(239, 68, 68, 1)',
      ],
      borderWidth: 1,
    }],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9CA3AF',  // text-gray-400
          padding: 20,
          font: {
            size: 12
          }
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = Object.values(updatesByUser).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} updates (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-64 h-64">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
} 
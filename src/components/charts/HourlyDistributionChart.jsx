import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const HourlyDistributionChart = ({ labels, data }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accidents per Hour',
        data,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: 'Hourly Distribution',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#ffffff',
          stepSize: 1
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#ffffff',
          maxRotation: 0,
          minRotation: 0
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  return (
    <div style={{ 
      height: '16rem', 
      maxHeight: '16rem',
      padding: '0.5rem 0.25rem',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// OPTIMIZATION: Prevent unnecessary re-renders
// Only re-render when labels or data arrays change
export default React.memo(HourlyDistributionChart, (prevProps, nextProps) => {
  return (
    prevProps.labels === nextProps.labels &&
    prevProps.data === nextProps.data
  );
});

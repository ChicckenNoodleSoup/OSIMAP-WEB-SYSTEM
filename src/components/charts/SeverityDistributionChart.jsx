import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SeverityDistributionChart = ({ labels, data }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accidents by Severity',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
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
        position: 'right',
        labels: {
          color: '#ffffff',
          font: { size: 12 },
          padding: 15
        }
      },
      title: {
        display: true,
        text: 'Severity Distribution',
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
      overflow: 'hidden',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center'
    }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default SeverityDistributionChart;

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './DashboardMapInsightsCarousel.css';

import MonthlyTrendChart from './charts/MonthlyTrendChart';
import HourlyDistributionChart from './charts/HourlyDistributionChart';
import SeverityDistributionChart from './charts/SeverityDistributionChart';
import { aggregateMonthly, aggregateHourly, aggregateBySeverity } from '../utils/chartDataAggregators';

const DashboardMapInsightsCarousel = ({ selectedYear, supabaseClient }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    monthly: { labels: [], data: [] },
    hourly: { labels: [], data: [] },
    severity: { labels: [], data: [] }
  });

  useEffect(() => {
    const fetchAccidentData = async () => {
      if (!supabaseClient) {
        setError('Database connection not available');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let allRecords = [];
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let done = false;

        // Fetch all records with pagination (handles years with >1000 records)
        while (!done) {
          const { data, error: supabaseError } = await supabaseClient
            .from('road_traffic_accident')
            .select('datecommitted, timecommitted, severity')
            .eq('year', Number(selectedYear))
            .range(from, to);

          if (supabaseError) throw supabaseError;

          allRecords = [...allRecords, ...(data || [])];
          
          if (!data || data.length < pageSize) {
            done = true;
          } else {
            from += pageSize;
            to += pageSize;
          }
        }

        if (allRecords.length > 0) {
          setChartData({
            monthly: aggregateMonthly(allRecords),
            hourly: aggregateHourly(allRecords),
            severity: aggregateBySeverity(allRecords)
          });
        } else {
          setChartData({
            monthly: { labels: [], data: [] },
            hourly: { labels: [], data: [] },
            severity: { labels: [], data: [] }
          });
        }
      } catch (err) {
        console.error('Error fetching accident data:', err);
        setError(`Failed to load chart data: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    if (selectedYear && supabaseClient) {
      fetchAccidentData();
    }
  }, [selectedYear, supabaseClient]);

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#ffffff',
        fontSize: '14px'
      }}>
        Loading insights...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#ff6b6b',
        fontSize: '14px'
      }}>
        {error}
      </div>
    );
  }

  const hasData = chartData.monthly.data.length > 0 || 
                  chartData.hourly.data.length > 0 || 
                  chartData.severity.data.length > 0;

  if (!hasData) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#ffffff',
        fontSize: '14px',
        opacity: 0.7
      }}>
        No data available for {selectedYear}
      </div>
    );
  }

  return (
    <div 
      className="insights-carousel-wrapper"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="carousel-mask-container">
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          slidesPerGroup={1}
          navigation={true}
          pagination={{ clickable: true }}
          watchOverflow={true}
          allowTouchMove={true}
          speed={400}
          effect="slide"
          resistanceRatio={0}
          preventInteractionOnTransition={true}
        >
        <SwiperSlide>
          <MonthlyTrendChart 
            labels={chartData.monthly.labels} 
            data={chartData.monthly.data} 
          />
        </SwiperSlide>

        <SwiperSlide>
          <HourlyDistributionChart 
            labels={chartData.hourly.labels} 
            data={chartData.hourly.data} 
          />
        </SwiperSlide>

        <SwiperSlide>
          <SeverityDistributionChart 
            labels={chartData.severity.labels} 
            data={chartData.severity.data} 
          />
        </SwiperSlide>
      </Swiper>
      </div>
    </div>
  );
};

export default DashboardMapInsightsCarousel;

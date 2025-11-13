/**
 * Pure functions for aggregating accident data for Chart.js
 * Input: array of records from road_traffic_accident table
 * Output: { labels: [], data: [] } ready for Chart.js datasets
 */

/**
 * Aggregate accidents by month (Jan-Dec)
 * @param {Array} records - Array of accident records with datecommitted
 * @returns {Object} - { labels: ['Jan', 'Feb', ...], data: [count, ...] }
 */
export const aggregateMonthly = (records) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCounts = new Array(12).fill(0);

  records.forEach((record) => {
    if (!record.datecommitted) return;
    
    try {
      const date = new Date(record.datecommitted);
      if (!isNaN(date.getTime())) {
        const month = date.getMonth(); // 0-11
        monthlyCounts[month]++;
      }
    } catch (error) {
      console.warn('Invalid datecommitted format:', record.datecommitted);
    }
  });

  return {
    labels: monthNames,
    data: monthlyCounts
  };
};

/**
 * Aggregate accidents by hour (00-23)
 * @param {Array} records - Array of accident records with timecommitted
 * @returns {Object} - { labels: ['00', '01', ..., '23'], data: [count, ...] }
 */
export const aggregateHourly = (records) => {
  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const hourlyCounts = new Array(24).fill(0);

  records.forEach((record) => {
    if (!record.timecommitted) return;
    
    try {
      // Parse time string (format: HH:MM:SS or HH:MM)
      const timeStr = String(record.timecommitted).trim();
      const timeParts = timeStr.split(':');
      
      if (timeParts.length >= 1) {
        const hour = parseInt(timeParts[0], 10);
        if (hour >= 0 && hour <= 23) {
          hourlyCounts[hour]++;
        }
      }
    } catch (error) {
      console.warn('Invalid timecommitted format:', record.timecommitted);
    }
  });

  return {
    labels: hourLabels,
    data: hourlyCounts
  };
};

/**
 * Aggregate accidents by severity
 * @param {Array} records - Array of accident records with severity field
 * @returns {Object} - { labels: ['Fatal', 'Serious', ...], data: [count, ...] }
 */
export const aggregateBySeverity = (records) => {
  const severityCounts = {};

  records.forEach((record) => {
    // Match Dashboard.js logic: treat null/undefined as 'Unknown'
    const severity = (record.severity ?? 'Unknown').toString().trim();
    
    if (severity) {
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    }
  });

  // Sort by count descending for better visualization
  const sorted = Object.entries(severityCounts).sort((a, b) => b[1] - a[1]);

  return {
    labels: sorted.map(([label]) => label),
    data: sorted.map(([, count]) => count)
  };
};

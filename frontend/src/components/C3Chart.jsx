import React, { useEffect, useRef } from 'react';
import c3 from 'c3';
import 'c3/c3.css';

/**
 * C3Chart React Wrapper
 * @param {Object} options - C3 configuration object
 * @param {Array} data - Data to load into the chart
 * @param {string} type - Chart type (pie, spline, area, etc.)
 */
const C3Chart = ({ options = {}, data = null, type = 'line', className = '' }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        // Initial chart generation
        if (chartRef.current) {
            chartInstance.current = c3.generate({
                bindto: chartRef.current,
                ...options,
                data: {
                    ...options.data,
                    type: type,
                    columns: data || [],
                },
            });
        }

        // Cleanup on unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, []); // Only on mount

    // Update data when it changes
    useEffect(() => {
        if (chartInstance.current && data) {
            chartInstance.current.load({
                columns: data,
                type: type,
            });
        }
    }, [data, type]);

    return <div ref={chartRef} className={`c3-chart-container ${className}`} />;
};

export default C3Chart;

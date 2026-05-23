'use client'
import React, { useState } from 'react';

const DownloadsChart = () => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const data = [
    { label: 'Leesvaardigheid', value: 45, color: 'bg-blue-500', stroke: '#3b82f6' },
    { label: 'Schrijfvaardigheid', value: 30, color: 'bg-orange-400', stroke: '#fb923c' },
    { label: 'Literatuur', value: 25, color: 'bg-purple-500', stroke: '#a855f7' },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Materiaal per Domein</h3>
      </div>

      {/* Pie Chart */}
      <div className="flex justify-center mb-6 relative">
        <svg width="180" height="180" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const segmentLength = (item.value / total) * circumference;
            // Removed unused 'percentage' variable
            const segment = (
              <g key={item.label}>
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={item.stroke}
                  strokeWidth="50"
                  strokeDasharray={`${segmentLength} ${circumference}`}
                  strokeDashoffset={-currentOffset}
                  transform="rotate(-90 100 100)"
                  onMouseEnter={() => setHoveredSegment(index)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className="cursor-pointer transition-opacity duration-200"
                  style={{ opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.4 }}
                />
              </g>
            );
            currentOffset += segmentLength;
            return segment;
          })}
        </svg>
        
        {/* Tooltip */}
        {hoveredSegment !== null && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none">
            <div className="text-sm font-semibold">{data[hoveredSegment].label}</div>
            <div className="text-xs">{data[hoveredSegment].value} materialen</div>
            <div className="text-xs text-gray-300">{((data[hoveredSegment].value / total) * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-sm text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadsChart;
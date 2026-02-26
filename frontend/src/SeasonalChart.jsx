import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

const SeasonalChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChart() {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/chart/seasonal');
        setChartData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("加载失败", err);
        setLoading(false);
      }
    }
    fetchChart();
  }, []);

  if (loading) return <div style={{color: 'white'}}>正在计算季节分布...</div>;
  if (!chartData) return <div style={{color: 'white'}}>无数据</div>;

  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
      <Plot
        data={[
          {
            z: chartData.z,     // 颜色矩阵 (Lat x Ls)
            x: chartData.x,     // X轴: Ls
            y: chartData.y,     // Y轴: Lat
            type: 'heatmap',    // 图表类型
            colorscale: 'Jet',  // 经典的彩虹色，适合看极地高值
            colorbar: {
                title: 'Ozone (µm-atm)',
                titleside: 'right'
            },
            // 平滑处理：关掉可以让像素点更清晰，开启则更平滑
            zsmooth: 'best' 
          }
        ]}
        layout={{
          width: 800,
          height: 400,
          title: {
              text: 'Ls - Latitude Zonal Mean Ozone',
              font: { color: 'white' }
          },
          xaxis: { 
              title: 'Solar Longitude (Ls°)', 
              color: 'white',
              zeroline: false 
          },
          yaxis: { 
              title: 'Latitude (°)', 
              color: 'white',
              range: [-90, 90] 
          },
          paper_bgcolor: 'rgba(0,0,0,0)', // 透明背景
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: 'white' }
        }}
        config={{
            displayModeBar: true, // 显示工具栏（下载图片、缩放等）
            responsive: true
        }}
      />
      <p style={{color: '#ccc', fontSize: '12px', textAlign: 'center'}}>
        * 颜色代表该纬度圈上的臭氧平均值。红色区域表示臭氧富集区（通常在春季极地）。
      </p>
    </div>
  );
};

export default SeasonalChart;
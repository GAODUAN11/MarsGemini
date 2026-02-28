import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

const SeasonalLineChart = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/chart/seasonal-bands');
                setChartData(res.data);
                setLoading(false);
            } catch (err) {
                console.error("加载失败", err);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <div style={{ color: 'white' }}>正在计算纬度带数据...</div>;
    if (!chartData) return <div style={{ color: 'white' }}>无数据</div>;

    const traces = chartData.bands.map(band => ({
        x: chartData.ls,
        y: band.values,
        type: 'scatter',
        mode: 'lines',
        name: band.name,
        line: { width: 2 }
    }));

    return (
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
            <Plot
                data={traces}
                layout={{
                    width: 800,
                    height: 400,
                    title: {
                        text: 'Seasonal Ozone Trend by Latitude Band',
                        font: { color: 'white' }
                    },
                    xaxis: {
                        title: 'Solar Longitude (Ls°)',
                        color: 'white',
                        zeroline: false,
                        range: [0, 360]
                    },
                    yaxis: {
                        title: 'Ozone Column (µm-atm)',
                        color: 'white'
                    },
                    legend: {
                        font: { color: 'white' },
                        orientation: 'h',
                        y: -0.2
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: 'white' }
                }}
                config={{ displayModeBar: true, responsive: true }}
            />
            <p style={{ color: '#ccc', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
                * 展示不同纬度带（极地、中纬、赤道）随季节变化的臭氧含量趋势。
            </p>
        </div>
    );
};

export default SeasonalLineChart;

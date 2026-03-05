import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { fetchSeasonalBands } from '../services/api';
import { useDataContext } from '../contexts/DataContext';

const SeasonalLineChart = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 从全局上下文获取用户选择
    const { marsYear } = useDataContext();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const data = await fetchSeasonalBands(marsYear);
                setChartData(data);
            } catch (err) {
                console.error("加载失败", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [marsYear]); // 当火星年变化时重新加载

    if (loading) return <div style={{ color: 'white', padding: 20 }}>⏳ 正在计算 MY{marsYear} 纬度带数据...</div>;
    if (!chartData) return <div style={{ color: 'white', padding: 20 }}>无数据</div>;

    const traces = chartData.bands.map(band => ({
        x: chartData.ls,
        y: band.values,
        type: 'scatter',
        mode: 'lines',
        name: band.name,
        line: { width: 2 }
    }));

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Plot
                data={traces}
                layout={{
                    width: 500,
                    height: 250,
                    margin: { l: 40, r: 10, t: 10, b: 30 },
                    xaxis: {
                        title: 'Solar Longitude (Ls°)',
                        titlefont: { color: '#ccc', size: 10 },
                        tickfont: { color: '#ccc', size: 9 },
                        color: 'white',
                        zeroline: false,
                        range: [0, 360]
                    },
                    yaxis: {
                        title: 'Ozone (µm-atm)',
                        titlefont: { color: '#ccc', size: 10 },
                        tickfont: { color: '#ccc', size: 9 },
                        color: 'white'
                    },
                    showlegend: false, // 在新界面中已经在底部渲染了图例，因此隐藏内置图例
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: 'white' }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default SeasonalLineChart;

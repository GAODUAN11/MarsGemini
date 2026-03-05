import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { fetchSeasonalChart } from '../services/api';
import { useDataContext } from '../contexts/DataContext';

const SeasonalChart = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 从全局上下文获取用户选择
    const { marsYear } = useDataContext();

    useEffect(() => {
        async function fetchChart() {
            setLoading(true);
            try {
                const data = await fetchSeasonalChart(marsYear);
                setChartData(data);
            } catch (err) {
                console.error("加载失败", err);
            } finally {
                setLoading(false);
            }
        }
        fetchChart();
    }, [marsYear]); // 当火星年变化时重新加载

    if (loading) return <div style={{ color: 'white', padding: 20 }}>⏳ 正在计算 MY{marsYear} 季节分布...</div>;
    if (!chartData) return <div style={{ color: 'white', padding: 20 }}>无数据</div>;

    // 数据验证
    if (!chartData.z || chartData.z.length === 0) {
        return <div style={{ color: 'red', padding: 20 }}>错误: MY{marsYear} 数据矩阵为空</div>;
    }
    if (!chartData.x || chartData.x.length === 0) {
        return <div style={{ color: 'red', padding: 20 }}>错误: MY{marsYear} Ls数据为空</div>;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Plot
                data={[
                    {
                        z: chartData.z,     // 颜色矩阵 (Lat x Ls)
                        x: chartData.x,     // X轴: Ls
                        y: chartData.y,     // Y轴: Lat
                        type: 'heatmap',    // 图表类型
                        colorscale: 'Jet',  // 经典的彩虹色，适合看极地高值
                        zmin: chartData.min,  // 明确设置颜色范围下限
                        zmax: chartData.max,  // 明确设置颜色范围上限
                        colorbar: {
                            title: 'Ozone (µm-atm)',
                            titleside: 'right',
                            tickfont: { color: 'white' },
                            titlefont: { color: 'white' }
                        },
                        // 平滑处理：关掉可以让像素点更清晰，开启则更平滑
                        zsmooth: 'best',
                        connectgaps: true  // 连接间隙
                    }
                ]}
                layout={{
                    width: 500,
                    height: 250,
                    margin: { l: 40, r: 10, t: 10, b: 30 },
                    xaxis: {
                        title: 'Solar Longitude (Ls°)',
                        titlefont: { color: '#ccc', size: 10 },
                        tickfont: { color: '#ccc', size: 9 },
                        color: 'white',
                        zeroline: false
                    },
                    yaxis: {
                        title: 'Latitude (°)',
                        titlefont: { color: '#ccc', size: 10 },
                        tickfont: { color: '#ccc', size: 9 },
                        color: 'white',
                        range: [-90, 90]
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)', // 透明背景
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: 'white' }
                }}
                config={{
                    displayModeBar: false, // 隐藏工具栏以适应紧凑空间
                    responsive: true
                }}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default SeasonalChart;

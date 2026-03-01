// d:\A-development-project\MarsGemini\frontend\src\components\Mars3DViewer.jsx

import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import Webcam from 'react-webcam';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';
import { useHandControl } from '../hooks/useHandControl';
import { fetchMapData } from '../services/api';

const Mars3DViewer = () => {
    const [mapData, setMapData] = useState({ points: [], minVal: 0, maxVal: 1 });
    const [loading, setLoading] = useState(true);
    
    // 地球实例 Ref
    const globeEl = useRef();
    
    // 使用自定义 Hook 接管手势控制
    const { webcamRef, gestureStatus } = useHandControl(globeEl);

    // 加载数据
    useEffect(() => {
        async function fetchData() {
            try {
                const data = await fetchMapData();
                setMapData(data);
                setLoading(false);
            } catch (error) {
                console.error("数据加载失败", error);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const colorScale = scaleSequential(interpolateViridis)
        .domain([mapData.minVal, mapData.maxVal]);

    return (
        <>
            {/* 状态提示 (仅在地球模式显示) */}
            <div style={{ position: 'absolute', top: 100, left: 20, color: 'white', zIndex: 100 }}>
                <h3>状态: {gestureStatus}</h3>
                {loading && <p>正在加载地球数据...</p>}
            </div>

            {/* 摄像头小窗 */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 100, border: '2px solid white' }}>
                <Webcam
                    ref={webcamRef}
                    style={{ width: 160, height: 120, transform: "scaleX(-1)" }}
                />
            </div>

            {/* 3D 地球 */}
            <Globe
                ref={globeEl}
                globeImageUrl="/mars_texture.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                pointsData={mapData.points}
                pointLat="lat"
                pointLng="lng"
                pointColor={d => colorScale(d.val)}
                pointAltitude={0.01}
                pointRadius={1.2}
            />
        </>
    );
};

export default Mars3DViewer;

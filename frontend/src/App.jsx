import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import axios from 'axios';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';

// --- 引入手势控制库 ---
import Webcam from 'react-webcam';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

//引入季节图表组件
import SeasonalChart from './SeasonalChart';


function App() {
  const [mapData, setMapData] = useState({ points: [], minVal: 0, maxVal: 1 });
  const [loading, setLoading] = useState(true);
  
  // Ref 定义
  const globeEl = useRef();    // 地球实例
  const webcamRef = useRef(null); // 摄像头实例
  
  // 状态：用于显示当前检测到的手势动作
  const [gestureStatus, setGestureStatus] = useState("等待手势...");
  const [viewMode, setViewMode] = useState('globe'); // 'globe' 或 'chart'
  // 【新增】用来记录上一帧手势坐标的 Ref
  const prevHandPos = useRef({ x: null, y: null });
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  // 1. 初始化数据 (和之前一样)
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/map/demo');
        setMapData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("数据加载失败", error);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. 初始化 MediaPipe Hands (核心 AI 部分)
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,            // 只识别一只手
      modelComplexity: 1,        // 模型精度 (0最快, 1适中)
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults); // 当识别到手时，执行 onResults 函数
    handsRef.current = hands;

    return () => {
      hands.close();
    };
  }, []);

  // 3. 管理摄像头 (根据 viewMode 变化)
  useEffect(() => {
    if (viewMode === 'globe') {
      const startCamera = () => {
        if (webcamRef.current && webcamRef.current.video && handsRef.current) {
          const camera = new Camera(webcamRef.current.video, {
            onFrame: async () => {
              if (webcamRef.current && webcamRef.current.video) {
                await handsRef.current.send({ image: webcamRef.current.video });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraRef.current = camera;
        } else {
          // 如果 video 还没准备好（切换视图时可能需要一点时间），稍后重试
          setTimeout(startCamera, 100);
        }
      };
      startCamera();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [viewMode]);

// 3. 核心逻辑：模式分离版 (解决冲突)
  const onResults = (results) => {
    if (!globeEl.current) return;

    // 状态 A: 检测到手
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexFinger = landmarks[8]; // 食指
      const thumb = landmarks[4];       // 拇指

      // 计算捏合距离 (用于判断模式)
      const pinchDistance = Math.sqrt(
        Math.pow(indexFinger.x - thumb.x, 2) + 
        Math.pow(indexFinger.y - thumb.y, 2)
      );

      // 定义模式开关：距离小于 0.05 算“捏住”
      const isPinching = pinchDistance < 0.05;

      // 获取当前地球状态
      const currentPov = globeEl.current.pointOfView();
      let newLng = currentPov.lng;
      let newLat = currentPov.lat;
      let newAlt = currentPov.altitude;

      // --- 模式分支 ---
      
      if (isPinching) {
        // ==========================
        // 模式 1: 缩放模式 (捏住)
        // ==========================
        // 交互逻辑：捏住手，像拉拉杆一样，向上提=放大，向下压=缩小
        
        // 我们利用 Y 轴的变化来控制缩放
        // 为了体验平滑，我们使用相对位移（需要用到 prevHandPos）
        if (prevHandPos.current.y !== null) {
            const deltaY = indexFinger.y - prevHandPos.current.y;
            
            // 灵敏度
            const zoomSpeed = 3.0; 

            // MediaPipe Y轴向下是正，所以手往上移(deltaY负)应该放大(altitude减小)
            // 手往下移(deltaY正)应该缩小(altitude增加)
            newAlt = Math.max(0.5, Math.min(4.0, currentPov.altitude + (deltaY * zoomSpeed)));
            
            // 应用缩放 (旋转保持不变)
            globeEl.current.pointOfView({ altitude: newAlt }, 0);
            setGestureStatus("🔍 缩放模式 | ↕️ 上下移动手");
        }

      } else {
        // ==========================
        // 模式 2: 旋转模式 (张开手)
        // ==========================
        // 交互逻辑：只要没捏住，怎么挥手都算旋转，不会触发缩放
        
        if (prevHandPos.current.x !== null && prevHandPos.current.y !== null) {
            const deltaX = indexFinger.x - prevHandPos.current.x;
            const deltaY = indexFinger.y - prevHandPos.current.y;
            const sensitivity = 100;

            // 只有位移足够大才动，防止抖动
            if (Math.abs(deltaX) > 0.002 || Math.abs(deltaY) > 0.002) {
                globeEl.current.controls().autoRotate = false;
                
                // + 或 - 号决定旋转方向，根据你的习惯调整
                newLng = currentPov.lng + (deltaX * sensitivity);
                newLat = Math.max(-90, Math.min(90, currentPov.lat + (deltaY * sensitivity)));

                // 应用旋转 (高度保持不变)
                globeEl.current.pointOfView({ lng: newLng, lat: newLat }, 0);
                setGestureStatus("🌍 旋转模式 | 🖐️ 随意拖拽");
            } else {
                setGestureStatus("✋ 待机中...");
            }
        }
      }

      // --- 记录坐标供下一帧使用 ---
      prevHandPos.current = { x: indexFinger.x, y: indexFinger.y };

    } else {
      // 状态 B: 没手 -> 重置
      prevHandPos.current = { x: null, y: null };
      if (globeEl.current.controls().autoRotate === false) {
         globeEl.current.controls().autoRotate = true;
         setGestureStatus("等待手势...");
      }
    }
  };


  // 颜色映射
  const colorScale = scaleSequential(interpolateViridis)
    .domain([mapData.minVal, mapData.maxVal]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      
      {/* --- UI 层：标题与控制栏 --- */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', zIndex: 100 }}>
        <h1>火星臭氧可视化平台</h1>
        
        {/* 【新增】切换按钮 */}
        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
            <button 
              onClick={() => setViewMode('globe')}
              style={{
                padding: '8px 15px', 
                cursor: 'pointer',
                background: viewMode === 'globe' ? '#2196F3' : '#333', // 选中变蓝
                color: 'white', border: '1px solid #555', borderRadius: '4px'
              }}
            >
              🌍 3D 手势地球
            </button>
            <button 
              onClick={() => setViewMode('chart')}
              style={{
                padding: '8px 15px', 
                cursor: 'pointer',
                background: viewMode === 'chart' ? '#2196F3' : '#333',
                color: 'white', border: '1px solid #555', borderRadius: '4px'
              }}
            >
              📈 季节热力图
            </button>
        </div>

        {/* 状态提示仅在地球模式下显示 */}
        {viewMode === 'globe' && (
          <>
            <h3>状态: {gestureStatus}</h3>
            {loading && <p>正在加载地球数据...</p>}
          </>
        )}
      </div>

      {/* --- 视图切换逻辑 --- */}
      {viewMode === 'globe' ? (
        <>
          {/* 1. 摄像头小窗 (仅在地球模式显示) */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 100, border: '2px solid white' }}>
            <Webcam
              ref={webcamRef}
              style={{ width: 160, height: 120, transform: "scaleX(-1)" }}
            />
          </div>

          {/* 2. 3D 地球组件 */}
          <Globe
            ref={globeEl}
            globeImageUrl="/mars_texture.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            pointsData={mapData.points}
            pointLat="lat"
            pointLng="lng"
            pointColor={d => colorScale(d.val)}
            pointAltitude={0.01}
            pointRadius={0.5}
          />
        </>
      ) : (
        // --- 模式 2: 图表视图 ---
        <div style={{ 
            width: '100%', height: '100%', 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'linear-gradient(to bottom, #000000, #1a1a1a)' // 微渐变背景
        }}>
           {/* 加载我们在上一步写的图表组件 */}
           <SeasonalChart />
        </div>
      )}
      
    </div>
  );
}

export default App;

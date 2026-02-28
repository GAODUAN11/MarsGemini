import React, { useState } from 'react';

//引入季节图表组件
import SeasonalChart from './components/SeasonalChart';
import SeasonalLineChart from './components/SeasonalLineChart';
//引入新的3D视图组件
import Mars3DViewer from './components/Mars3DViewer';


function App() {
  const [viewMode, setViewMode] = useState('globe'); // 'globe' 或 'chart'

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
              📈 季节热力图 (全)
            </button>
            <button 
              onClick={() => setViewMode('line-chart')}
              style={{
                padding: '8px 15px', 
                cursor: 'pointer',
                background: viewMode === 'line-chart' ? '#2196F3' : '#333',
                color: 'white', border: '1px solid #555', borderRadius: '4px'
              }}
            >
              📊 纬度带趋势
            </button>
        </div>
      </div>

      {/* --- 视图切换逻辑 --- */}
      {viewMode === 'globe' ? <Mars3DViewer /> : (
        // --- 图表视图 ---
        <div style={{ 
            width: '100%', height: '100%', 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'linear-gradient(to bottom, #000000, #1a1a1a)' // 微渐变背景
        }}>
           {viewMode === 'chart' && <SeasonalChart />}
           {viewMode === 'line-chart' && <SeasonalLineChart />}
        </div>
      )}
      
    </div>
  );
}

export default App;

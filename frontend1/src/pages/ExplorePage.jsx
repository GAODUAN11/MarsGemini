import { useState, useEffect, useRef } from 'react';
import C from '../constants/colors';
import SectionTitle from '../components/SectionTitle';
import GlowCard from '../components/GlowCard';
import ChartPlaceholder from '../components/ChartPlaceholder';
import Mars3DViewer from '../components/Mars3DViewer';
import SeasonalChart from '../components/SeasonalChart';
import SeasonalLineChart from '../components/SeasonalLineChart';
import { useDataContext } from '../contexts/DataContext';

const LATITUDE_BANDS = [
  { label: '极地北 60-90°N', color: C.mars },
  { label: '中纬北 30-60°N', color: C.marsLight },
  { label: '赤道 30°S-30°N', color: C.ice60 },
  { label: '中纬南 30-60°S', color: C.blue },
  { label: '极地南 60-90°S', color: '#7c5cbf' },
];

const ENV_VARIABLES = [
  { name: 'Temperature', unit: 'K', icon: '🌡' },
  { name: 'Dust Optical Depth', unit: 'τ', icon: '🌫' },
  { name: 'Solar Flux DN', unit: 'W/m²', icon: '☀️' },
  { name: 'U Wind', unit: 'm/s', icon: '💨' },
  { name: 'V Wind', unit: 'm/s', icon: '🌬' },
  { name: 'Pressure', unit: 'Pa', icon: '📊' },
];

export default function ExplorePage() {
  const { marsYear, setMarsYear, solarLongitude: lsValue, setSolarLongitude: setLsValue } = useDataContext();
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setLsValue((v) => {
          if (v >= 355) {
            setPlaying(false);
            return 0;
          }
          return v + 5;
        });
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing]);

  const seasonName =
    lsValue < 90
      ? '北半球春 / 南半球秋'
      : lsValue < 180
        ? '北半球夏 / 南半球冬'
        : lsValue < 270
          ? '北半球秋 / 南半球春'
          : '北半球冬 / 南半球夏';

  return (
    <div className="page-enter" style={{ padding: '100px 40px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <SectionTitle title="数据探索" subtitle="DATA EXPLORATION" />

      {/* ─── Control Bar ─── */}
      <GlowCard style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: C.ice60, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>MARS YEAR</span>
          <select
            value={marsYear}
            onChange={(e) => setMarsYear(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '6px 12px',
              color: C.ice,
              fontSize: 13,
              fontFamily: "'Exo 2', sans-serif",
            }}
          >
            <option value={20}>MY 20</option>
            <option value={21}>MY 21</option>
            <option value={22}>MY 22</option>
            <option value={23}>MY 23</option>
            <option value={24}>MY 24</option>
            <option value={25}>MY 25</option>
            <option value={26}>MY 26</option>
            <option value={27}>MY 27</option>
            <option value={28}>MY 28</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: C.ice60, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1, whiteSpace: 'nowrap' }}>Ls</span>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={lsValue}
            onChange={(e) => setLsValue(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.mars }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", minWidth: 50, textAlign: 'right' }}>
            {lsValue}°
          </span>
        </div>

        <button
          onClick={() => setPlaying(!playing)}
          style={{
            background: playing ? 'rgba(199,91,57,0.2)' : 'rgba(74,158,255,0.15)',
            border: `1px solid ${playing ? C.mars : C.blue}`,
            borderRadius: 8,
            padding: '8px 20px',
            color: playing ? C.mars : C.blue,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
          }}
        >
          {playing ? '⏸ PAUSE' : '▶ PLAY'}
        </button>

        <div style={{ fontSize: 12, color: C.ice30 }}>{seasonName}</div>
      </GlowCard>

      {/* ─── Main Charts Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 3D Globe (spans 2 rows) */}
        <GlowCard breathe style={{ padding: 20, gridRow: 'span 2' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 12 }}>
            3D OZONE GLOBE
          </div>
          <div style={{ width: '100%', height: 500, position: 'relative' }}>
            <Mars3DViewer />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: C.ice30 }}>🖱 拖拽旋转 · 滚轮缩放 · ✋ 手势控制</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Viridis', 'Inferno', 'Plasma'].map((cs) => (
                <button
                  key={cs}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 10,
                    color: C.ice60,
                    cursor: 'pointer',
                  }}
                >
                  {cs}
                </button>
              ))}
            </div>
          </div>
        </GlowCard>

        {/* Heatmap */}
        <GlowCard breathe style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 12 }}>
            SEASONAL HEATMAP
          </div>
          <div style={{ width: '100%', height: 260, position: 'relative', overflow: 'hidden' }}>
            <SeasonalChart />
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: C.ice30 }}>
            X: Solar Longitude (Ls 0°–360°) · Y: Latitude (-90°–90°) · Color: O₃ Column
          </div>
        </GlowCard>

        {/* Line chart */}
        <GlowCard breathe style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 12 }}>
            LATITUDE BANDS
          </div>
          <div style={{ width: '100%', height: 260, position: 'relative', overflow: 'hidden' }}>
            <SeasonalLineChart />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {LATITUDE_BANDS.map((b, i) => (
              <span key={i} style={{ fontSize: 10, color: C.ice30, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 3, borderRadius: 2, background: b.color }} />
                {b.label}
              </span>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* ─── Environment Variables ─── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 16 }}>
          MCD 环境变量面板 / ENVIRONMENT DRIVERS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {ENV_VARIABLES.map((v, i) => (
            <GlowCard key={i} style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{v.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.ice }}>{v.name}</span>
                <span style={{ fontSize: 10, color: C.ice30, marginLeft: 'auto' }}>{v.unit}</span>
              </div>
              <ChartPlaceholder title="" type="heatmap" h={140} />
            </GlowCard>
          ))}
        </div>
      </div>

      {/* ─── Correlation Matrix ─── */}
      <div style={{ marginTop: 32 }}>
        <GlowCard breathe style={{ padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 16 }}>
            CORRELATION MATRIX / 变量相关性矩阵
          </div>
          <ChartPlaceholder title="O₃ vs 环境变量 Pearson 相关系数" type="correlation" h={320} />
        </GlowCard>
      </div>
    </div>
  );
}

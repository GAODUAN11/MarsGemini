import React from 'react';
import { useDataContext } from '../contexts/DataContext';

/**
 * 全局控制面板组件
 * 功能：让用户选择火星年(MY)和季节(Ls)
 */
const ControlPanel = () => {
    const { 
        marsYear, 
        setMarsYear, 
        solarLongitude, 
        setSolarLongitude 
    } = useDataContext();

    // 可用的火星年列表（可根据数据扩展）
    const availableYears = [27, 28];

    // Ls 对应的季节名称
    const getSeasonName = (ls) => {
        if (ls >= 0 && ls < 90) return '春季 (Northern Spring)';
        if (ls >= 90 && ls < 180) return '夏季 (Northern Summer)';
        if (ls >= 180 && ls < 270) return '秋季 (Northern Fall)';
        return '冬季 (Northern Winter)';
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>🎛️ 数据控制面板</h3>
            
            {/* 火星年选择 */}
            <div style={styles.controlGroup}>
                <label style={styles.label}>
                    火星年 (MY):
                </label>
                <select 
                    value={marsYear} 
                    onChange={(e) => setMarsYear(Number(e.target.value))}
                    style={styles.select}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>
                            MY {year}
                        </option>
                    ))}
                </select>
            </div>

            {/* 季节滑动条 */}
            <div style={styles.controlGroup}>
                <label style={styles.label}>
                    季节 (Ls): {solarLongitude}°
                </label>
                <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    step="1"
                    value={solarLongitude}
                    onChange={(e) => setSolarLongitude(Number(e.target.value))}
                    style={styles.slider}
                />
                <div style={styles.seasonInfo}>
                    {getSeasonName(solarLongitude)}
                </div>
            </div>

            {/* Ls 刻度参考 */}
            <div style={styles.lsReference}>
                <small>
                    春: 0° | 夏: 90° | 秋: 180° | 冬: 270°
                </small>
            </div>
        </div>
    );
};

const styles = {
    container: {
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #555',
        borderRadius: '8px',
        padding: '15px',
        minWidth: '280px',
        color: 'white'
    },
    title: {
        margin: '0 0 15px 0',
        fontSize: '16px',
        borderBottom: '1px solid #555',
        paddingBottom: '10px'
    },
    controlGroup: {
        marginBottom: '15px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    select: {
        width: '100%',
        padding: '8px',
        fontSize: '14px',
        background: '#333',
        color: 'white',
        border: '1px solid #555',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    slider: {
        width: '100%',
        height: '8px',
        borderRadius: '5px',
        background: '#555',
        outline: 'none',
        cursor: 'pointer'
    },
    seasonInfo: {
        marginTop: '8px',
        fontSize: '13px',
        color: '#4CAF50',
        fontStyle: 'italic'
    },
    lsReference: {
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #444',
        textAlign: 'center',
        color: '#888'
    }
};

export default ControlPanel;

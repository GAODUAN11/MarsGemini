import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const fetchMapData = async () => {
    // 获取地球点位数据
    const response = await axios.get(`${API_BASE_URL}/map/demo`);
    return response.data;
};
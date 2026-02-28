from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import xarray as xr
import numpy as np
import glob
import os

app = FastAPI()

# --- 关键配置：解决跨域问题 (CORS) ---
# 小白解释：浏览器默认禁止网页向不同端口发请求。
# 前端在 5173 端口，后端在 8000 端口，必须加这句允许它们“通话”。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许任何来源访问，开发时为了方便
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

## --- 核心功能：读取数据的接口 ---
@app.get("/api/map/demo")
async def get_demo_map():
    # 1. 读取刚才放进去的文件
    file_path = "openmars/openmars_ozo_my27_ls2_my27_ls17.nc"
    try:
        ds = xr.open_dataset(file_path)
    except FileNotFoundError:
        return {"error": "找不到文件，请确认文件名是否正确"}

    # 2. 取第一个时间点的数据 (为了演示简单，我们只取第一帧)
    # OpenMARS 的臭氧变量名通常是 'o3col' 或 'col_ozone'
    # 我们这里假设是 o3col，如果报错再改
    data_slice = ds['o3col'].isel(time=0) 
    
    # 3. 准备经纬度
    lats = ds['lat'].values.tolist()
    lons = ds['lon'].values.tolist()
    
    # 4. 转换数据为简单的列表 (JSON 不认识 numpy 数组)
    # 注意：Plotly 画图通常需要 z 为二维数组
    # z_values = data_slice.values.tolist()
    
    # 为点云准备数据: [ {lat, lng, val}, ... ]
    # 为了性能，我们这里只采样或者展平数据
    points = []
    vals = data_slice.values
    # 简单的两层循环 (Python 循环慢，实际可以用 numpy 展平)
    
    # 优化：使用 numpy 展平
    # lat: (36,), lon: (72,) -> grid (36, 72)
    # meshgrid 生成坐标网格
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    # 展平
    flat_lats = lat_grid.flatten()
    flat_lons = lon_grid.flatten()
    flat_vals = vals.flatten()
    
    # 过滤无效值 (NaN)
    valid_indices = ~np.isnan(flat_vals)
    
    dataset = []
    min_val = float(np.nanmin(vals))
    max_val = float(np.nanmax(vals))
    
    for i in range(len(flat_vals)):
        if valid_indices[i]:
            dataset.append({
                "lat": flat_lats[i],
                "lng": flat_lons[i],
                "val": (flat_vals[i] - min_val) / (max_val - min_val) # 归一化便于前端上色
            })

    return {
        "points": dataset,
        "minVal": min_val,
        "maxVal": max_val
    }

@app.get("/api/chart/seasonal")
async def get_seasonal_chart():
    # 假设我们要展示整个季节 (所有 Ls) 的纬向平均 (Zonal Mean) 臭氧分布
    # 这是一个比较重的计算，通常会预处理好。
    # 这里我们演示如何从所有文件聚合数据 (简化版)
    
    # 1. 扫描所有 .nc 文件
    # 注意：为了演示快一点，我们就在刚才那个文件里取所有时间步
    # 实际上应该循环所有文件 openmars_ozo_*.nc
    
    # 简化：只用当前文件演示随时间的变化 (该文件包含 ls 2-17 的数据)
    file_path = "openmars/openmars_ozo_my27_ls2_my27_ls17.nc"
    try:
        ds = xr.open_dataset(file_path)
    except:
        return {"error": "File not found"}
        
    # 2. 计算纬向平均 (Zonal Mean) -> 对经度(lon)求平均
    # 结果维度: (time, lat)
    # 纬向平均是把所有经度的数据平均，得到随纬度和时间变化的剖面
    zonal_mean = ds['o3col'].mean(dim='lon')
    
    # 3. 准备 X轴 (Ls) 和 Y轴 (Lat)
    # ds['Ls'] 是 (time,)
    ls_values = ds['Ls'].values
    lats = ds['lat'].values
    
    # 我们希望 Y轴=Lat, X轴=Ls
    # 所以 z 应该是 (len(lat), len(ls)) 的矩阵
    # 目前 zonal_mean 是 (time, lat)，所以需要转置 (.T)
    z_matrix = zonal_mean.values.T  # 变成 (lat, time)

    # 4. 处理 NaN (如果有空值，填 0 或保持 None)
    z_matrix = np.where(np.isnan(z_matrix), None, z_matrix)

    return {
        "x": ls_values.tolist(),      # X轴: 季节 (Ls)
        "y": lats.tolist(),           # Y轴: 纬度
        "z": z_matrix.tolist(),       # 颜色值: 臭氧浓度矩阵
        "min": float(np.nanmin(z_matrix)),
        "max": float(np.nanmax(z_matrix))
    }

@app.get("/api/chart/seasonal-bands")
async def get_seasonal_bands():
    # 1. 扫描所有 .nc 文件并按文件名排序 (确保时间顺序)
    nc_files = sorted(glob.glob("openmars/openmars_ozo_*.nc"))
    
    # 2. 定义纬度带
    # 注意：数据中 lat 是从 +90 到 -90 递减排列的
    # xarray sel slice 通常智能，但为了稳妥，我们用 slice(High, Low) 匹配数据顺序
    bands_def = {
        "Polar North (60N-90N)": slice(90, 60),
        "Mid-Lat North (30N-60N)": slice(60, 30),
        "Equatorial (30S-30N)": slice(30, -30),
        "Mid-Lat South (30S-60S)": slice(-30, -60),
        "Polar South (60S-90S)": slice(-60, -90)
    }

    # 3. 初始化容器
    all_ls = []
    # 结构: {"Polar North": [], "Mid North": [], ...}
    bands_data = {k: [] for k in bands_def.keys()}

    # 4. 循环处理文件 (为了演示速度，可以只取前几个，或者全部)
    # 考虑到文件较大，这里全部读取可能稍慢，但通常 25 个文件还行
    for file_path in nc_files:
        try:
            with xr.open_dataset(file_path) as ds:
                # 提取 Ls (时间轴)
                ls = ds['Ls'].values
                # 简单的拼接可能导致不连续，但在演示中通常可以接受
                all_ls.extend(ls.tolist())

                # 对每个纬度带计算平均值
                for band_name, lat_slice in bands_def.items():
                    # 1. 选纬度带
                    # 2. 求区域平均: 先对 lon 平均(纬向平均), 再对 lat 平均(区域平均)
                    band_subset = ds['o3col'].sel(lat=lat_slice)
                    # mean(dim=['lat', 'lon']) 计算该时间点、该区域内的平均臭氧
                    band_mean = band_subset.mean(dim=['lat', 'lon']).values
                    
                    bands_data[band_name].extend(band_mean.tolist())
                    
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            continue

    # 5. 组装返回数据
    # 转换 bands_data 为前端好用的数组格式
    series_list = []
    for name, values in bands_data.items():
        series_list.append({
            "name": name,
            "values": values
        })

    return {
        "ls": all_ls,
        "bands": series_list
    }

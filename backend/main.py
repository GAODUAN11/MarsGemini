from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import xarray as xr
import numpy as np

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
#@app.get("/api/map/demo")
#async def get_demo_map():
#    # 1. 读取刚才放进去的文件
#    file_path = "openmars/openmars_ozo_my27_ls2_my27_ls17.nc"
#    try:
#        ds = xr.open_dataset(file_path)
#    except FileNotFoundError:
#        return {"error": "找不到文件，请确认文件名是否正确"}

#    # 2. 取第一个时间点的数据 (为了演示简单，我们只取第一帧)
#    # OpenMARS 的臭氧变量名通常是 'o3col' 或 'col_ozone'
#    # 我们这里假设是 o3col，如果报错再改
#    data_slice = ds['o3col'].isel(time=0) 
    
#    # 3. 准备经纬度
#    lats = ds['lat'].values.tolist()
#    lons = ds['lon'].values.tolist()
    
#    # 4. 转换数据为简单的列表 (JSON 不认识 numpy 数组)
#    # 注意：Plotly 画图通常需要 z 为二维数组
#    z_values = data_slice.values.tolist()

#    return {
#        "z": z_values,
#        "lat": lats,
#        "lon": lons,
#        "time_info": str(data_slice.time.values)
#    }

## 运行方式：
## 在终端输入: uvicorn main:app --reload


# ... (前面的引入和 CORS 配置不变)

@app.get("/api/map/demo")
async def get_demo_map():
    file_path = "openmars/openmars_ozo_my27_ls2_my27_ls17.nc"
    try:
        ds = xr.open_dataset(file_path)
    except FileNotFoundError:
        return {"error": "找不到文件"}

    # 取第一个时间点
    data_slice = ds['o3col'].isel(time=0)
    
    # --- 关键修改：将数据展平 (Flatten) ---
    # 我们需要把它变成一个巨大的列表，每个元素是 {"lat": xx, "lng": xx, "val": xx}
    # 使用 xarray 的 stack 和 to_pandas 方法非常方便
    
    # 1. 堆叠维度 (把 lat, lon 变成一个 MultiIndex)
    stacked = data_slice.stack(points=('lat', 'lon'))
    
    # 2. 转成 DataFrame
    df = stacked.to_pandas().reset_index()
    
    # 3. 重命名列名以匹配前端习惯 (lon -> lng)
    df.columns = ['lat', 'lng', 'val']
    
    # 4. 转成字典列表 (记录格式)
    # 结果类似: [{"lat":-90, "lng":-180, "val":0.1}, ..., {"lat":90, "lng":180, "val":0.5}]
    points_data = df.to_dict(orient='records')

    # 计算一下最大最小值，前端做颜色映射时要用
    min_val = float(df['val'].min())
    max_val = float(df['val'].max())

    return {
        "points": points_data,
        "minVal": min_val,
        "maxVal": max_val,
        "time_info": str(data_slice.time.values)
    }


@app.get("/api/chart/seasonal")
async def get_seasonal_heatmap():
    file_path = "openmars/openmars_ozo_my27_ls2_my27_ls17.nc"
    try:
        # 打开数据集
        ds = xr.open_dataset(file_path)
    except FileNotFoundError:
        return {"error": "找不到文件"}

    # 1. 提取变量
    # OpenMARS 的时间轴通常对应 Ls，但我们需要确认一下
    # 在这个文件中，ds['Ls'] 是一个变量，维度是 (time,)
    ls_values = ds['Ls'].values
    lats = ds['lat'].values
    
    # 2. 计算径向平均 (Zonal Mean)
    # 原始数据 shape: (time, lat, lon)
    # 我们沿着 'lon' 维度求平均 -> 变成 (time, lat)
    # 注意：为了严谨，可以用加权平均（考虑到极地经度带变窄），但简单平均作为 MVP 足够了
    zonal_mean = ds['o3col'].mean(dim='lon')
    
    # 3. 调整数据形状以适配 Plotly
    # Plotly 热力图的 z[i][j] 通常对应 y[i] 和 x[j]
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

# 记得保存文件。uvicorn 会自动重启。
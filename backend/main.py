from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# 导入服务层
from services.data_service import OpenMarsDataService

app = FastAPI()

# --- 关键配置：解决跨域问题 (CORS) ---
# 小白解释：浏览器默认禁止网页向不同端口发请求。
# 前端在 5173 端口，后端在 8000 端口，必须加这句允许它们"通话"。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许任何来源访问，开发时为了方便
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据服务（单例模式）
data_service = OpenMarsDataService(data_dir="openmars")

## --- 核心功能：读取数据的接口 (路由层) ---

@app.get("/api/map/demo")
async def get_demo_map(my: int = 27, ls: float = 10):
    """
    获取3D地球点云数据
    路由层职责：接收请求 → 调用服务 → 返回结果
    
    Args:
        my: 火星年 (Martian Year)
        ls: 季节 (Solar Longitude, 0-360)
    """
    try:
        result = data_service.get_point_cloud_data(mars_year=my, solar_longitude=ls)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

@app.get("/api/chart/seasonal")
async def get_seasonal_chart(my: int = 27):
    """
    获取季节热力图数据（纬向平均）
    路由层职责：接收请求 → 调用服务 → 返回结果
    
    Args:
        my: 火星年 (Martian Year)
    """
    try:
        result = data_service.get_zonal_mean_data(mars_year=my)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

@app.get("/api/chart/seasonal-bands")
async def get_seasonal_bands(my: int = 27):
    """
    获取纬度带折线图数据
    路由层职责：接收请求 → 调用服务 → 返回结果
    
    Args:
        my: 火星年 (Martian Year)
    """
    try:
        result = data_service.get_latitudinal_bands_data(mars_year=my)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")
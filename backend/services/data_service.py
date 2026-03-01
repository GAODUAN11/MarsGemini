"""
数据服务层 - 负责处理 OpenMARS 数据的读取和计算逻辑
职责：文件读取、xarray 操作、数据聚合计算
"""

import xarray as xr
import numpy as np
import glob
from typing import Dict, List, Tuple, Optional


class OpenMarsDataService:
    """OpenMARS 臭氧数据处理服务"""
    
    def __init__(self, data_dir: str = "openmars"):
        """
        初始化服务
        Args:
            data_dir: OpenMARS NC 文件所在目录
        """
        self.data_dir = data_dir
    
    def get_point_cloud_data(self, file_name: Optional[str] = None, time_index: int = 0) -> Dict:
        """
        获取3D地球用的点云数据
        
        Args:
            file_name: NC文件名，默认使用 my27_ls2_ls17
            time_index: 时间索引，默认第一帧
            
        Returns:
            {
                "points": [{"lat": float, "lng": float, "val": float}, ...],
                "minVal": float,
                "maxVal": float
            }
        """
        if file_name is None:
            file_name = "openmars_ozo_my27_ls2_my27_ls17.nc"
        
        file_path = f"{self.data_dir}/{file_name}"
        
        try:
            ds = xr.open_dataset(file_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        # 提取指定时间点的臭氧数据
        data_slice = ds['o3col'].isel(time=time_index)
        
        # 获取经纬度
        lats = ds['lat'].values
        lons = ds['lon'].values
        vals = data_slice.values
        
        # 使用 meshgrid 生成坐标网格
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        
        # 展平所有数组
        flat_lats = lat_grid.flatten()
        flat_lons = lon_grid.flatten()
        flat_vals = vals.flatten()
        
        # 过滤无效值 (NaN)
        valid_indices = ~np.isnan(flat_vals)
        
        # 计算统计值
        min_val = float(np.nanmin(vals))
        max_val = float(np.nanmax(vals))
        
        # 组装点云数据
        points = []
        for i in range(len(flat_vals)):
            if valid_indices[i]:
                points.append({
                    "lat": float(flat_lats[i]),
                    "lng": float(flat_lons[i]),
                    "val": float(flat_vals[i])
                })
        
        ds.close()
        
        return {
            "points": points,
            "minVal": min_val,
            "maxVal": max_val
        }
    
    def get_zonal_mean_data(self, file_name: Optional[str] = None) -> Dict:
        """
        获取纬向平均数据（用于季节热力图）
        
        Args:
            file_name: NC文件名，默认使用 my27_ls2_ls17
            
        Returns:
            {
                "x": List[float],  # Ls季节值
                "y": List[float],  # 纬度
                "z": List[List[float]],  # 臭氧浓度矩阵 (lat, time)
                "min": float,
                "max": float
            }
        """
        if file_name is None:
            file_name = "openmars_ozo_my27_ls2_my27_ls17.nc"
        
        file_path = f"{self.data_dir}/{file_name}"
        
        try:
            ds = xr.open_dataset(file_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        # 计算纬向平均 (对经度求平均)
        zonal_mean = ds['o3col'].mean(dim='lon')
        
        # 提取坐标轴
        ls_values = ds['Ls'].values
        lats = ds['lat'].values
        
        # 转置矩阵: (time, lat) -> (lat, time)
        z_matrix = zonal_mean.values.T
        
        # 处理 NaN
        z_matrix = np.where(np.isnan(z_matrix), None, z_matrix)
        
        ds.close()
        
        return {
            "x": ls_values.tolist(),
            "y": lats.tolist(),
            "z": z_matrix.tolist(),
            "min": float(np.nanmin(z_matrix)),
            "max": float(np.nanmax(z_matrix))
        }
    
    def get_latitudinal_bands_data(self) -> Dict:
        """
        获取不同纬度带的臭氧随季节变化数据（用于折线图）
        
        Returns:
            {
                "ls": List[float],  # Ls季节值
                "bands": [
                    {"name": str, "values": List[float]},
                    ...
                ]
            }
        """
        # 扫描所有 NC 文件
        nc_files = sorted(glob.glob(f"{self.data_dir}/openmars_ozo_*.nc"))
        
        if not nc_files:
            raise FileNotFoundError(f"未找到任何 NC 文件: {self.data_dir}/openmars_ozo_*.nc")
        
        # 定义纬度带
        bands_def = {
            "Polar North (60N-90N)": slice(90, 60),
            "Mid-Lat North (30N-60N)": slice(60, 30),
            "Equatorial (30S-30N)": slice(30, -30),
            "Mid-Lat South (30S-60S)": slice(-30, -60),
            "Polar South (60S-90S)": slice(-60, -90)
        }
        
        # 初始化数据容器
        all_ls = []
        bands_data = {k: [] for k in bands_def.keys()}
        
        # 循环处理每个文件
        for file_path in nc_files:
            try:
                with xr.open_dataset(file_path) as ds:
                    # 提取 Ls 值
                    ls = ds['Ls'].values
                    all_ls.extend(ls.tolist())
                    
                    # 计算每个纬度带的区域平均
                    for band_name, lat_slice in bands_def.items():
                        band_subset = ds['o3col'].sel(lat=lat_slice)
                        band_mean = band_subset.mean(dim=['lat', 'lon']).values
                        bands_data[band_name].extend(band_mean.tolist())
                        
            except Exception as e:
                print(f"Warning: Error reading {file_path}: {e}")
                continue
        
        # 转换为前端格式
        series_list = [
            {"name": name, "values": values}
            for name, values in bands_data.items()
        ]
        
        return {
            "ls": all_ls,
            "bands": series_list
        }

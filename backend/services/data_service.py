"""
数据服务层 - 负责处理 OpenMARS 数据的读取和计算逻辑
职责: 文件读取、xarray 操作、数据聚合计算
"""

import xarray as xr
import numpy as np
import glob
import os
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
    
    def _find_file_by_ls(self, mars_year: int, solar_longitude: float) -> Optional[str]:
        """
        根据火星年和季节（Ls）找到合适的数据文件
        
        Args:
            mars_year: 火星年 (MY)
            solar_longitude: 季节角度 (Ls: 0-360)
            
        Returns:
            文件名，如果找不到返回 None
        """
        pattern = f"{self.data_dir}/openmars_ozo_my{mars_year}_ls*.nc"
        files = sorted(glob.glob(pattern))
        
        if not files:
            return None
        
        # 从文件名解析 Ls 范围并找到匹配的文件
        # 文件名格式: openmars_ozo_my27_ls2_my27_ls17.nc
        for file_path in files:
            filename = os.path.basename(file_path)
            try:
                # 解析文件名中的 Ls 范围
                parts = filename.replace('.nc', '').split('_')
                # 找到 ls 开头的部分
                ls_indices = [i for i, p in enumerate(parts) if p == 'ls']
                if len(ls_indices) >= 2:
                    ls_start = int(parts[ls_indices[0] + 1])
                    ls_end = int(parts[ls_indices[1] + 1])
                    
                    # 检查 Ls 是否在范围内
                    if ls_start <= solar_longitude <= ls_end:
                        return filename
            except (ValueError, IndexError):
                continue
        
        # 如果找不到精确匹配，返回第一个文件
        return os.path.basename(files[0])
    
    def get_point_cloud_data(self, mars_year: int = 27, solar_longitude: float = 10) -> Dict:
        """
        获取3D地球用的点云数据
        
        Args:
            mars_year: 火星年 (MY)
            solar_longitude: 季节 (Ls: 0-360)
            
        Returns:
            {
                "points": [{"lat": float, "lng": float, "val": float}, ...],
                "minVal": float,
                "maxVal": float
            }
        """
        # 查找合适的文件
        file_name = self._find_file_by_ls(mars_year, solar_longitude)
        if file_name is None:
            raise FileNotFoundError(f"未找到 MY{mars_year} 的数据文件")
        
        file_path = f"{self.data_dir}/{file_name}"
        
        try:
            ds = xr.open_dataset(file_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        # 查找最接近目标 Ls 的时间点
        ls_values = ds['Ls'].values
        time_index = np.argmin(np.abs(ls_values - solar_longitude))
        
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
    
    def get_zonal_mean_data(self, mars_year: int = 27) -> Dict:
        """
        获取纬向平均数据（用于季节热力图）
        
        Args:
            mars_year: 火星年 (MY)
            
        Returns:
            {
                "x": List[float],  # Ls季节值
                "y": List[float],  # 纬度
                "z": List[List[float]],  # 臭氧浓度矩阵 (lat, time)
                "min": float,
                "max": float
            }
        """
        # 扫描该火星年的所有文件
        pattern = f"{self.data_dir}/openmars_ozo_my{mars_year}_*.nc"
        nc_files = sorted(glob.glob(pattern))
        
        if not nc_files:
            raise FileNotFoundError(f"未找到 MY{mars_year} 的数据文件")
        
        print(f"[DEBUG] MY{mars_year} 找到 {len(nc_files)} 个文件")
        
        # 合并所有文件的数据
        all_data = []
        all_ls = []
        lats = None
        
        for file_path in nc_files:
            try:
                with xr.open_dataset(file_path) as ds:
                    # 计算纬向平均
                    zonal_mean = ds['o3col'].mean(dim='lon')
                    all_data.append(zonal_mean.values)
                    all_ls.extend(ds['Ls'].values.tolist())
                    if lats is None:
                        lats = ds['lat'].values
                    print(f"[DEBUG] 成功读取: {os.path.basename(file_path)}, Ls范围: {ds['Ls'].values[0]:.1f}-{ds['Ls'].values[-1]:.1f}")
            except Exception as e:
                print(f"Warning: 跳过文件 {file_path}: {e}")
                continue
        
        if not all_data:
            raise ValueError(f"无法读取 MY{mars_year} 的任何数据")
        
        # 拼接数据: (time_total, lat)
        combined_data = np.concatenate(all_data, axis=0)
        
        print(f"[DEBUG] MY{mars_year} 合并后数据形状: {combined_data.shape}, Ls点数: {len(all_ls)}")
        
        # 关键修复：按 Ls 排序（因为文件名排序可能导致 Ls 不连续）
        ls_array = np.array(all_ls)
        sorted_indices = np.argsort(ls_array)
        
        # 应用排序
        all_ls_sorted = ls_array[sorted_indices].tolist()
        combined_data_sorted = combined_data[sorted_indices, :]
        
        # 转置: (lat, time)
        z_matrix = combined_data_sorted.T
        
        # 计算统计值（在处理 NaN 之前）
        min_val = float(np.nanmin(z_matrix))
        max_val = float(np.nanmax(z_matrix))
        
        print(f"[DEBUG] MY{mars_year} 数据范围: min={min_val:.2f}, max={max_val:.2f}")
        print(f"[DEBUG] MY{mars_year} Ls范围: {all_ls_sorted[0]:.1f}-{all_ls_sorted[-1]:.1f}")
        
        # 检查是否所有数据都是 NaN
        if np.isnan(min_val) or np.isnan(max_val):
            raise ValueError(f"MY{mars_year} 的数据全部为 NaN")
        
        # 将 z_matrix 转为列表，将 NaN 替换为 None（JSON 友好）
        z_list = []
        for row in z_matrix:
            z_list.append([None if np.isnan(val) else float(val) for val in row])
        
        return {
            "x": all_ls_sorted,
            "y": lats.tolist(),
            "z": z_list,
            "min": min_val,
            "max": max_val
        }
    
    def get_latitudinal_bands_data(self, mars_year: int = 27) -> Dict:
        """
        获取不同纬度带的臭氧随季节变化数据（用于折线图）
        
        Args:
            mars_year: 火星年 (MY)
        
        Returns:
            {
                "ls": List[float],  # Ls季节值
                "bands": [
                    {"name": str, "values": List[float]},
                    ...
                ]
            }
        """
        # 扫描该火星年的所有 NC 文件
        pattern = f"{self.data_dir}/openmars_ozo_my{mars_year}_*.nc"
        nc_files = sorted(glob.glob(pattern))
        
        if not nc_files:
            raise FileNotFoundError(f"未找到 MY{mars_year} 的数据文件")
        
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

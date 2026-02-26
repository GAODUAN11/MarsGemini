import xarray as xr
import matplotlib.pyplot as plt

nc_file = '../backend/openmars/openmars_ozo_my27_ls2_my27_ls17.nc'

ds=xr.open_dataset(nc_file)  # 打开数据集

print("======数据集信息======")
# 查看数据集的基本信息
print(ds)
print("======变量信息======")
# 查看数据集的变量
print(ds.variables)
print("======属性信息======")
# 查看数据集的属性
print(ds.attrs)


ds.close()  # 关闭数据集

---
title: 倒霉的python使用经历
date: 2021-11-05 21:16:31
tags: python 开发语言 后端
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


# 倒霉的python使用经历
由于需要用蚁群算法解决旅行商问题，故打算下载python，jupyter notebook，和scikit-opt库（[文档](https://scikit-opt.github.io/scikit-opt/#/zh/README)）。刚开始直接在python官网下载3.10版本的python。刚开始pip出现了ValueError: check_hostname requires server_hostname错误，关闭了代理后问题解决。将pip换成国内源。
```java
# 清华源
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 或：
# 阿里源
pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
# 腾讯源
pip config set global.index-url http://mirrors.cloud.tencent.com/pypi/simple
# 豆瓣源
pip config set global.index-url http://pypi.douban.com/simple/
```
而后下载scipy库时发现numpy不适配，去官网下载时发现并没有3.10版本numpy+mkl。故卸载python3.10（安装软件再执行一下选择卸载选项）
![](https://img-blog.csdnimg.cn/f679f7f033e54c4481056771b804a370.png?x-oss-process=image/watermark,type_ZHJvaWRzYW5zZmFsbGJhY2s,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_18,color_FFFFFF,t_70,g_se,x_16)
而后安装python3.7。成功下载完所需第三方库，jupyter notebook后运行程序时发现报了一堆错误，这是因为我卸载python并没有把第三方库卸载。故再次卸载python3.7，
而后执行以下命令卸载所有第三方库

```bash
pip freeze > requirements.txt
pip uninstall -r requirements.txt
```
最后将安装文件夹中所有文件直接删除。然后再来一次安装python，安装第三方库，安装jupyter notebook的流程。

①指定jupyter notebook的工作目录
直接再该目录下保存一个bat文件，文件内容即为jupyter notebook。每次点一下就可以。
②jupyter notebook代码自动补全

```bash
pip install jupyter_contrib_nbextensions
jupyter contrib nbextension install --user --skip-running-check
```
在前两步成功的情况下，启动jupyter notebook，会发现在选项栏中多出了Nbextension的选项，点开该选项，并勾选Hinterland，即可添加代码自动补全功能。
[Jupyter Notebook安装（Windows）](https://blog.csdn.net/NickHan_cs/article/details/108204297)

代码

```python
#导入第三方库
import numpy as np
from scipy import spatial
import pandas as pd
import matplotlib.pyplot as plt

num_points = 50

points_coordinate = np.random.rand(num_points, 2)  # 随机生成50个点
#计算它们之间的距离，生成距离矩阵
distance_matrix = spatial.distance.cdist(points_coordinate, points_coordinate, metric='euclidean') 

#计算路径总长度
def cal_total_distance(routine):
    num_points, = routine.shape
    return sum([distance_matrix[routine[i % num_points], routine[(i + 1) % num_points]] for i in range(num_points)])


# 导入蚁群算法库
from sko.ACA import ACA_TSP
"""
参数意义：
func目标函数
n_dim城市个数
size_pop蚂蚁数量
max_iter最大迭代次数
distance_matrix城市之间的距离矩阵，用于计算信息素的挥发
alpha信息素重要程度（默认为1）
beta适应度的重要程度（默认为2）
rho信息素挥发速度（默认为0.1）

"""

aca = ACA_TSP(func=cal_total_distance, n_dim=num_points,
              size_pop=100, max_iter=200,
              distance_matrix=distance_matrix)

best_x, best_y = aca.run() # 运行蚁群算法，找到最优路径

#绘制城市分布
plt.figure(figsize=(10,10))
plt.ylabel("y",fontsize=16)
plt.xlabel("x",fontsize=16)
plt.title("The original point",fontsize=12)
plt.scatter(points_coordinate[:, 0], points_coordinate[:, 1],color= 'red')
plt.show()  
#绘制最优路径
plt.figure(figsize=(10, 10))
plt.ylabel("y",fontsize=16)
plt.xlabel("x",fontsize=16)
plt.title("optimal path",fontsize=12)
best_points_ = np.concatenate([best_x, [best_x[0]]])
best_points_coordinate = points_coordinate[best_points_, :]
plt.plot(best_points_coordinate[:, 0], best_points_coordinate[:, 1], 'o-r')
plt.show()             
```


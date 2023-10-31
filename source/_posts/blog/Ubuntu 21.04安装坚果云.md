---
title: Ubuntu 21.04安装坚果云
date: 2021-11-22 19:25:16
tags: linux ubuntu ubuntu
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


## Ubuntu 21.04安装坚果云
为了在虚拟机上共享文件夹，我在想在ubuntu上安装坚果云。但无论是deb包下载还是源码编译安装，都报缺少gvfs-bin依赖的错误。在看了其他的博客后才正确安装坚果云。
安装步骤

```bash
#安装依赖包，准备构建环境
sudo apt-get install -y libglib2.0-dev libgtk2.0-dev libnautilus-extension-dev python3-gi gir1.2-appindicator3-0.1
#下载Nautilus插件源代码包
wget https://www.jianguoyun.com/static/exe/installer/nutstore_linux_src_installer.tar.gz
# 解压缩，编译和安装Nautilus插件
tar zxf nutstore_linux_src_installer.tar.gz

cd nutstore_linux_src_installer && ./configure && make

sudo make install
#重启Nautilus
nautilus -q
#运行以下命令，自动下载和安装坚果云其他二进制组件
./runtime_bootstrap
```
而后注销用户，在登录页面选择Ubuntu on Xorg才能正常显示。
![](https://img-blog.csdnimg.cn/71cc8ec3ac664fe6801a6bde69999487.png?x-oss-process=image/watermark,type_ZHJvaWRzYW5zZmFsbGJhY2s,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)

参考链接：
[Ubuntu 21.04安装坚果云](https://zhuanlan.zhihu.com/p/383004645)
[下载linux客户端-坚果云](https://www.jianguoyun.com/s/downloads/linux)

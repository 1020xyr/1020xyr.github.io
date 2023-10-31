---
title: Tinyhttpd实战一：设置虚拟机环境，运行Tinyhttpd
date: 2020-02-12 17:55:39
tags: 
categories: 学习记录
---
<meta name="referrer" content="no-referrer" />


### 安装linux虚拟机
首先安装vmware软件，而后下载Ubuntu iso文件[下载地址](https://cn.ubuntu.com/download)
而后创建Ubuntu虚拟机，运行内存与硬盘建议为4G+20G
<mark>建议离线安装</mark>
#### 解决vmware tools无法安装问题
可尝试安装open vm tool 和 open-vm-tools-desktop,实现文件拖动与复制粘贴共享[博客](https://baijiahao.baidu.com/s?id=1634913528783025994&wfr=spider&for=pc)
VMware Tools是VMware虚拟机中自带的一种增强工具，是VMware提供的增强虚拟显卡和硬盘性能、以及同步虚拟机与主机时钟的驱动程序。

只有在VMware虚拟机中安装好了VMware Tools，才能实现主机与虚拟机之间的文件共享，同时可支持自由拖拽的功能，鼠标也可在虚拟机与主机之前自由移动（不用再按ctrl+alt），且虚拟机屏幕也可实现全屏化。

在安装完虚拟机后，有可能会碰到<mark>vmware tools安装选项为灰色</mark>的情况
![](https://img-blog.csdnimg.cn/20200212172623659.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
此时可以手动安装vmware tools
步骤如下：
**方法1**： 在虚拟机设置中添加cd/dvd驱动器，并使用vmware安装目录下的linux.iso文件
![](https://img-blog.csdnimg.cn/20200212173107676.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20200212173126218.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
**方法2**：将cd/dvd驱动器，软盘全部设为自动检测
![](https://img-blog.csdnimg.cn/20200212223707746.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20200212200648799.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
开启虚拟机，点击安装vmware tools，打开光盘文件，其中有一个名为 VMwareTools...tar.gz 的压缩包，将这个压缩包移动到你想解压的目录（例如 /home/Documents/VMTools），然后点击这个压缩包，右键选择“extract here”解压到当前目录。

　　打开终端，进入到解压后的文件夹，然后进入到 vmware-tools-distrib 目录，输入 sudo ./vmware-install.pl 回车，接着就是输入 yes 再一直回车了。

然后编辑虚拟机设置，打开共享文件与复制粘贴
![](https://img-blog.csdnimg.cn/20200225221018968.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20200225221031405.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
#### vmware提示虚拟机似乎正在使用中
删除虚拟机配置文件（vmx）文件夹中的.lck文件
#### vmware 开机黑屏
可能的解决方法
**方法1**：以管理员身份运行命令行窗口---->输入 **netsh winsock reset**，然后重启计算机。

**方法2**：VM->Settings->Hardware->Display在右面的内容栏中将Accelerate 3D graphics 取消打勾，然后重启即可
**方法3**：，打开虚拟机的首选项 打开设备，更改设置，启用虚拟打印机
**方法4**：<mark>重装系统</mark>
### 创建root用户
首先输入命令：**sudo passwd**
输入两次密码后root用户创建成功
用su root切换用户
### 运行Tinyhttpd
由于虚拟机自带的源网速过慢，故开始前需要换源
ubuntu18.04的阿里源：

```cpp
deb http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse
```
**修改配置文件：/etc/apt/sources.list**
用root权限打开，清除其全部内容，换成上面的镜像
**sudo gedit /etc/apt/sources.list**
直接将电脑中的Tinyhttpd拖至虚拟机上，安装geany编辑器

**sudo apt-get update
sudo apt-get install geany
sudo apt-get install make
sudo apt-get install gcc**


**修改makefile文件**

```cpp
all: httpd client

LIBS = -lpthread 

httpd: httpd.c

	gcc -g -W -Wall -pthread $(LIBS) -o $@ $<



client: simpleclient.c

	gcc -W -Wall -o $@ $<

clean:

	rm httpd
```
htdocs中的cgi文件第一行的`#!/usr/bin/perl -Tw` 设为虚拟机上的perl位置（用which perl查询）
然后修改htdocs中文件权限

```cpp

cd htdocs

sudo chmod 600 index.html  

sudo chmod 764 color.cgi check.cgi  
```

而后在tinyhttpd目录下直接make
如果出现make: Nothing to be done for `all' 
则make clean 而后再次make

运行 ./httpd
最后在浏览器中输入localhost：端口号
![](https://img-blog.csdnimg.cn/20200213105629824.png)
![](https://img-blog.csdnimg.cn/20200213105615906.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)


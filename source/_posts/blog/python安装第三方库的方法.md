---
title: python安装第三方库的方法
date: 2020-02-12 15:54:40
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


python安装第三方库的方法分为两种

##### pip 直接安装

直接在命令行中执行pip install + 第三方库名

大部分库都可以使用这种方法，但有一些库由于各种各样的原因，用pip install直接下载总是失败
这时候我们应该采取第二种方式

##### 下载whl文件，而后用pip安装whl文件
tip：如果不知道需要第三方库的哪个版本whl文件，<mark>可以先使用pip install + 第三方库名，确定whl文件</mark>
以statsmodels库为例
![](https://img-blog.csdnimg.cn/20200212161320909.png)
这样我们就知道需要下载statsmodels-0.11.0-cp37-none-win32.whl 文件

下载whl文件的链接
[https://pypi.org](https://pypi.org)
[https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml)

个人更推荐第一个网站，网速更快

下载完whl文件后在地址栏进入命令行
![](https://img-blog.csdnimg.cn/20200212155931121.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
而后复制whl文件名，执行pip install + whl 文件名
![](https://img-blog.csdnimg.cn/2020021216143868.png)
这样第三方库就安装成功了
tip：如果在安装whl文件过程中下载另外的第三方库发生错误，可以先下载安装该第三方库，而后再安装该库（我在安装statsmodels的whl文件时，pasty库下载失败，故重新去下载pasty的whl文件，而后安装statsmodels的whl文件）

最后晒一张成功截图
![](https://img-blog.csdnimg.cn/20200212162007521.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
<mark>如果对你有帮助，可以点个赞哦</mark>

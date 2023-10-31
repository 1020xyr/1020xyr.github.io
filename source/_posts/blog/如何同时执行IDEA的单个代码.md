---
title: 如何同时执行IDEA的单个代码
date: 2020-02-19 17:48:39
tags: 
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


在server client类的程序中，我们经常需要多次执行client端程序，但IDEA默认不能并行运行
假设现在已经运行了server 和 client代码，如果想要再次运行client代码，则会碰到该提示
![](https://img-blog.csdnimg.cn/20200219173830614.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
即该文件不允许并行运行

**解决方法**： 
![](https://img-blog.csdnimg.cn/20200219174346849.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
勾中allow parallel run选项 apply
![](https://img-blog.csdnimg.cn/20200219174408785.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
然后就可以同时运行了
![](https://img-blog.csdnimg.cn/20200219174726470.png)

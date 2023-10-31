---
title: pycharm设置pyqt外部工具
date: 2020-12-22 11:08:35
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />



# pycharm设置pyqt外部工具：
![](https://img-blog.csdnimg.cn/20201222110932540.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)



QTdesigner
![](https://img-blog.csdnimg.cn/20201222110238814.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)

pyuic

![](https://img-blog.csdnimg.cn/2020122211043013.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
```java
argument：$FileName$ -o $FileNameWithoutAllExtensions$.py
```

![](https://img-blog.csdnimg.cn/20201222110720266.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
这样就能右键直接生成py文件而不用使用命令行

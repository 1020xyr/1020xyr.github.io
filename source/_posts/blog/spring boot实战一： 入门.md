---
title: spring boot实战一： 入门
date: 2020-03-04 23:27:14
tags: 
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


### 运行初始项目
[参考链接](https://www.cnblogs.com/wmyskxz/p/9010832.html)
在settings -> Plugins 里边搜Spring Assistant，安装完后重启idea
由于一直网络超时，故直接在https://start.spring.io 下载demo.zip而后用idea打开
打开后如图所示
![](https://img-blog.csdnimg.cn/20200304225913267.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
加入测试程序HelloController
![](https://img-blog.csdnimg.cn/20200305231423522.png)
```cpp
package com.example.demo;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 测试控制器
 */
@RestController
public class HelloController {

    @RequestMapping("/hello")
    public String hello() {
        return "Hello Spring Boot!";
    }
}
```

##### 问题一 Resolving Maven dependencies
若未检测到pom.xml文件并一直卡在Resolving Maven dependencies处
解决方法一：maven换源
[参考链接](https://blog.csdn.net/liangyihuai/article/details/57406870?depth_1-utm_source=distribute.pc_relevant.none-task&utm_source=distribute.pc_relevant.none-task)
由于不存在settings.xml， 需要自己建一个

settings.xml

```cpp
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                          https://maven.apache.org/xsd/settings-1.0.0.xsd">

      <mirrors>
        <mirror>  
            <id>alimaven</id>  
            <name>aliyun maven</name>  
            <url>http://maven.aliyun.com/nexus/content/groups/public/</url>  
            <mirrorOf>central</mirrorOf>          
        </mirror>  
      </mirrors>
</settings>
```
记得勾上override选项
然后apply即可
![](https://img-blog.csdnimg.cn/20200305225641523.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
解决方法二：
![](https://img-blog.csdnimg.cn/20200305222018881.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
即改为

```cpp
修改maven Importing的jvm参数, 默认为700多, 直接修改成 -Xms1024m -Xmx2048m
```
[参考链接](https://blog.csdn.net/dyc_main/article/details/86706404?depth_1-utm_source=distribute.pc_relevant.none-task&utm_source=distribute.pc_relevant.none-task)
##### 问题二 程序包org.springframework.web.bind.annotation不存在
[参考链接](https://blog.csdn.net/u012312667/article/details/77325754)

将pom.xml 中的

```cpp
<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
</dependency>
```
改为

```cpp
<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
</dependency>

```
原因：
spring-boot-starter和spring-boot-starter-web的区别：

spring-boot-starter 是Spring Boot的核心启动器，包含了自动配置、日志和YAML
spring-boot-starter-web 支持全栈式Web开发，包括Tomcat和spring-webmvc
Web开发要用后者。

##### Maven 作用
**理解一**：

先不说maven，也不说java开发，先说做菜，你可能像做个红烧小排(HongshaoxiaopaiApp)，你需要的材料是：

小排(xiaopai.jar)，要小猪的（version=little pig）。
酱油(jiangyou.jar)，要82年的酱油（version=1982）
盐(yan.jar)
糖(tang.jar)，糖要广东产的（version=guangdong）
生姜(shengjiang.jar)
茴香(huixiang.jar)
于是，你要去菜场买小排，去门口杂货店买酱油，买盐……可能你家门口的杂货店还没有1982年的酱油，你要去3公里外的农贸市场买……你买原材料的过程估计会很痛苦，可能买到的材料不是1982年的，会影响口感。

在你正式开始做小排前，你会为食材的事情，忙得半死。

现在有个超市出了个盒装版的半成品红烧小排，把生的小排，1982年的酱油，盐，广东产的糖等材料打包成一个盒子里，你回家只要按照说明，就能把红烧小排做出来，不用考虑材料的来源问题。

Maven就是那个超市，红烧小排就是你要开发的软件，酱油、盐什么的就是你开发软件要用到的jar包——我们知道，开发java系统，下载一堆jar包依赖是很正常的事情。有了maven，你不用去各个网站下载各种版本的jar包，也不用考虑这些jar包的依赖关系。Maven会给你搞定，就是超市的配菜师傅会帮你把红烧小排的配料配齐一样。

现在你应该明白Maven是做什么的了吧。

 

**理解二**：

 网上一般说maven是一个构建工具，其实是说得很准确的，不过我觉得更准确的说法应该是一个自动化的构建工具。

你可以这样说：不用maven的时候所有的jar都不是你家的，需要去各个地方下载拷贝，用了maven所有的jar包都是你家的，想要谁，叫谁的名字就行。（对小白而言，一个用来下载别人现成代码块的工具）
<mark>出自[maven是什么？-Kevinvcc200](https://blog.csdn.net/qq_34107571/article/details/81907157)</mark>
到此为止，我的问题就结束了，这样项目便成功运行
![](https://img-blog.csdnimg.cn/20200305231235585.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)

---
title: wxapp
date: 2019-10-11 23:24:15
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


# 框架  

App(Object object)

注册小程序。接受一个 Object 参数，其指定小程序的生命周期回调等。

App() 必须在 app.js 中调用，必须调用且只能调用一次。不然会出现无法预期的后果。  

Page(Object object)

注册小程序中的一个页面。接受一个 Object 类型参数，其指定页面的初始数据、生命周期回调、事件处理函数等。
参数
# api
<pre><code>wx.navigateTo({     //跳转页面
      url: '../second/second'
    })</pre></code>
#js
单行注释以 // 开头。  
多行注释以 /* 开头，以 */ 结尾。

#属性
bindtap : 向上冒泡

catchtap：向上不冒泡

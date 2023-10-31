---
title: 服务器上部署简单socket程序
date: 2020-02-27 15:37:49
tags: 
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


### 目的
将该博客中的服务器代码放到云服务器上运行，并用本地计算机运行客户端程序进行访问
[博客链接](https://blog.csdn.net/freedom1523646952/article/details/104336708)

### 尝试
使用xshell登录云服务器，**vim server.c** 编辑代码
vim 基本操作 
按 **i**  进入 insert模式，开始编辑
保存退出：esc + : + x + enter
不保存退出： esc + : + q  + ! + enter

由于代码已经写好了，故直接复制粘贴，但vim粘贴时默认缩进，导致代码格式非常乱。
**解决**：在/etc/vim中,修改vimrc,添加 set pastetoggle=\<F9>
之后中进入insert模式后，按F9关闭自动缩进选项

然而用客户端访问我的服务器时，显示connection confused
连接被拒绝

### 解决问题
1 用虚拟机**ping**服务器公网ip，显示能ping通
2 用 **telnet** 测试该ip的访问端口（设置为8000） 不能访问
3 在服务器上用**lsof -i:端口号**查看端口号，显示程序正在监听该端口

<mark>ans</mark>：访问云服务器需要配置安全组规则，配置完成后其他电脑才能访问该服务器。例如
![](https://img-blog.csdnimg.cn/20200227153022622.png)
这样客户端程序就能和服务端程序正常通信了


![](https://img-blog.csdnimg.cn/2020022715353485.png)
![](https://img-blog.csdnimg.cn/20200227153545763.png)

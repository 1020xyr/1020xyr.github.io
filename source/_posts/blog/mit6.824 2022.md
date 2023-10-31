---
title: mit6.824 2022
date: 2022-10-08 19:52:28
tags: 6.824 raft mapreduce kvraft shardkv
categories: 国外课程实验
index_img: https://img-blog.csdnimg.cn/672d2b65e53b4b7c977af40e722b0a4f.jpeg
---
<meta name="referrer" content="no-referrer" />


# 写在前面
两年前写过一次6.824，一直卡在2c没过去，就放弃了。当时只看了[A Tour of GO](https://go.dev/tour/welcome/1)，对GO也不怎么熟悉，现在看了一遍《Go程序设计语言》后再写一遍这些实验，锻炼一下GO语言能力。这篇博客只是简单记录一些实验过程中遇到的问题与收获，并不具备太多参考性。
lab地址：
[6.824: Distributed Systems](https://pdos.csail.mit.edu/6.824/)

优秀的博客/链接推荐：
[如何的才能更好地学习 MIT6.824 分布式系统课程？](https://www.zhihu.com/question/29597104/answer/128443409)
[实效Go编程](https://go-zh.org/doc/effective_go.html)
[raft_translation](https://github.com/brandonwang001/raft_translation/blob/master/raft_translation.pdf)
[raft可视化](http://thesecretlivesofdata.com/raft/)
[Students' Guide to Raft](https://thesquareplanet.com/blog/students-guide-to-raft/)
[Raft Q&A](https://thesquareplanet.com/blog/raft-qa/)
[Debugging by Pretty Printing](https://blog.josejg.com/debugging-pretty/)
[Lab guidance](https://pdos.csail.mit.edu/6.824/labs/guidance.html)
[Raft Locking Advice](https://pdos.csail.mit.edu/6.824/labs/raft-locking.txt)
[Raft Structure Advice](https://pdos.csail.mit.edu/6.824/labs/raft-structure.txt)
[SOFAJRaft 日志复制 - pipeline 实现剖析 | SOFAJRaft 实现原理](https://www.sofastack.tech/blog/sofa-jraft-pipeline-principle/)
[raft在处理用户请求超时的时候，如何避免重试的请求被多次应用？](https://www.zhihu.com/question/278551592)
[一致性模型与共识算法](https://tanxinyu.work/consistency-and-consensus/#etcd-%E7%9A%84-Raft) 
[8.MIT 6.824 LAB 4B(分布式shard database) 西部小笼包](https://www.jianshu.com/p/f5c8ab9cd577)
  

**前期环境准备**
运行环境：Windows vscode remote ssh + Ubuntu 虚拟机
```bash
git clone git://g.csail.mit.edu/6.824-golabs-2022 6.824  # 下载源码
apt install golang	# 安装go
```
由于我比较喜欢用fish，故直接在/etc/environment 设置各个环境变量
```bash[添加链接描述](https://blog.csdn.net/qq_37491769/article/details/103334026)
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/usr/lib/go-1.13/bin"
GOROOT=/usr/lib/go-1.13
GOBIN=/root/mit6.824/6.824/bin
GOPATH=/root/mit6.824/6.824
```
由于想验证环境变量的有效性，故意写错路径名，使得PATH环境设置错误，没想到重启后输入密码登陆后又跳到登陆界面，后只能通过命令行页面暂时设置环境变量，通过vim修改/etc/environment内容才正常运行，所以请仔细设置环境变量！
[Golang环境变量设置详解](https://juejin.cn/post/6844903817071296525)
[Linux中设置和显示环境变量](https://blog.csdn.net/u014436243/article/details/108105244)
[ubuntu输入密码登陆后又跳到登陆界面解决方案](https://blog.csdn.net/qiuchengjia/article/details/52923228)
[关于环境变量/etc/environment](https://blog.csdn.net/qq_37491769/article/details/103334026)

vscode安装一些常用的go扩展，一直install失败，通过设置GOPROXY为https://goproxy.io,direct才成功安装。
```bash
go env -w GOPROXY=https://goproxy.io,direct
```
[最简单解决VSCode中Golang插件依赖安装失败问题](https://blog.csdn.net/zzq997/article/details/113178194)



# MapReduce
[MIT6.824 2022 MapReduce](https://www.jiasun.top/blog/mit6.824%202022%20lab1.html)




# Raft
[MIT6.824 2022 Raft](https://www.jiasun.top/blog/mit6.824%202022%20lab2.html)

# Fault-tolerant Key/Value Service
[MIT6.824 2022 Fault-tolerant Key/Value Service](https://www.jiasun.top/blog/mit6.824%202022%20lab3.html)

# Sharded Key/Value Service
[MIT 6.824 Sharded Key/Value Service](https://www.jiasun.top/blog/mit6.824%202022%20lab4.html)

# 写在后面
因为要忙其他项目，断断续续地写这几个实验，主要时间就花在了通过lab2b和lab4b上了，整体的难度lab2>lab4>lab3>lab1。通过这个实验，对go语言，raft算法，并发程序调试方面有了更深的理解，也让我熟悉了使用vscode进行debug。之前我要么使用vs自带的调试功能，要么使用gdb，没怎么用过vscode的运行与调试功能，确实挺好用的，可以方便地查看各个goroutine的状态。

<mark>找个时间优化一下各个实验的代码</mark>
## 通过截图
**MapReduce**![](https://img-blog.csdnimg.cn/87af82816ee54633aea1e6b718e28d70.png)
**raft部分**
![](https://img-blog.csdnimg.cn/164b4f4e1b8a4933b720d754a1c7fffe.png)
测试脚本
```bash
#!/bin/bash
for i in {1..100};
do
go test ./raft  --count=1 ;
go test ./kvraft --count=1 ;
go test ./shardctrler  --count=1 ;
go test ./shardkv  --count=1 ;
done
```
[go test 禁用测试缓存](https://zhuanlan.zhihu.com/p/160231523)


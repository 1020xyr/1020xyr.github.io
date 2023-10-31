---
title: 通过VSCode上传文件夹至github
date: 2021-01-01 11:24:52
tags: linux ubuntu python
categories: 
---
<meta name="referrer" content="no-referrer" />


如果是第一次连接github账户，则需要设置ssh。
```bash
查看用户名和邮箱地址：
$ git config user.name

$ git config user.email
修改用户名和邮箱地址：

$  git config --global user.name  "xxxx"

S  git config --global user.email  "xxxx"
```
生成SSH Key的秘钥对：[参考博客](https://www.cnblogs.com/flora5/p/7152556.html)

```bash
ssh-keygen -t rsa  #在某个位置生成秘钥对，文件位置会在结果给出
将id_rsa.pub文件内容复制粘贴到github中
ssh -T git@github.com  #运行该命令进行验证
```


首先在GitHub上创建一个Repository，复制url
![](https://img-blog.csdnimg.cn/20210101112110288.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
在一个空文件夹中打开终端，输入

```bash
git clone url
```
而后即可用VSCode打开文件夹，使用其功能进行push pull功能了
![](https://img-blog.csdnimg.cn/20210101112347268.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
上传步骤为：commit all ->push
拉取即为pull
commit时需要写一些提交备注。
实际上VSCode还提供其他的一堆命令，不过这几个命令就够用了，出了问题再用其他的

tip:
 1  拉取仓库时修改url

```bash
git clone git://github.com/spdk/spdk
git clone https://github.com.cnpmjs.org/spdk/spdk
```
而后在.git/config文件中改回来，这样拉取的速度可以加快。
vscode设置git文件可见
![](https://img-blog.csdnimg.cn/eb45c0acd0c648b3a675aa6c917de4bf.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)

 2 上传时不能开代理，否则会出现一些问题
 [OpenSSL SSL_read: Connection was reset, errno 10054](https://www.cnblogs.com/fairylyl/p/15059437.html)
 实际上我只是因为打开了clash，不是上述的原因，不过可以通过以下命令修改github最大文件限制
 ```c
 git config  --global http.postBuffer 5242880003
 ```
 3 GnuTLS recv error (-110): The TLS connection was non-properly terminated
 ```bash
 #方法1
 apt-get install gnutls-bin
git config --global http.sslVerify false
git config --global http.postBuffer 1048576000
#方法2
重置代理，解决
git config --global  --unset https.https://github.com.proxy 
git config --global  --unset http.https://github.com.proxy 
//取消http代理
git config --global --unset http.proxy
//取消https代理 
git config --global --unset https.proxy
 ```
 方法3
 [Stack Overflow](https://stackoverflow.com/questions/52529639/gnutls-recv-error-110-the-tls-connection-was-non-properly-terminated)中里说需要用源码重新编译
 方法4（我自己的方法）：

 ```bash
  #遇到该问题时，先检测与github.com是否连通
  ssh -T git@github.com #-T 不显示终端，只显示连接成功信息
  报错The authenticity of host 'github.com (20.205.243.166)' can't be established
  输入yes，回车后再运行 ssh -T git@github.com，此时成功
  Hi 1020xyr! You've successfully authenticated, but GitHub does not provide shell access.
  而后推送到github就没有报错了
 ```
不过我之前也成功推送过，不知道具体原因。。。

<mark>迁移至gitee..，github访问太多问题</mark>
好像用ssh方式推送能避免很多问题，不过已经迁移完了。
git remote add增加远程仓库，也可以直接修改./git/config文件url
![](https://img-blog.csdnimg.cn/c1ec83b4a63d49b292894ed84dbe63ae.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)
![](https://img-blog.csdnimg.cn/74137d34e4dd4d51b24e5661b61b53a6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)
![](https://img-blog.csdnimg.cn/59badfbb0e2247b7b94f1f2041abc5dc.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)

 [Git Clone错误解决：GnuTLS recv error (-110): The TLS connection was non-properly terminated](https://blog.csdn.net/weixin_43108793/article/details/118306045)

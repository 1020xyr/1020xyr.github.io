---
title: LFS笔记（已搁置）
date: 2021-08-27 16:42:45
tags: linux ubuntu
categories: 
---
<meta name="referrer" content="no-referrer" />


Linux From Scratch Version 记录

- [LFS-BOOK-10.1.pdf](https://www.linuxfromscratch.org/lfs/downloads/stable/LFS-BOOK-10.1.pdf)
- [中文翻译文档](https://bf.mengyan1223.wang/lfs/zh_CN/)

版本：Linux From Scratch Version 10.1  Published March 1st, 2021

宿主机版本：Ubuntu 21.04

## 前期准备

### 1 虚拟机安装

> 使用vmware创建虚拟机，内存10G 硬盘20G  。 在software&update中修改软件源为阿里源，创建root账户，设置成不锁屏，安装常用的软件（chrome，vscode） 安装中文输入法

经验：

**时不时创建虚拟机快照，避免重新来过**

安装过程中尽量不跳过（除了下载环节--没有换源），同一个镜像连续安装两次的分辨率都不一样。。。

设置root账号密码时即使报"*BAD PASSWORD: The password is shorter than 8 characters*"信息仍然可以设成很短的密码

安装fish，更好地敲命令

update是更新软件列表，upgrade是更新软件

安装中文输入法 [blog ](https://jingyan.baidu.com/article/bad08e1e3df10809c9512177.html#:~:text=%E6%80%8E%E4%B9%88%E5%9C%A8ubuntu%E4%B8%AD%E5%AE%89%E8%A3%85%E4%B8%AD%E6%96%87%E8%BE%93%E5%85%A5%E6%B3%95%EF%BC%8C%E5%9B%A0%E4%B8%BA%E7%B3%BB%E7%BB%9F%E8%87%AA%E5%B8%A6%E7%9A%84%E8%BE%93%E5%85%A5%E6%B3%95%E5%AE%89%E8%A3%85%E4%BB%A5%E5%90%8E%E4%BC%9A%E6%9C%89%E4%BA%9B%E5%B1%80%E9%99%90%EF%BC%8C%E5%9B%A0%E6%AD%A4%E6%9C%AC%E6%96%87%E4%BB%8B%E7%BB%8D%E5%A4%96%E9%83%A8%E7%9A%84%E4%B8%AD%E6%96%87%E8%BE%93%E5%85%A5%E6%B3%95%EF%BC%8C%E4%BB%A5%E4%BE%BF%E8%A1%A5%E5%85%A8%E5%8A%9F%E8%83%BD%E3%80%82%20%E6%89%93%E5%BC%80UBUNTU%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F%EF%BC%8C%E7%82%B9%E5%87%BB%E8%8F%9C%E5%8D%95%E6%A0%8F%E4%B8%8A%E7%9A%84%E7%BB%88%E7%AB%AF%E5%91%BD%E4%BB%A4%E7%AA%97%E5%8F%A3%E3%80%82%20%E8%BE%93%E5%85%A5sudo,apt%20install%20fcitx%EF%BC%8C%E6%8F%90%E7%A4%BA%E7%9A%84%E6%97%B6%E5%80%99%E8%BE%93%E5%85%A5y%EF%BC%8C%E7%AD%89%E5%BE%85%E4%B8%80%E4%B8%8B%E5%B0%B1%E5%AE%89%E8%A3%85%E5%A5%BD%E4%BA%86fcitx%E3%80%82) 搜狗输入法Linux版 [blog](https://pinyin.sogou.com/linux/)

安装deb包显示依赖未安装可以使用命令安装相关依赖

```bash
sudo apt-get install -f
```

执行shell文件的方法 [blog](https://blog.csdn.net/gongxifacai_believe/article/details/53081114)

```shell
1 chmod u+x hello.sh 后 ./hello.sh执行
2 sh ./hello.sh
```



### 2 安装特定版本的内核（放弃）

本来看书中要求宿主机内核版本为3.2，打算将系统内核降到该版本[blog](https://blog.csdn.net/weixin_42915431/article/details/106614841)，加入源：deb http://security.ubuntu.com/ubuntu trusty-security main后出现"*the following signatures couldn’t be verified because the public key is not avai*"问题，使用命令将公钥添加到服务器[blog](https://blog.csdn.net/li740207611/article/details/51931333)   

```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8D5A09DC9B929006
```

 在*apt-cache search linux*中并没有找到3.2版本的内核，故在http://kernel.ubuntu.com/~kernel-ppa/mainline/网站上下载3.2版本对应的安装包，安装之后显示缺少module-init-tools，安装完module-init-tools之后修改内核启动顺序。**重启后系统崩溃，只能重装系统** ----------------------------------------------------------重装系统x1

重新阅读LFS教程这段话我又觉得好像内核版本大于3.2就行，真是白费功夫。。。

> There are two ways you can go about this. First, see if your Linux vendor provides a 3.2 **or later kernel package**. If so,
>
> you may wish to install it.
>



### 3 宿主机上安装特定版本的软件

> tips：可以先执行version-check.sh脚本，提示缺啥软件就安啥软件，除了gcc g++需要配置一下，/bin/sh需要改一下指向，其他的软件都是直接安装就完事了,没报错的就不安。bison和gawk都自动链接上了，都不用我改

```bash
bash, version 5.1.4(1)-release
/bin/sh -> /usr/bin/bash
Binutils: (GNU Binutils for Ubuntu) 2.36.1
bison (GNU Bison) 3.7.5
/usr/bin/yacc -> /usr/bin/bison.yacc
bzip2,  Version 1.0.8, 13-Jul-2019.
Coreutils:  8.32
diff (GNU diffutils) 3.7
find (GNU findutils) 4.8.0
GNU Awk 5.1.0, API: 3.0 (GNU MPFR 4.1.0, GNU MP 6.2.1)
/usr/bin/awk -> /usr/bin/gawk
gcc (Ubuntu 9.3.0-23ubuntu2) 9.3.0
g++ (Ubuntu 9.3.0-23ubuntu2) 9.3.0
(Ubuntu GLIBC 2.33-0ubuntu5) 2.33
grep (GNU grep) 3.6
gzip 1.10
Linux version 5.11.0-31-generic (buildd@lcy01-amd64-009) (gcc (Ubuntu 10.3.0-1ubuntu1) 10.3.0, GNU ld (GNU Binutils for Ubuntu) 2.36.1) #33-Ubuntu SMP Wed Aug 11 13:19:04 UTC 2021
m4 (GNU M4) 1.4.18
GNU Make 4.3
GNU patch 2.7.6
Perl version='5.32.1';
Python 3.9.5
sed (GNU sed) 4.7
tar (GNU tar) 1.34
texi2any (GNU texinfo) 6.7
xz (XZ Utils) 5.2.5
g++ compilation OK
```



```bash
#查看已安装软件版本
dpkg -l
apt list --installed
#ubuntu安装特定版本软件
#列出所有软件版本
apt-cache madison 软件名
#安装特定版本软件
apt-get install  软件名=版本号
#删除软件
sudo apt-get --purge remove 软件名
```

> **软链接**：
>
> - 1.软链接，以路径的形式存在。类似于Windows操作系统中的快捷方式
> - 2.软链接可以 跨文件系统 ，硬链接不可以
> - 3.软链接可以对一个不存在的文件名进行链接
> - 4.软链接可以对目录进行链接
>
> **硬链接**：
>
> - 1.硬链接，以文件副本的形式存在。但不占用实际空间。
> - 2.不允许给目录创建硬链接
> - 3.硬链接只有在同一个文件系统中才能创建



```bash
#/bin/sh 指向 /bin/dash,将其指向/bin/bash
#先备份文件
sudo cp -d /bin/sh  /bin/sh_bak
sudo ln -snf /bin/bash /bin/sh 
```



安装gcc [blog](https://developer.aliyun.com/article/766146)

原来 “gcc | 4:10.3.0-1ubuntu1 | http://mirrors.aliyun.com/ubuntu hirsute/main amd64 Packages”是指4-10版本都有，直接运行命令就成了，我还以为只有10.3版本呢。。。

```bash
sudo apt install gcc-9 g++-9 
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-9 90 --slave /usr/bin/g++ g++ /usr/bin/g++-9 --slave /usr/bin/gcov gcov /usr/bin/gcov-9
```



glibc（放弃）

开始想安装2.15版的 [参考博客，但实际上是找错了，是redhat系列教程](https://cloud.tencent.com/developer/article/1453839)，执行以下命令时

```bash
../configure --prefix=/usr --disable-profile --enable-add-ons --with-headers=/usr/include --with-binutils=/usr/bi
```

报错“*These critical programs are missing or too old: as ld”*,[blog](https://blog.csdn.net/weixin_37697242/article/details/101446999)里面说可以修改configure文件内容，想了想还是算了。故换2.32版本的glibc安装，执行*make -j4*命令时报错*/usr/include/linux/errno.h:1:10: fatal error: asm/errno.h: No such file or directory 和 asm/prctl.h  No such file or directory*，找了一下发现prctl.h在/usr/include/x86_64-linux-gnu/asm文件夹中，故执行以下命令生成执行该文件夹的软链。

```bash
ln -s /usr/include/x86_64-linux-gnu/asm  /usr/include/asm
```

然后执行make -j4命令时一大堆输出，最后报一大堆错误

```bash
/usr/bin/ld: /usr/lib/gcc/x86_64-linux-gnu/9/libstdc++.so: undefined reference to `fstat64@GLIBC_2.33'
/usr/bin/ld: /usr/lib/gcc/x86_64-linux-gnu/9/libstdc++.so: undefined reference to `lstat@GLIBC_2.33'
/usr/bin/ld: /usr/lib/gcc/x86_64-linux-gnu/9/libstdc++.so: undefined reference to `stat@GLIBC_2.33'
collect2: error: ld returned 1 exit status
make[2]: *** [../Rules:215: /opt/glibc-2.32/build/support/links-dso-program] Error 1
make[2]: Leaving directory '/opt/glibc-2.32/support'
make[1]: *** [Makefile:470: support/others] Error 2
make[1]: Leaving directory '/opt/glibc-2.32'
make: *** [Makefile:9: all] Error 2
```

懒得找错误原因，直接make install

```bash
make[1]: [Makefile:119: install] Segmentation fault (core dumped) (ignored)
LD_SO=ld-linux-x86-64.so.2 CC="gcc -B/usr/bin/" /usr/bin/perl scripts/test-installation.pl /opt/glibc-2.32/build/
make[1]: *** [Makefile:120: install] Segmentation fault (core dumped)
make[1]: Leaving directory '/opt/glibc-2.32'
make: *** [Makefile:12: install] Error 2
```

而后执行啥命令都显示aborted（core dump），**本着重启解决一切问题的原则，我重启了系统，而后系统崩溃**-----------------------------------------------------重装系统x2

后面发现原来教程就不是ubuntu的。我真傻，真的。祥林嫂.jpg

我用以下命令查看系统glibc版本的时候，发现没有，还以为系统没有glibc呢。看到rpm的时候就应该反应过来的

```bash
#1、查看系统glibc支持的版本
strings /lib64/libc.so.6 |grep GLIBC
rpm -qa | grep glibc


#实际上ubuntu系统查看glibc版本的命令
ldd --version
```



**奇怪的vmware**

在第二次系统崩溃后，为了拿回虚拟机中的文件，将该虚拟机（虚拟机1）的硬盘挂载到另一个虚拟机（虚拟机2）上，将虚拟机1桌面的文件的文件都移了出来。反正虚拟机1系统都崩溃了，我就删除了这个虚拟机。而后奇怪的点来了，当我将虚拟机1的硬盘移除之后，虚拟机2启动的时候检测不到操作系统，一直从尝试网络引导操作系统，改BIOS选项也没用。没办法，我就试着在虚拟机2中添加了新安装的虚拟机（虚拟机3）的一个硬盘，没想到系统就启动成功了。为了将虚拟机2独立起来，不能一直依赖虚拟机3的硬盘。我保存了虚拟机2的快照。而后虚拟机3显示*“父虚拟磁盘在子虚拟磁盘创建之后被修改过。父虚拟磁盘的内容 ID 与子虚拟磁盘中对应的父内容 ID 不匹配”*，在一通操作之后，虚拟机2，虚拟机3全炸裂-----------------------------------------------------------------------------------------------重装系统x3

措施：

为了将虚拟机2分离出来，直接复制虚拟机2的硬盘文件到另一个文件夹，而后重装系统时指定现有磁盘（由于硬盘上有操作系统了所以并没有真的重装系统）。而后将CD/DVD驱动器都移除了。虚拟机2搞定！

为了修复虚拟机3 “父虚拟磁盘在子虚拟磁盘创建之后被修改过。父虚拟磁盘的内容 ID 与子虚拟磁盘中对应的父内容 ID 不匹配”还有“VMware:无法打开磁盘xxx.vmdk 或者某一个快照所依赖的磁盘”的问题。打开xxx.vmsd(我这里是LFS.vmsd)。记住每个快照对应的vmk文件。纠正这些快照的parentCID和CID，使得当前快照的parentCID等于是一个快照的CID。改完之后转回快照就成功了。

我的这些操作真的憨。。。。






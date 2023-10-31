---
title: femu使用记录
date: 2023-05-09 10:25:13
tags: femu ssd zns
categories: 
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
index_img: https://img-blog.csdnimg.cn/ffad2c30ae0c48b2958c58a58cfb370a.png
---
<meta name="referrer" content="no-referrer" />


<!-- toc -->
> Briefly speaking, FEMU is a fast, accurate, scalable, and extensible NVMe SSD Emulator. Based upon QEMU/KVM, FEMU is exposed to Guest OS (Linux) as an NVMe block device (e.g. /dev/nvme0nX). It supports emulating different types of SSDs

这篇博客用于记录femu搭建与使用过程中遇到的问题，持续更新
## 环境搭建
首先是搭建环境，刚开始按照博客[安装FEMU，并使用FEMU模拟SSD黑盒、OCSSD、NoSSD。](https://blog.csdn.net/bijie1196/article/details/120752319)，自己制作镜像，但失败了，故选择第一种方法，下载femu提供的镜像，下载完成后直接运行run_zns.sh脚本，不需要第二种方法的安装操作系统，修改grub等操作
```bash
# 邮件内容
Hi,
Thank you again for your interest in FEMU!
The tarball size is 1.4GB. After decompression, the VM image file size is ~14GB.
Downloading and decompression might take a while depending on your Internet
connection speed and CPU processing capability. Please wait patiently!
Below are the steps to download, decompress, and verify the FEMU VM image.
mkdir -p ~/images
cd ~/images
wget http://people.cs.uchicago.edu/~huaicheng/femu/femu-vm.tar.xz
tar xJvf femu-vm.tar.xz
After these steps, you will get two files: "u20s.qcow2" and "u20s.md5sum".
You can verify the integrity of the VM image file by doing:
md5sum u20s.qcow2 > tmp.md5sum
diff tmp.md5sum u20s.md5sum
If diff complains that the above two files differ, then the VM image file is
corrupted. Please redo the above steps.
The user account and guest OS of the VM:
- username: femu
- passwd : femu
- Guest OS: Ubuntu 20.04.1 server, with kernel 5.4
If you think FEMU is useful to your project, we appreciate you could consider
starring the FEMU github repo to support us, thanks!
Best,
Huaicheng
```
以root权限运行nvme list能看到zns ssd，则表示搭建环境成功

```bash
root@fvm /h/f/libnvme (master)# nvme  list
Node                  SN                   Model                                    Namespace Usage                      Format           FW Rev  
--------------------- -------------------- ---------------------------------------- --------- -------------------------- ---------------- --------
/dev/nvme0n1          vZNSSD0              FEMU ZNS-SSD Controller                  1           4.29  GB /   4.29  GB    512   B +  0 B   1.0     
```
可使用ssh连接虚拟机，端口号即为hostfwd定义的端口号（8080），vscode连接更方便

**自己制作镜像经验**
源码编译qemu

```bash
sudo apt-get install git fakeroot build-essential ncurses-dev xz-utils libssl-dev bc flex libelf-dev bison meson
wget https://download.qemu.org/qemu-8.0.0.tar.xz
tar xvJf qemu-8.0.0.tar.xz
cd qemu-8.0.0
./configure --enable-kvm --enable-debug --enable-vnc --enable-werror  --target-list="x86_64-softmmu" --enable-sdl
make
make install
```
[qemu运行虚拟机无反应，只输出一行提示信息:VNC server running on 127.0.0.1:5900](https://blog.csdn.net/qq_36393978/article/details/118353939)


## libnvme：libnvme.so.1: cannot open shared object file: No such file or directory
[libnvme](https://github.com/linux-nvme/libnvme)
> This is the libnvme development C library. libnvme provides type definitions for NVMe specification structures, enumerations, and bit fields, helper functions to construct, dispatch, and decode commands and payloads, and utilities to connect, scan, and manage nvme devices on a Linux system.

使用以下命令编译源文件
```bash
gcc zns_rw.c -o zns_rw  -lnvme
```
执行
```bash
./zns_rw
./zns_rw: error while loading shared libraries: libnvme.so.1: cannot open shared object file: No such file or directory
```
使用ldd列出文件依赖的动态库
```bash
ldd zns_rw
        linux-vdso.so.1 (0x00007ffe90b75000)
        libnvme.so.1 => not found
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f396cb49000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f396cd49000)
```
也就是说链接器不知道去哪找到libnvme.so.1，查看libnvme库install的输出

```bash
meson install -C .build
ninja: Entering directory `.build'
ninja: no work to do.
Installing src/libnvme.so.1.4.0 to /usr/local/lib64
Installing src/libnvme-mi.so.1.4.0 to /usr/local/lib64
Installing /home/femu/libnvme/src/libnvme.h to /usr/local/include
Installing /home/femu/libnvme/src/libnvme-mi.h to /usr/local/include
Installing /home/femu/libnvme/src/nvme/api-types.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/fabrics.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/filters.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/ioctl.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/linux.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/log.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/nbft.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/tree.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/types.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/util.h to /usr/local/include/nvme
Installing /home/femu/libnvme/src/nvme/mi.h to /usr/local/include/nvme
Installing /home/femu/libnvme/.build/meson-private/libnvme.pc to /usr/local/lib64/pkgconfig
Installing /home/femu/libnvme/.build/meson-private/libnvme-mi.pc to /usr/local/lib64/pkgconfig
```
故设置动态库路径为/usr/local/lib64重新编译

```bash
gcc zns_rw.c -o zns_rw  -lnvme -L /usr/local/lib64/ -Wl,-rpath=/usr/local/lib64/
ldd zns_rw
        linux-vdso.so.1 (0x00007ffe233b1000)
        libnvme.so.1 => /usr/local/lib64/libnvme.so.1 (0x00007fc367ee5000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fc367cec000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fc367f1d000)
```

-L选项告诉链接器在链接时寻找动态库的路径
-Wl,-rpath选项告诉链接器在运行时寻找动态库的路径


```bash
 man gcc | grep "Wl"
       -Wl,option
           Pass option as an option to the linker.  If option contains commas, it is split into multiple options at the commas.  You can use this syntax to pass an argument to the option.  For example, -Wl,-Map,output.map passes -Map output.map to the
           linker.  When using the GNU linker, you can also get the same effect with -Wl,-Map=output.map.
           
ld --help | grep "rpath"
                              Just link symbols (if directory, same as --rpath)
  -rpath PATH                 Set runtime shared library search path
  -rpath-link PATH            Set link time shared library search path
```

相关博客
[I don't understand -Wl,-rpath -Wl,](https://stackoverflow.com/questions/6562403/i-dont-understand-wl-rpath-wl)
[gcc编译过程、gcc命令参数、静态库和动态库搜索路径](https://zhuanlan.zhihu.com/p/183071070#:~:text=%E4%B8%89%E3%80%81%E9%9D%99%E6%80%81%E5%BA%93%E5%92%8C%E5%8A%A8%E6%80%81%E5%BA%93%201%20ELF%E5%8F%AF%E6%89%A7%E8%A1%8C%E6%96%87%E4%BB%B6%E4%B8%AD%E5%8A%A8%E6%80%81%E6%AE%B5DT_PATH%E6%8C%87%E5%AE%9A%EF%BC%9Bgcc%E5%8A%A0%E5%85%A5%E8%BF%9E%E6%8E%A5%E5%8F%82%E6%95%B0%E2%80%9C-Wl,-rpath%E2%80%9D%E6%8C%87%E5%AE%9A%E5%8A%A8%E6%80%81%E5%BA%93%E6%90%9C%E7%B4%A2%E8%B7%AF%E5%BE%84%EF%BC%8C%E5%A4%9A%E4%B8%AA%E8%B7%AF%E5%BE%84%E4%B9%8B%E9%97%B4%E7%94%A8%E5%86%92%E5%8F%B7%E5%88%86%E9%9A%94%EF%BC%9B%202%20%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8FLD_LIBRARY_PATH%E6%8C%87%E5%AE%9A%E8%B7%AF%E5%BE%84%EF%BC%9B%203,/etc/ld.so.cache%E4%B8%AD%E7%BC%93%E5%AD%98%E7%9A%84%E5%8A%A8%E6%80%81%E5%BA%93%E8%B7%AF%E5%BE%84%E3%80%82%20%E9%80%9A%E8%BF%87%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/etc/ld.so.conf%E5%A2%9E%E5%88%A0%E8%B7%AF%E5%BE%84%EF%BC%88%E4%BF%AE%E6%94%B9%E5%90%8E%E9%9C%80%E8%A6%81%E8%BF%90%E8%A1%8Cldconfig%E5%91%BD%E4%BB%A4%EF%BC%89%EF%BC%9B%204%20/lib/%205%20/usr/lib/)
[《c专家编程》读书笔记：第五章 对链接的思考](https://www.jiasun.top/blog/%E3%80%8Ac%E4%B8%93%E5%AE%B6%E7%BC%96%E7%A8%8B%E3%80%8B%E8%AF%BB%E4%B9%A6%E7%AC%94%E8%AE%B0.html)


## 调试方法
一：重新编译femu，在femu-compile.sh configure后加上--enable-debug选项，保证优化等级为-O0
```bash
# 编译输出
  Compilation
    host CPU                     : x86_64
    host endianness              : little
    C compiler                   : cc -m64 -mcx16
    Host C compiler              : cc -m64 -mcx16
    C++ compiler                 : c++ -m64 -mcx16
    CFLAGS                       : -g -O0
    CXXFLAGS                     : -g -O0
```
二：gdb运行程序

```bash
 gdb --args  x86_64-softmmu/qemu-system-x86_64 \
                                            -name "FEMU-ZNSSD-VM" \
                                            -enable-kvm \
                                            -cpu host \
                                            -smp 4 \
                                            -m 4G \
                                            -device virtio-scsi-pci,id=scsi0 \
                                            -device scsi-hd,drive=hd0 \
                                            -drive file=/root/images/u20s.qcow2,if=none,aio=native,cache=none,format=qcow2,id=hd0 \
                                            -device femu,devsz_mb=4096,femu_mode=3 \
                                            -net user,hostfwd=tcp::8080-:22 \
                                            -net nic,model=virtio \
                                            -nographic \
                                            -qmp unix:./qmp-sock,server,nowait 2>&1 | tee log
(gdb) handle SIGUSR1 nostop
Signal        Stop      Print   Pass to program Description
SIGUSR1       No        Yes     Yes             User defined signal 1
```
三： 调试演示
而后就是常规的gdb操作了，拿一个错误的程序来调试
![](https://img-blog.csdnimg.cn/8ad8a310603449978eb55174056102c4.png)
```bash
(gdb) b zns.c:1110
Breakpoint 1 at 0x489f0b: file ../hw/femu/zns/zns.c, line 1110.
(gdb) r
# 开启虚拟机
```



错误的读写测试代码
```c
// SPDX-License-Identifier: LGPL-2.1-or-later
/**
 * This file is part of libnvme.
 * Copyright (c) 2020 Western Digital Corporation or its affiliates.
 *
 * Authors: Keith Busch <keith.busch@wdc.com>
 */

/**
 * Search out for ZNS type namespaces, and if found, report their properties.
 */
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>
#include <libnvme.h>
#include <inttypes.h>
#include <errno.h>
#define TEST_SIZE (4096)
#define TEST_BLOCK (8)

static void rw_test(nvme_ns_t n) {
  char write_data[TEST_SIZE];
  char read_data[TEST_SIZE];
  memset(write_data, 0x12, TEST_SIZE);
  memset(read_data, 0x34, TEST_SIZE);
  int fd = nvme_ns_get_fd(n);
  int nsid = nvme_ns_get_nsid(n);
  uint64_t req_res;

  struct nvme_zns_append_args arg;
  arg.data = write_data;
  arg.data_len = TEST_SIZE;
  arg.fd = fd;
  arg.nsid = nsid;
  arg.nlb = TEST_BLOCK;
  arg.zslba = 0;
  arg.result = &req_res;
  arg.args_size = sizeof(arg);
  arg.timeout = 1000;

  int ret = nvme_zns_append(&arg);
  printf("ret:%d req res:%lx erron:%d\n", ret, req_res, errno);
}

int main() {
  nvme_subsystem_t s;
  nvme_root_t r;
  nvme_host_t h;
  nvme_ctrl_t c;
  nvme_ns_t n;

  r = nvme_scan(NULL);
  if (!r) return -1;

  nvme_for_each_host(r, h) {
    nvme_for_each_subsystem(h, s) {
      nvme_subsystem_for_each_ctrl(s, c) {
        nvme_ctrl_for_each_ns(c, n) {
          if (nvme_ns_get_csi(n) == NVME_CSI_ZNS) {
            rw_test(n);
          }
        }
      }
    }
  }
  nvme_free_tree(r);
}

```
在虚拟机中执行该程序（用vscode连接8080端口）
![](https://img-blog.csdnimg.cn/ff858f9276e1477ca33ad8882d1f1fa3.png)


gdb显示
```c
Ubuntu 20.04.1 LTS fvm ttyS0

fvm login: [Switching to Thread 0x7ffff5c2d700 (LWP 423223)]

Thread 9 "qemu-system-x86" hit Breakpoint 1, zns_do_write (n=0x555557cae9d0, req=0x7ffedc36a3a0, append=true, wrz=false) at ../hw/femu/zns/zns.c:1110
1110        printf("****************Append Failed***************\n");
(gdb) p/x status
$1 = 0x4002
(gdb) 
```


<mark>也可以在执行测试程序前再打断点</mark>
类似于以下操作步骤
```bash
Thread 1 "qemu-system-x86" received signal SIGINT, Interrupt.
0x00007ffff75c2a96 in __ppoll (fds=0x555556f074a0, nfds=20, timeout=<optimized out>, sigmask=0x0) at ../sysdeps/unix/sysv/linux/ppoll.c:44
44      ../sysdeps/unix/sysv/linux/ppoll.c: 没有那个文件或目录.
(gdb) b zns_do_write
Breakpoint 1 at 0x5555559ddcab: file ../hw/femu/zns/zns.c, line 1051.
(gdb) c
Continuing.
[Switching to Thread 0x7ffff5c2d700 (LWP 426245)]

Thread 9 "qemu-system-x86" hit Breakpoint 1, zns_do_write (n=0x1, req=0x7ffedc0eb000, append=false, wrz=true) at ../hw/femu/zns/zns.c:1051
1051    {
```
通过debug，找到了程序中错误所在（nlb是一个基于0的值，实际值需减一）
```c
// SPDX-License-Identifier: LGPL-2.1-or-later
/**
 * This file is part of libnvme.
 * Copyright (c) 2020 Western Digital Corporation or its affiliates.
 *
 * Authors: Keith Busch <keith.busch@wdc.com>
 */

/**
 * Search out for ZNS type namespaces, and if found, report their properties.
 */
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>
#include <libnvme.h>
#include <inttypes.h>
#include <errno.h>

#define TEST_SIZE (4096)
#define TEST_BLOCK (8 - 1)

static void rw_test(nvme_ns_t n) {
  char write_data[TEST_SIZE];
  char read_data[TEST_SIZE];
  memset(write_data, 0x12, TEST_SIZE);
  memset(read_data, 0x34, TEST_SIZE);
  __u64 slba = 0x140000;
  int fd = nvme_ns_get_fd(n);
  int nsid = nvme_ns_get_nsid(n);
  int ret = 0;

  struct nvme_zns_append_args append_arg;
  __u64 append_cq = 0x0;
  memset(&append_arg, 0x0, sizeof(append_arg));
  append_arg.zslba = slba;
  append_arg.result = &append_cq;
  append_arg.data = write_data;
  append_arg.data_len = TEST_SIZE;
  append_arg.fd = fd;
  append_arg.nsid = nsid;
  append_arg.nlb = TEST_BLOCK;
  append_arg.args_size = sizeof(append_arg);
  append_arg.timeout = 1000;

  ret = nvme_zns_append(&append_arg);
  if (ret != 0) {
    printf("append failed. ret:%d req res:%llx erron:%d\n", ret, append_cq, errno);
  }
  printf("append cq:%llx\n", append_cq);

  printf("berfore\n");
  for (int i = 0; i < 10; i++) {
    printf("%x ", read_data[i]);
  }

  struct nvme_io_args read_arg;
  memset(&read_arg, 0x0, sizeof(read_arg));
  __u32 read_cq = 0x0;
  read_arg.slba = slba;
  read_arg.result = &read_cq;
  read_arg.data = read_data;
  read_arg.data_len = TEST_SIZE;
  read_arg.args_size = sizeof(read_arg);
  read_arg.nsid = nsid;
  read_arg.fd = fd;
  read_arg.nlb = TEST_BLOCK;
  read_arg.timeout = 1000;

  ret = nvme_read(&read_arg);
  if (ret != 0) {
    printf("read failed. ret:%d req res:%x erron:%d\n", ret, read_cq, errno);
  }
  printf("\nread cq:%x\n", read_cq);

  printf("after\n");
  for (int i = 0; i < 10; i++) {
    printf("%x ", read_data[i]);
  }
}

int main() {
  nvme_subsystem_t s;
  nvme_root_t r;
  nvme_host_t h;
  nvme_ctrl_t c;
  nvme_ns_t n;

  r = nvme_scan(NULL);
  if (!r) return -1;

  nvme_for_each_host(r, h) {
    nvme_for_each_subsystem(h, s) {
      nvme_subsystem_for_each_ctrl(s, c) {
        nvme_ctrl_for_each_ns(c, n) {
          if (nvme_ns_get_csi(n) == NVME_CSI_ZNS) {
            rw_test(n);
          }
        }
      }
    }
  }
  nvme_free_tree(r);
}

/*
nvme zns report-zones /dev/nvme0n1
nr_zones: 32
SLBA: 0x0        WP: 0x0        Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x40000    WP: 0x40000    Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x80000    WP: 0x80000    Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0xc0000    WP: 0xc0000    Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x100000   WP: 0x100000   Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x140000   WP: 0x140000   Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x180000   WP: 0x180000   Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
SLBA: 0x1c0000   WP: 0x1c0000   Cap: 0x40000    State: EMPTY        Type: SEQWRITE_REQ   Attrs: 0x0
...
*/
```

```bash
gcc zns_rw.c -o zns_rw  -lnvme -L /usr/local/lib64/ -Wl,-rpath=/usr/local/lib64/ 
./zns_rw
append cq:140000
berfore
34 34 34 34 34 34 34 34 34 34 
read cq:0
after
12 12 12 12 12 12 12 12 12 12
```

四：解决问题的经历
1 刚开始的时候想要调试femu，就想使用6.081 qemu调试内核的方式，但也不知道符号表在哪，并且femu虚拟出来的是一个IO设备，总觉得和调试内核有点不一样，后面看到[博客qemu侧 块设备调试记录（一）](https://blog.csdn.net/qq_41146650/article/details/127279700)，具体内容没怎么看，只是发现原来可以直接将qemu当作可执行程序来调试，故用同样的方法试了试femu，发现可以。
2 gdb运行的时候时不时有输出 "Program received signal SIGUSR1, User defined signal 1." 打断运行，故执行“handle SIGUSR1  nostop”，使得用户定义中断不停止运行。
3 错误击中断点时用bt发现各个变量都优化掉了“optimized out”，故需要修改编译选项
看到执行femu-compile.sh的输出中有如下信息
```c
  Compilation
    host CPU                     : x86_64
    host endianness              : little
    C compiler                   : cc -m64 -mcx16
    Host C compiler              : cc -m64 -mcx16
    C++ compiler                 : c++ -m64 -mcx16
    CFLAGS                       : -g -O2
    CXXFLAGS                     : -g -O2
```
全局搜索Compilation,-O,optimization等相关信息，然后一步一步倒退终于看到了相应的选项 --enable-debug
```bash
// meson.build
option_cflags = (get_option('debug') ? ['-g'] : [])
if get_option('optimization') != 'plain'
  option_cflags += ['-O' + get_option('optimization')]
endif

 // configure
 --enable-debug)
      # Enable debugging options that aren't excessively noisy
      debug_tcg="yes"
      meson_option_parse --enable-debug-mutex ""
      meson_option_add -Doptimization=0
      fortify_source="no"
      
加上 --enable-debug选项后
  Compilation
    host CPU                     : x86_64
    host endianness              : little
    C compiler                   : cc -m64 -mcx16
    Host C compiler              : cc -m64 -mcx16
    C++ compiler                 : c++ -m64 -mcx16
    CFLAGS                       : -g -O0
    CXXFLAGS                     : -g -O0
```

## Zone Append Size Limit (ZASL)
![](https://img-blog.csdnimg.cn/07e7c3e60eb1468e805938b0f526059b.png)
用程序测试并发读写，随机生成写入的扇区数，发现femu输出
```bash
****************Append Failed***************
Error IO processed!
```
加上打印status

```c
err:
    printf("****************Append Failed***************\n");
    printf("status:%x\n",status);
    return status | NVME_DNR;
    
else if (status == NVME_SUCCESS) {
            /* Normal I/Os that don't need delay emulation */
            req->status = status;
        } else {
            femu_err("Error IO processed! status is %x\n",status);
        }
```
发现status为0x2 （NVME_INVALID_FIELD），通过gdb发现出错的代码行

```c
zns_check_zone_write：
if (zns_l2b(ns, nlb) > (n->page_size << n->zasl)) {
    status = NVME_INVALID_FIELD;
}

(gdb) p n->page_size 
$10 = 4096
(gdb)p n->zasl 
$11 = 5 '\005'
(gdb)p n->page_size << n->zasl 
$12 = 131072
```
所以写入数据大小应该小于等于128KB

倒退到其定义过程
```c
static int zns_start_ctrl(FemuCtrl *n)
{
    /* Coperd: let's fail early before anything crazy happens */
    assert(n->page_size == 4096);

    if (!n->zasl_bs) {
        n->zasl = n->mdts;
    } else {
        if (n->zasl_bs < n->page_size) {
            femu_err("ZASL too small (%dB), must >= 1 page (4K)\n", n->zasl_bs);
            return -1;
        }
        n->zasl = 31 - clz32(n->zasl_bs / n->page_size);
    }

    return 0;
}

(gdb) p n->zasl_bs
$4 = 131072
(gdb) p clz32(n->zasl_bs / n->page_size)
$5 = 26
(gdb) p n->zasl_bs / n->page_size
$6 = 32

static int zns_init_zone_cap(FemuCtrl *n)
{
    n->zoned = true;
    n->zasl_bs = NVME_DEFAULT_MAX_AZ_SIZE;
    n->zone_size_bs = NVME_DEFAULT_ZONE_SIZE;
    n->zone_cap_bs = 0;
    n->cross_zone_read = false;
    n->max_active_zones = 0;
    n->max_open_zones = 0;
    n->zd_extension_size = 0;

    return 0;
}

#define NVME_DEFAULT_MAX_AZ_SIZE    (128 * KiB)
```


## BUG: kernel NULL pointer dereference, address: 0000000000000008
```bash
[FEMU] Err: Error IO processed! status is 41b9
[  484.444834] BUG: kernel NULL pointer dereference, address: 0000000000000008
[  484.460187] #PF: supervisor write access in kernel mode
[  484.460187] #PF: error_code(0x0002) - not-present page
[  484.460187] PGD 0 P4D 0 
[  484.460187] Oops: 0002 [#1] SMP PTI
[  484.460187] CPU: 0 PID: 0 Comm: swapper/0 Kdump: loaded Not tainted 5.4.0-148-generic #165-Ubuntu
[  484.460187] Hardware name: QEMU Standard PC (i440FX + PIIX, 1996), BIOS rel-1.16.2-0-gea1b7a073390-prebuilt.qemu.org 04/01/2014
[  484.460187] RIP: 0010:_raw_spin_lock_irqsave+0x23/0x40
[  484.460187] Code: 0f 1f 80 00 00 00 00 0f 1f 44 00 00 55 48 89 e5 41 54 9c 58 0f 1f 44 00 00 49 89 c4 fa 66 0f 1f 44 00 00 31 c0 ba 01 00 00 00 <f0> 0f b1 17 75 07 4c 89 e0 41 5c 5d c3 89 c6 e8 69 1a 60 ff 66 90
[  484.460187] RSP: 0018:ffffaef300003dc8 EFLAGS: 00010046
[  484.460187] RAX: 0000000000000000 RBX: 0000000000000000 RCX: 0000000000000022
[  484.460187] RDX: 0000000000000001 RSI: 0000000000000000 RDI: 0000000000000008
[  484.460187] RBP: ffffaef300003dd0 R08: 0000000000000000 R09: 000000000048c586
[  484.460187] R10: ffff9fd9699e0900 R11: 0000000000000000 R12: 0000000000000046
[  484.460187] R13: 0000000000000000 R14: 000000704a67804f R15: 0000000000000000
[  484.660900] FS:  0000000000000000(0000) GS:ffff9fd97ba00000(0000) knlGS:0000000000000000
[  484.660900] CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
[  484.660900] CR2: 0000000000000008 CR3: 000000012d7e6006 CR4: 0000000000360ef0
[  484.660900] DR0: 0000000000000000 DR1: 0000000000000000 DR2: 0000000000000000
[  484.660900] DR3: 0000000000000000 DR6: 00000000fffe0ff0 DR7: 0000000000000400
[  484.660900] Call Trace:
[  484.660900]  <IRQ>
[  484.660900]  complete+0x1d/0x50
[  484.660900]  blk_end_sync_rq+0x23/0x30
[  484.660900]  blk_mq_end_request+0xc7/0x130
[  484.660900]  nvme_complete_rq+0x6b/0x1e0 [nvme_core]
[  484.660900]  nvme_pci_complete_rq+0xa0/0xd0 [nvme]
[  484.660900]  blk_mq_complete_request+0x6c/0xf0
[  484.660900]  nvme_irq+0x196/0x26e [nvme]
[  484.660900]  ? raw_notifier_call_chain+0x16/0x20
[  484.660900]  __handle_irq_event_percpu+0x42/0x180
[  484.660900]  handle_irq_event_percpu+0x33/0x80
[  484.660900]  handle_irq_event+0x3b/0x60
[  484.848098]  handle_edge_irq+0x93/0x1c0
[  484.848098]  do_IRQ+0x55/0xf0
[  484.848098]  common_interrupt+0xf/0xf
[  484.848098]  </IRQ>
[  484.848098] RIP: 0010:native_safe_halt+0xe/0x10
[  484.848098] Code: 7b ff ff ff eb bd 90 90 90 90 90 90 e9 07 00 00 00 0f 00 2d 76 15 51 00 f4 c3 66 90 e9 07 00 00 00 0f 00 2d 66 15 51 00 fb f4 <c3> 90 0f 1f 44 00 00 55 48 89 e5 41 55 41 54 53 e8 8d 3b 62 ff 65
[  484.848098] RSP: 0018:ffffffff87003e18 EFLAGS: 00000246 ORIG_RAX: ffffffffffffffda
[  484.848098] RAX: ffffffff860f9e80 RBX: 0000000000000000 RCX: 0000000000000001
[  484.848098] RDX: 000000000004cebe RSI: 0000000000000083 RDI: 0000000000000000
[  484.848098] RBP: ffffffff87003e38 R08: 0000007c4831d077 R09: 0000000000022f80
[  484.848098] R10: 0000000000100000 R11: 0000000000000000 R12: 0000000000000000
[  484.848098] R13: ffffffff87013780 R14: 0000000000000000 R15: 0000000000000000
[  484.848098]  ? __cpuidle_text_start+0x8/0x8
[  484.848098]  ? tick_nohz_idle_stop_tick+0x13c/0x290
[  484.848098]  ? default_idle+0x20/0x140
[  484.848098]  arch_cpu_idle+0x15/0x20
[  484.848098]  default_idle_call+0x23/0x30
[  485.044058]  do_idle+0x1fb/0x270
[  485.044058]  cpu_startup_entry+0x20/0x30
[  485.044058]  rest_init+0xae/0xb0
[  485.044058]  arch_call_rest_init+0xe/0x1b
[  485.044058]  start_kernel+0x52f/0x550
[  485.044058]  x86_64_start_reservations+0x24/0x26
[  485.044058]  x86_64_start_kernel+0x8f/0x93
[  485.044058]  secondary_startup_64+0xa4/0xb0
[  485.044058] Modules linked in: dm_multipath scsi_dh_rdac scsi_dh_emc scsi_dh_alua binfmt_misc intel_rapl_msr intel_rapl_common kvm_intel kvm rapl ppdev joydev input_leds serio_raw parport_pc parport mac_hid qemu_fw_cfg sch_fq_codel ramoops ry
[  485.204063] CR2: 0000000000000008
[  485.204063] disable async PF for cpu 0
[    0.000000] Linux version 5.4.0-148-generic (buildd@lcy02-amd64-112) (gcc version 9.4.0 (Ubuntu 9.4.0-1ubuntu1~20.04.1)) #165-Ubuntu SMP Tue Apr 18 08:53:12 UTC 2023 (Ubuntu 5.4.0-148.165-generic 5.4.231)
[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-5.4.0-148-generic root=UUID=66add23f-3d34-46f1-a540-ebfdd268827e ro ip=dhcp console=ttyS0,115200 console=tty console=ttyS0 text reset_devices systemd.unit=kdump-tools-dump.service nr_cpus=1 K
[    0.000000] KERNEL supported cpus:
[    0.000000]   Intel GenuineIntel
[    0.000000]   AMD AuthenticAMD
[    0.000000]   Hygon HygonGenuine
[    0.000000]   Centaur CentaurHauls
[    0.000000]   zhaoxin   Shanghai  
[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x002: 'SSE registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x004: 'AVX registers'
[    0.000000] x86/fpu: xstate_offset[2]:  576, xstate_sizes[2]:  256
[    0.000000] x86/fpu: Enabled xstate features 0x7, context size is 832 bytes, using 'standard' format.
[    0.000000] BIOS-provided physical RAM map:
[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x0000000000000fff] reserved
[    0.000000] BIOS-e820: [mem 0x0000000000001000-0x000000000009fbff] usable
[    0.000000] BIOS-e820: [mem 0x000000000009fc00-0x000000000009ffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000000f0000-0x00000000000fffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000b3000000-0x00000000bef5cfff] usable
[    0.000000] BIOS-e820: [mem 0x00000000befffc00-0x00000000beffffff] usable
[    0.000000] BIOS-e820: [mem 0x00000000bffd5000-0x00000000bfffffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000feffc000-0x00000000feffffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000fffc0000-0x00000000ffffffff] reserved
```

刚开始想简单看一下call trace的后几个函数，猜一下原因

```c
struct wait_queue_head {
	spinlock_t		lock;
	struct list_head	head;
};
typedef struct wait_queue_head wait_queue_head_t;

struct completion {
	unsigned int done;
	wait_queue_head_t wait;
};


/**
 * blk_end_sync_rq - executes a completion event on a request
 * @rq: request to complete
 * @error: end I/O status of the request
 */
static void blk_end_sync_rq(struct request *rq, blk_status_t error)
{
	struct completion *waiting = rq->end_io_data;

	rq->end_io_data = NULL;

	/*
	 * complete last, if this is a stack request the process (and thus
	 * the rq pointer) could be invalid right after this complete()
	 */
	complete(waiting);
}

void complete(struct completion *x)
{
	unsigned long flags;

	spin_lock_irqsave(&x->wait.lock, flags);

	if (x->done != UINT_MAX)
		x->done++;
	__wake_up_locked(&x->wait, TASK_NORMAL, 1);
	spin_unlock_irqrestore(&x->wait.lock, flags);
}
```
猜某个指针变量为空，而0x8只是指针+偏移量
类似于以下程序

```c
#include <stdio.h>

struct test {
  int a;
  int* b;
};

int main() {
  struct test* p = NULL;
  printf("%p %p\n", p, &(p->b));
}

// 输出  (nil) 0x8
```
不过奇怪的是blk_mq_end_request并没有调用blk_end_sync_rq
```c
void blk_mq_end_request(struct request *rq, blk_status_t error)
{
	if (blk_update_request(rq, error, blk_rq_bytes(rq)))
		BUG();
	__blk_mq_end_request(rq, error);
}
inline void __blk_mq_end_request(struct request *rq, blk_status_t error)
{
	u64 now = 0;

	if (blk_mq_need_time_stamp(rq))
		now = ktime_get_ns();

	if (rq->rq_flags & RQF_STATS) {
		blk_mq_poll_stats_start(rq->q);
		blk_stat_add(rq, now);
	}

	if (rq->internal_tag != -1)
		blk_mq_sched_completed_request(rq, now);

	blk_account_io_done(rq, now);

	if (rq->end_io) {
		rq_qos_done(rq->q, rq);
		rq->end_io(rq, error);
	} else {
		blk_mq_free_request(rq);
	}
}
```
不知道为什么，内核崩溃并没有触发kdump。

后面想要使用qemu调试内核的方法找到问题原因，使用[内核调试工具crash使用](https://www.jiasun.top/blog/%E5%86%85%E6%A0%B8%E8%B0%83%E8%AF%95%E5%B7%A5%E5%85%B7crash%E4%BD%BF%E7%94%A8.html)中apt下载vmlinx，而后执行qemu时加上-S -s选项
参考文章：[Debugging Linux kernels with Qemu and GDB](https://www.sobyte.net/post/2022-02/debug-linux-kernel-with-qemu-and-gdb/)
打断点时一直显示Cannot insert breakpoint，后面想到是不是内核调试选项没有打开
![](https://img-blog.csdnimg.cn/e9b7178966214172b4f2cd6b8a62fc52.png)
使用make menuconfig时发现各个选项都设置好了
![](https://img-blog.csdnimg.cn/e5784712d77447b1ade73ef17a498969.png)
按?获取相应选项信息

![](https://img-blog.csdnimg.cn/e0aefc485c9946d7b96729ac062083eb.png)
![](https://img-blog.csdnimg.cn/15f43e9954d5412987a0fb2b8f464d50.png)

![](https://img-blog.csdnimg.cn/67143a0d9e374dab8dae235386cc9bb6.png)
![](https://img-blog.csdnimg.cn/4980d49e408d4f90baf3e16d52d7cb00.png)
就暂时放弃qemu调试内核方法，想要设置其他选项使得kdump正常工作



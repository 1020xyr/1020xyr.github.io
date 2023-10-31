---
title: 内核调试工具crash使用
date: 2023-05-21 17:39:40
tags: 内核 crash 内核调试
categories: 
- [踩坑日记]
- [内核驱动开发记录]
index_img: https://img-blog.csdnimg.cn/1856443a991d4238bcfe1dff757f540e.jpeg
---
<meta name="referrer" content="no-referrer" />


## 前言
在编写内核驱动的过程中，时不时就导致内核崩溃，也没啥好的调试方法，要么dmesg打印内核日志，要么搭建kgdb环境调试，但kgdb比较繁琐，dmesg有时候也不能打印内核堆栈，故调试内核纯看运气，如果是能稳定复现的bug还好调试，最怕的就是测试程序刚开始跑的好好的，突然鼠标动不了了，这个时候就知道糟了。

之前的思路是一直时快速刷新dmesg以求能看到内核崩溃时日志打印，但没有成功过。后面有一次面试的时候面试官提到了crash这一内核调试工具，看起来还挺有用，故记录一下使用过程。



环境说明：
虚拟机1：
```bash
cat /proc/version
Linux version 5.15.0-69-generic (buildd@lcy02-amd64-071) (gcc (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #76~20.04.1-Ubuntu SMP Mon Mar 20 15:54:19 UTC 2023
```

虚拟机2
```bash
cat /proc/version
Linux version 5.4.0 (root@driver-virtual-machine) (gcc version 9.4.0 (Ubuntu 9.4.0-1ubuntu1~20.04.1)) #1 SMP Fri May 19 09:19:53 CST 2023
```


## 初识
运行环境：虚拟机1
```bash
cat /proc/version
Linux version 5.15.0-69-generic (buildd@lcy02-amd64-071) (gcc (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #76~20.04.1-Ubuntu SMP Mon Mar 20 15:54:19 UTC 2023
```

相关博客：
[官方文档：Kernel crash dump](https://ubuntu.com/server/docs/kernel-crash-dump)
[ubuntu 20.04 启用kdump服务及下载vmlinux](https://blog.csdn.net/weixin_42915431/article/details/112555690#:~:text=ubuntu%2020.04%20%E5%90%AF%E7%94%A8kdump%E6%9C%8D%E5%8A%A1%E5%8F%8A%E4%B8%8B%E8%BD%BDvmlinux%201%20zyg%20@zyg:~$%20kdump-config%20show,5.4.0%20-%2060%20-generic%208%20kdump%20initrd:%20%E6%9B%B4%E5%A4%9A%E9%A1%B9%E7%9B%AE)
[crash调试内核入门-老司机带你上车](https://blog.csdn.net/py199122/article/details/120525497)
[3.3.3 内核态调测工具：kdump&crash——crash解析](https://zhuanlan.zhihu.com/p/104384020)


实际上crash的安装步骤非常简单，安装linux-crashdump后重启即可

```bash
apt install linux-crashdump # 安装linux-crashdump
reboot # 重启
# 验证
kdump-config show 
DUMP_MODE:        kdump
USE_KDUMP:        1
KDUMP_SYSCTL:     kernel.panic_on_oops=1
KDUMP_COREDIR:    /var/crash
crashkernel addr: 0xb3000000
   /var/lib/kdump/vmlinuz: symbolic link to /boot/vmlinuz-5.15.0-69-generic
kdump initrd: 
   /var/lib/kdump/initrd.img: symbolic link to /var/lib/kdump/initrd.img-5.15.0-69-generic
current state:    ready to kdump

kexec command:
  /sbin/kexec -p --command-line="BOOT_IMAGE=/boot/vmlinuz-5.15.0-69-generic root=UUID=70b5c7aa-174c-45ff-84de-ea3325883bc6 ro find_preseed=/preseed.cfg auto noprompt priority=critical locale=en_US quiet reset_devices systemd.unit=kdump-tools-dump.service nr_cpus=1 irqpoll nousb" --initrd=/var/lib/kdump/initrd.img /var/lib/kdump/vmlinuz

cat /proc/cmdline
BOOT_IMAGE=/boot/vmlinuz-5.15.0-69-generic root=UUID=70b5c7aa-174c-45ff-84de-ea3325883bc6 ro find_preseed=/preseed.cfg auto noprompt priority=critical locale=en_US quiet crashkernel=512M-:192M


dmesg | grep -i crash
[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-5.15.0-69-generic root=UUID=70b5c7aa-174c-45ff-84de-ea3325883bc6 ro find_preseed=/preseed.cfg auto noprompt priority=critical locale=en_US quiet crashkernel=512M-:192M
[    0.006128] Reserving 192MB of memory at 2864MB for crashkernel (System RAM: 8191MB)
[    0.574934] Kernel command line: BOOT_IMAGE=/boot/vmlinuz-5.15.0-69-generic root=UUID=70b5c7aa-174c-45ff-84de-ea3325883bc6 ro find_preseed=/preseed.cfg auto noprompt priority=critical locale=en_US quiet crashkernel=512M-:192M
```
安装过程只需要简单看一看官方文档即可
```bash
# 试验kdump是否有效，主动触发kernel panic
cat /proc/sys/kernel/sysrq
176
echo c > /proc/sysrq-trigger

# 自动重启后生成如下文件
root@ubuntu /boot# cd /var/crash/
root@ubuntu /v/crash# ls
202305201923/  kdump_lock  kexec_cmd  linux-image-5.15.0-69-generic-202305201923.crash
root@ubuntu /v/crash# cd 202305201923/
root@ubuntu /v/c/202305201923# ls
dmesg.202305201923  dump.202305201923

# dmesg.202305201923
[  150.144897] rfkill: input handler disabled
[  235.080620] sysrq: Trigger a crash
[  235.080633] Kernel panic - not syncing: sysrq triggered crash
[  235.080638] CPU: 3 PID: 6014 Comm: fish Kdump: loaded Not tainted 5.15.0-69-generic #76~20.04.1-Ubuntu
[  235.080645] Hardware name: VMware, Inc. VMware Virtual Platform/440BX Desktop Reference Platform, BIOS 6.00 07/22/2020
[  235.080650] Call Trace:
[  235.080655]  <TASK>
[  235.080660]  dump_stack_lvl+0x4a/0x63
[  235.080672]  dump_stack+0x10/0x16
[  235.080676]  panic+0x149/0x321
[  235.080685]  sysrq_handle_crash+0x1a/0x20
[  235.080694]  __handle_sysrq.cold+0xb4/0x18e
[  235.080702]  write_sysrq_trigger+0x28/0x40
[  235.080706]  proc_reg_write+0x6a/0xa0
[  235.080712]  vfs_write+0xb9/0x270
[  235.080718]  ksys_write+0x67/0xf0
[  235.080724]  __x64_sys_write+0x1a/0x20
[  235.080728]  do_syscall_64+0x5c/0xc0
[  235.080735]  ? do_syscall_64+0x69/0xc0
[  235.080741]  ? irqentry_exit_to_user_mode+0x9/0x20
[  235.080746]  ? irqentry_exit+0x1d/0x30
[  235.080750]  ? exc_page_fault+0x89/0x170
[  235.080754]  entry_SYSCALL_64_after_hwframe+0x61/0xcb
[  235.080761] RIP: 0033:0x7f8e32f2432f
[  235.080767] Code: 89 54 24 18 48 89 74 24 10 89 7c 24 08 e8 29 fd ff ff 48 8b 54 24 18 48 8b 74 24 10 41 89 c0 8b 7c 24 08 b8 01 00 00 00 0f 05 <48> 3d 00 f0 ff ff 77 2d 44 89 c7 48 89 44 24 08 e8 5c fd ff ff 48
[  235.080772] RSP: 002b:00007f8e22ffcda0 EFLAGS: 00000293 ORIG_RAX: 0000000000000001
[  235.080778] RAX: ffffffffffffffda RBX: 0000000000000000 RCX: 00007f8e32f2432f
[  235.080782] RDX: 0000000000000002 RSI: 0000555cf0465e58 RDI: 0000000000000009
[  235.080785] RBP: 0000000000000002 R08: 0000000000000000 R09: 000000006469809d
[  235.080788] R10: 0000000000000000 R11: 0000000000000293 R12: 0000000000000009
[  235.080791] R13: 0000555cf0465e58 R14: 0000555cf0389560 R15: 00007f8e22ffcfc0
[  235.080797]  </TASK>
```
<mark>接下来就是分析dump文件，可惜我并没有成功。</mark>

使用crash分析dump文件，还需要vmlinux文件
![](https://img-blog.csdnimg.cn/1451d41d850844d5815f6851deae2cd6.png)
[crash调试内核入门-老司机带你上车](https://blog.csdn.net/py199122/article/details/120525497)

用法类似于crash dump vmlinux
```bash
crash --help
USAGE:

  crash [OPTION]... NAMELIST MEMORY-IMAGE[@ADDRESS]     (dumpfile form)
  crash [OPTION]... [NAMELIST]                          (live system form)

OPTIONS:

  NAMELIST
    This is a pathname to an uncompressed kernel image (a vmlinux
    file), or a Xen hypervisor image (a xen-syms file) which has
    been compiled with the "-g" option.  If using the dumpfile form,
    a vmlinux file may be compressed in either gzip or bzip2 formats.

  MEMORY-IMAGE
    A kernel core dump file created by the netdump, diskdump, LKCD
    kdump, xendump or kvmdump facilities.
```

### 获取vmlinux
方法1： apt下载方法（失败）
![](https://img-blog.csdnimg.cn/105bc6f92e324da189ceebcf405eb544.png)

```bash
# lsb_release -cs即版本名，例如focal，麒麟操作系统kylin是不行的，可以考虑替换成相近的ubuntu版本名
echo "deb http://ddebs.ubuntu.com $(lsb_release -cs)-updates main restricted universe multiverse
deb http://ddebs.ubuntu.com $(lsb_release -cs)-security main restricted universe multiverse
deb http://ddebs.ubuntu.com $(lsb_release -cs)-proposed main restricted universe multiverse" | \
sudo tee -a /etc/apt/sources.list.d/ddebs.list

# 这个是解决问题public key is not available: NO_PUBKEY 3F01618A51312F3F，需加入相应的公钥
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 428D7C01

sudo apt-get update
sudo apt-get install linux-image-$(uname -r)-dbgsym

/usr/lib/debug/boot/vmlinux-$(uname -r)
```

[Ubuntu安装上的vmlinux在哪里？](https://blog.csdn.net/vic_qxz/article/details/112782709)
[Where is vmlinux on my Ubuntu installation?](https://superuser.com/questions/62575/where-is-vmlinux-on-my-ubuntu-installation)

```bash
apt-get install linux-image-$(uname -r)-dbgsym
Reading package lists... Done
Building dependency tree       
Reading state information... Done
E: Unable to locate package linux-image-5.15.0-69-generic-dbgsym
E: Couldn't find any package by glob 'linux-image-5.15.0-69-generic-dbgsym'
E: Couldn't find any package by regex 'linux-image-5.15.0-69-generic-dbgsym'
```


方法2： 下载ddeb包
![](https://img-blog.csdnimg.cn/54e13fdf374141efb49361b05c9f33b2.png)
[ubuntu 20.04 启用kdump服务及下载vmlinux](https://blog.csdn.net/weixin_42915431/article/details/112555690#:~:text=ubuntu%2020.04%20%E5%90%AF%E7%94%A8kdump%E6%9C%8D%E5%8A%A1%E5%8F%8A%E4%B8%8B%E8%BD%BDvmlinux%201%20zyg%20@zyg:~$%20kdump-config%20show,5.4.0%20-%2060%20-generic%208%20kdump%20initrd:%20%E6%9B%B4%E5%A4%9A%E9%A1%B9%E7%9B%AE)

下载网址：[http://ddebs.ubuntu.com/pool/main/l/linux/](http://ddebs.ubuntu.com/pool/main/l/linux/)
![](https://img-blog.csdnimg.cn/b30be5310b2f470fbe887d8ec6d3a93c.png)
![](https://img-blog.csdnimg.cn/9a9965f1ed48476ebe0de1780bd29b20.png)

没找到amd64架构的linux-image-5.15.0-69-generic-dbgsym，只好下了一个unsigned版本的，下个比较慢，翻墙的话快一点。

之后dpkg -i安装，得到vmlinux

```bash
root@ubuntu /u/l/d/boot# cd /usr/lib/debug/boot/
root@ubuntu /u/l/d/boot# ls -lah
-rw-r--r-- 1 root root 705M Mar 17 09:56 vmlinux-5.15.0-69-generic
```
方法3：使用源码编译内核，生成vmlinux
###  Dwarf Error: wrong version in compilation unit header (is 5, should be 2, 3, or 4)
使用crash分析dump文件
```bash
crash /usr/lib/debug/boot/vmlinux-5.15.0-69-generic dump.202305201923

crash 7.2.8
Copyright (C) 2002-2020  Red Hat, Inc.
Copyright (C) 2004, 2005, 2006, 2010  IBM Corporation
Copyright (C) 1999-2006  Hewlett-Packard Co
Copyright (C) 2005, 2006, 2011, 2012  Fujitsu Limited
Copyright (C) 2006, 2007  VA Linux Systems Japan K.K.
Copyright (C) 2005, 2011  NEC Corporation
Copyright (C) 1999, 2002, 2007  Silicon Graphics, Inc.
Copyright (C) 1999, 2000, 2001, 2002  Mission Critical Linux, Inc.
This program is free software, covered by the GNU General Public License,
and you are welcome to change it and/or distribute copies of it under
certain conditions.  Enter "help copying" to see the conditions.
This program has absolutely no warranty.  Enter "help warranty" for details.
 
GNU gdb (GDB) 7.6
Copyright (C) 2013 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.  Type "show copying"
and "show warranty" for details.
This GDB was configured as "x86_64-unknown-linux-gnu"...
gdb called without error_hook: Dwarf Error: wrong version in compilation unit header (is 5, should be 2, 3, or 4) [in module /usr/lib/debug/boot/vmlinux-5.15.0-69-generic]
Dwarf Error: wrong version in compilation unit header (is 5, should be 2, 3, or 4) [in module /usr/lib/debug/boot/vmlinux-5.15.0-69-generic]

crash: /usr/lib/debug/boot/vmlinux-5.15.0-69-generic: no debugging data available
```
crash内嵌的gdb版本过低（7.6），只支持dwarf 2 3 4版本，不支持5版本

相关博客推荐：[从Dwarf Error说开去](https://segmentfault.com/a/1190000043552134)

使用objdump查看vmlinux信息，发现确实有许多版本5的
```bash
objdump --dwarf=info /usr/lib/debug/boot/vmlinux-5.15.0-69-generic | more

/usr/lib/debug/boot/vmlinux-5.15.0-69-generic:     file format elf64-x86-64

Contents of the .debug_info section:

  Compilation Unit @ offset 0x0:
   Length:        0x1e (32-bit)
   Version:       2
   Abbrev Offset: 0x0
   Pointer Size:  8
 <0><b>: Abbrev Number: 1 (DW_TAG_compile_unit)
    <c>   DW_AT_stmt_list   : 0x0
    <10>   DW_AT_ranges      : 0x0
    <14>   DW_AT_name        : (indirect string, offset: 0x0): /build/linux-DADscI/linux-5.15.0/arch/x86/kernel/head_64.S
    <18>   DW_AT_comp_dir    : (indirect string, offset: 0x3b): /build/linux-DADscI/linux-5.15.0/debian/build/build-generic
    <1c>   DW_AT_producer    : (indirect string, offset: 0x77): GNU AS 2.38
    <20>   DW_AT_language    : 32769    (MIPS assembler)
  Compilation Unit @ offset 0x22:
   Length:        0xd225 (32-bit)
   Version:       5
   Abbrev Offset: 0x12
   Pointer Size:  8
 <0><2e>: Abbrev Number: 130 (DW_TAG_compile_unit)
    <30>   DW_AT_producer    : (indirect string, offset: 0x2e88): GNU C89 11.3.0 -mno-sse -mno-mmx -mno-sse2 -mno-3dnow -mno-avx -m64 -mno-80387 -mno-fp-ret-in-387 -mpreferred-stack-boundary=3 -mskip-rax-setup -mtune=generic -mno-red-zone -mcmodel=kernel -mindirect-branch=thunk-extern -mindirect-branc
h-register -mindirect-branch-cs-prefix -mfunction-return=thunk-extern -mharden-sls=all -mrecord-mcount -mfentry -march=x86-64 -g -gdwarf-5 -O2 -std=gnu90 -fno-strict-aliasing -fno-common -fshort-wchar -fno-PIE -fcf-protection=none -falign-jumps=1 -falign-loops=1 -fno-asynchronous-unwind-tables -fno-ju
mp-tables -fno-delete-null-pointer-checks -fno-allow-store-data-races -fstack-protector-strong -fno-omit-frame-pointer -fno-optimize-sibling-calls -fno-stack-clash-protection -fno-inline-functions-called-once -fno-strict-overflow -fstack-check=no -fconserve-stack -fno-stack-protector -fsanitize=bounds
 -fsanitize=shift -fsanitize=bool -fsanitize=enum
    <34>   DW_AT_language    : 1        (ANSI C)
    <35>   DW_AT_name        : (indirect line string, offset: 0x0): /build/linux-DADscI/linux-5.15.0/arch/x86/kernel/head64.c
    <39>   DW_AT_comp_dir    : (indirect line string, offset: 0x3a): /build/linux-DADscI/linux-5.15.0/debian/build/build-generic
    <3d>   DW_AT_ranges      : 0x2f0
    <41>   DW_AT_low_pc      : 0x0
    <49>   DW_AT_stmt_list   : 0x222
 <1><4d>: Abbrev Number: 46 (DW_TAG_base_type)
    <4e>   DW_AT_byte_size   : 8
    <4f>   DW_AT_encoding    : 7        (unsigned)
    <50>   DW_AT_name        : (indirect string, offset: 0x469a): long unsigned int
 <1><54>: Abbrev Number: 20 (DW_TAG_const_type)
```

![](https://img-blog.csdnimg.cn/8841ed6ee4a3476a9be943857e519c0b.png)
没找到这个问题的解决方法，要是能让crash不使用内嵌的gdb就好了。





## 调试
虚拟机2
```bash
cat /proc/version
Linux version 5.4.0 (root@driver-virtual-machine) (gcc version 9.4.0 (Ubuntu 9.4.0-1ubuntu1~20.04.1)) #1 SMP Fri May 19 09:19:53 CST 2023
```

虚拟机1是自带的内核，而虚拟机2是源码编译的内核，本来就有vmlinux，不需要下载。实际上就是博客[fio引发的一些问题](https://www.jiasun.top/blog/fio%E5%BC%95%E5%8F%91%E7%9A%84%E4%B8%80%E4%BA%9B%E9%97%AE%E9%A2%98.html)编译使用的虚拟机，建议先简要阅读该博客。在这个虚拟机中使用crash调试没出现虚拟机1中的Dwarf Error问题，这是因为vmlinux中没有版本5的dwarf
![](https://img-blog.csdnimg.cn/dec540fd5269494baa7e8c58e6e8be2d.png)

```bash
crash dump.202305210936 /root/kernel/linux-5.4/vmlinux

crash 7.2.8
Copyright (C) 2002-2020  Red Hat, Inc.
Copyright (C) 2004, 2005, 2006, 2010  IBM Corporation
Copyright (C) 1999-2006  Hewlett-Packard Co
Copyright (C) 2005, 2006, 2011, 2012  Fujitsu Limited
Copyright (C) 2006, 2007  VA Linux Systems Japan K.K.
Copyright (C) 2005, 2011  NEC Corporation
Copyright (C) 1999, 2002, 2007  Silicon Graphics, Inc.
Copyright (C) 1999, 2000, 2001, 2002  Mission Critical Linux, Inc.
This program is free software, covered by the GNU General Public License,
and you are welcome to change it and/or distribute copies of it under
certain conditions.  Enter "help copying" to see the conditions.
This program has absolutely no warranty.  Enter "help warranty" for details.
 
GNU gdb (GDB) 7.6
Copyright (C) 2013 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.  Type "show copying"
and "show warranty" for details.
This GDB was configured as "x86_64-unknown-linux-gnu"...

WARNING: kernel relocated [568MB]: patching 113630 gdb minimal_symbol values

      KERNEL: /root/kernel/linux-5.4/vmlinux                           
    DUMPFILE: dump.202305210936  [PARTIAL DUMP]
        CPUS: 2
        DATE: Sun May 21 09:36:17 2023
      UPTIME: 00:04:50
LOAD AVERAGE: 0.12, 0.38, 0.19
       TASKS: 646
    NODENAME: driver-virtual-machine
     RELEASE: 5.4.0
     VERSION: #1 SMP Fri May 19 09:19:53 CST 2023
     MACHINE: x86_64  (2096 Mhz)
      MEMORY: 13 GB
       PANIC: "Kernel panic - not syncing: sysrq triggered crash"
         PID: 3896
     COMMAND: "fish"
        TASK: ffff9fc59e928000  [THREAD_INFO: ffff9fc59e928000]
         CPU: 0
       STATE: TASK_RUNNING (PANIC)

crash> bt
PID: 3896   TASK: ffff9fc59e928000  CPU: 0   COMMAND: "fish"
 #0 [ffffaadb02f63c68] machine_kexec at ffffffffa486f0e3
 #1 [ffffaadb02f63cc8] __crash_kexec at ffffffffa49537d2
 #2 [ffffaadb02f63d98] panic at ffffffffa48a00c2
 #3 [ffffaadb02f63e18] sysrq_handle_crash at ffffffffa4e83605
 #4 [ffffaadb02f63e28] __handle_sysrq.cold at ffffffffa4e83f55
 #5 [ffffaadb02f63e60] write_sysrq_trigger at ffffffffa4e83e08
 #6 [ffffaadb02f63e78] proc_reg_write at ffffffffa4b69b23
 #7 [ffffaadb02f63e98] __vfs_write at ffffffffa4ad3dab
 #8 [ffffaadb02f63ea8] vfs_write at ffffffffa4ad6d79
 #9 [ffffaadb02f63ee0] ksys_write at ffffffffa4ad7037
#10 [ffffaadb02f63f20] __x64_sys_write at ffffffffa4ad70ca
#11 [ffffaadb02f63f30] do_syscall_64 at ffffffffa4804457
#12 [ffffaadb02f63f50] entry_SYSCALL_64_after_hwframe at ffffffffa540008c
    RIP: 00007f02ce7ce32f  RSP: 00007f02cd511da0  RFLAGS: 00000293
    RAX: ffffffffffffffda  RBX: 0000000000000000  RCX: 00007f02ce7ce32f
    RDX: 0000000000000002  RSI: 000055fe5daa6a68  RDI: 0000000000000009
    RBP: 0000000000000002   R8: 0000000000000000   R9: 00007f02cd511da8
    R10: 0000000000000000  R11: 0000000000000293  R12: 0000000000000009
    R13: 000055fe5daa6a68  R14: 000055fe5d988560  R15: 00007f02cd511e30
    ORIG_RAX: 0000000000000001  CS: 0033  SS: 002b
```
调试这个比较无聊，故自己制造一个bug然后调试，就像[fio引发的一些问题](https://www.jiasun.top/blog/fio%E5%BC%95%E5%8F%91%E7%9A%84%E4%B8%80%E4%BA%9B%E9%97%AE%E9%A2%98.html)博客中的一样，修改nvme驱动，在协议栈请求大小为100k时访问一个非法地址
```c
	printk(KERN_WARNING "request received: pos=%llu bytes=%u "
			    "cur_bytes=%u dir=%c\n",
	       (unsigned long long)blk_rq_pos(req), blk_rq_bytes(req),
	       blk_rq_cur_bytes(req), rq_data_dir(req) ? 'W' : 'R');

	// struct request_queue *q = req->q;
	// int r_size = blk_queue_get_max_sectors(q, REQ_OP_READ);
	// int w_size = blk_queue_get_max_sectors(q, REQ_OP_WRITE);
	// printk(KERN_WARNING "max read size:%d  max write size:%d\n", r_size,
	//        w_size);

	if (blk_rq_bytes(req) == 100 * 1024) {
		int *p = 0x12345678;
		*p = 1;
	}
```
正常情况下协议栈不会下发100k大小的请求，故不会一加载模块就崩溃，等到fio测试时将bs设为100k才触发bug
![](https://img-blog.csdnimg.cn/75ff89943e54451f98ba992a0d73b3b6.png)
![](https://img-blog.csdnimg.cn/ae77ce1ffc864e06b3d2dc1efb033db9.png)
崩溃重启后查看dmesg文件

```bash
[13187.432566] request received: pos=20970496 bytes=16384 cur_bytes=4096 dir=R
[13187.432585] request received: pos=20970536 bytes=4096 cur_bytes=4096 dir=R
[13187.432590] request received: pos=20970552 bytes=8192 cur_bytes=4096 dir=R
[13187.432596] request received: pos=20970576 bytes=16384 cur_bytes=4096 dir=R
[13187.432640] request received: pos=20970616 bytes=86016 cur_bytes=4096 dir=R
[13187.432759] request received: pos=20970792 bytes=24576 cur_bytes=4096 dir=R
[13187.432777] request received: pos=20970848 bytes=40960 cur_bytes=4096 dir=R
[13187.432802] request received: pos=20970936 bytes=36864 cur_bytes=4096 dir=R
[13187.433674] request received: pos=20971008 bytes=57344 cur_bytes=4096 dir=R
[13187.433719] request received: pos=20971128 bytes=65536 cur_bytes=4096 dir=R
[13187.433733] request received: pos=20971272 bytes=61440 cur_bytes=4096 dir=R
[13187.433741] request received: pos=20971400 bytes=28672 cur_bytes=4096 dir=R
[13187.433748] request received: pos=20971464 bytes=20480 cur_bytes=4096 dir=R
[13187.514299] request received: pos=0 bytes=102400 cur_bytes=4096 dir=W
[13187.514545] BUG: unable to handle page fault for address: 0000000012345678
[13187.514763] #PF: supervisor write access in kernel mode
[13187.514766] #PF: error_code(0x0002) - not-present page
[13187.514768] PGD 0 P4D 0 
[13187.514772] Oops: 0002 [#1] SMP NOPTI
[13187.514776] CPU: 1 PID: 7484 Comm: fio Kdump: loaded Tainted: G        W  OE     5.4.0 #1
[13187.514778] Hardware name: VMware, Inc. VMware Virtual Platform/440BX Desktop Reference Platform, BIOS 6.00 07/22/2020
[13187.514786] RIP: 0010:nvme_queue_rq.cold+0x23/0x9d [nvme]
[13187.514788] Code: c6 58 e9 d9 e4 ff ff 31 c9 41 8b 54 24 28 49 8b 74 24 30 48 c7 c7 00 3b 83 c0 e8 79 c7 ad d7 41 81 7c 24 28 00 90 01 00 75 0b <c7> 04 25 78 56 34 12 01 00 00 00 4c 89 e7 e8 18 04 eb d7 0f b6 53
[13187.514790] RSP: 0018:ffffb8efc22f7a00 EFLAGS: 00010246
[13187.514792] RAX: 0000000000000039 RBX: ffffb8efc22f7a88 RCX: 0000000000000000
[13187.514794] RDX: 0000000000000000 RSI: ffff9f8d2f0578c8 RDI: ffff9f8d2f0578c8
[13187.514795] RBP: ffffb8efc22f7a70 R08: ffff9f8d2f0578c8 R09: 0000000000000004
[13187.514796] R10: 0000000000000000 R11: 0000000000000001 R12: ffff9f8cc54c3480
[13187.514797] R13: 0000000000000000 R14: ffff9f8cc6160200 R15: ffff9f8cc6f1f000
[13187.514800] FS:  00007f19155dc880(0000) GS:ffff9f8d2f040000(0000) knlGS:0000000000000000
[13187.514801] CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
[13187.514802] CR2: 0000000012345678 CR3: 0000000306238000 CR4: 0000000000340ee0
[13187.514837] Call Trace:
[13187.514875]  __blk_mq_try_issue_directly+0x116/0x1c0
[13187.514879]  blk_mq_request_issue_directly+0x4b/0xe0
[13187.514882]  blk_mq_try_issue_list_directly+0x46/0xb0
[13187.514884]  blk_mq_sched_insert_requests+0xae/0x100
[13187.514887]  blk_mq_flush_plug_list+0x1e8/0x290
[13187.514890]  blk_flush_plug_list+0xe3/0x110
[13187.514893]  blk_finish_plug+0x26/0x34
[13187.514896]  blkdev_write_iter+0xbd/0x140
[13187.514902]  aio_write+0xec/0x1a0
[13187.514907]  ? do_user_addr_fault+0x216/0x450
[13187.514912]  ? _cond_resched+0x19/0x30
[13187.514914]  ? io_submit_one+0x7b/0xb50
[13187.514916]  io_submit_one+0x449/0xb50
[13187.514945]  ? page_fault+0x34/0x40
[13187.514950]  __x64_sys_io_submit+0x90/0x180
[13187.514952]  ? __x64_sys_io_submit+0x90/0x180
[13187.514956]  do_syscall_64+0x57/0x190
[13187.514959]  entry_SYSCALL_64_after_hwframe+0x44/0xa9
[13187.514961] RIP: 0033:0x7f191ee1e73d
[13187.514964] Code: 00 c3 66 2e 0f 1f 84 00 00 00 00 00 90 f3 0f 1e fa 48 89 f8 48 89 f7 48 89 d6 48 89 ca 4d 89 c2 4d 89 c8 4c 8b 4c 24 08 0f 05 <48> 3d 01 f0 ff ff 73 01 c3 48 8b 0d 23 37 0d 00 f7 d8 64 89 01 48
[13187.514965] RSP: 002b:00007ffe2b7385f8 EFLAGS: 00000246 ORIG_RAX: 00000000000000d1
[13187.514967] RAX: ffffffffffffffda RBX: 00007f19155da888 RCX: 00007f191ee1e73d
[13187.514968] RDX: 0000556aeda578f0 RSI: 0000000000000001 RDI: 00007f19155bc000
[13187.514970] RBP: 00007f19155bc000 R08: 0000000000000000 R09: 0000000000000000
[13187.514971] R10: 0000556aeda520b8 R11: 0000000000000246 R12: 0000000000000001
[13187.514972] R13: 0000000000000000 R14: 0000556aeda578f0 R15: 0000556aeda57870
[13187.514974] Modules linked in: nvme(OE) nvme_core(OE) nls_utf8 isofs xt_conntrack xt_MASQUERADE nf_conntrack_netlink nfnetlink xfrm_user xfrm_algo xt_addrtype iptable_filter iptable_nat nf_nat nf_conntrack nf_defrag_ipv6 nf_defrag_ipv4 libcrc32c bpfilter br_netfilter bridge stp llc overlay vmw_vsock_vmci_transport vsock nls_iso8859_1 crct10dif_pclmul ghash_clmulni_intel snd_ens1371 aesni_intel snd_ac97_codec crypto_simd cryptd gameport glue_helper ac97_bus snd_pcm snd_seq_midi snd_seq_midi_event snd_rawmidi vmw_balloon snd_seq input_leds joydev binfmt_misc serio_raw snd_seq_device snd_timer snd vmw_vmci soundcore mac_hid sch_fq_codel vmwgfx ttm drm_kms_helper drm fb_sys_fops syscopyarea sysfillrect sysimgblt msr parport_pc ppdev lp ramoops parport reed_solomon efi_pstore ip_tables x_tables autofs4 hid_generic usbhid hid psmouse crc32_pclmul ahci libahci e1000 mptspi mptscsih mptbase scsi_transport_spi i2c_piix4 pata_acpi [last unloaded: nvme_core]
[13187.515025] CR2: 0000000012345678
```
**关键行**
```bash
[13187.514299] request received: pos=0 bytes=102400 cur_bytes=4096 dir=W
[13187.514545] BUG: unable to handle page fault for address: 0000000012345678
[13187.514786] RIP: 0010:nvme_queue_rq.cold+0x23/0x9d [nvme]
```
从dmesg中就能看出nvme_queue_rq函数中访问了非法地址，实际上已经可以找到原因了

分析一下dump文件

```c
crash dump.202305212232  /root/kernel/linux-5.4/vmlinux 

crash 7.2.8
Copyright (C) 2002-2020  Red Hat, Inc.
Copyright (C) 2004, 2005, 2006, 2010  IBM Corporation
Copyright (C) 1999-2006  Hewlett-Packard Co
Copyright (C) 2005, 2006, 2011, 2012  Fujitsu Limited
Copyright (C) 2006, 2007  VA Linux Systems Japan K.K.
Copyright (C) 2005, 2011  NEC Corporation
Copyright (C) 1999, 2002, 2007  Silicon Graphics, Inc.
Copyright (C) 1999, 2000, 2001, 2002  Mission Critical Linux, Inc.
This program is free software, covered by the GNU General Public License,
and you are welcome to change it and/or distribute copies of it under
certain conditions.  Enter "help copying" to see the conditions.
This program has absolutely no warranty.  Enter "help warranty" for details.
 
GNU gdb (GDB) 7.6
Copyright (C) 2013 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.  Type "show copying"
and "show warranty" for details.
This GDB was configured as "x86_64-unknown-linux-gnu"...

WARNING: kernel relocated [370MB]: patching 113630 gdb minimal_symbol values

      KERNEL: /root/kernel/linux-5.4/vmlinux                           
    DUMPFILE: dump.202305212232  [PARTIAL DUMP]
        CPUS: 2
        DATE: Sun May 21 22:31:43 2023
      UPTIME: 00:58:41
LOAD AVERAGE: 0.46, 0.33, 0.14
       TASKS: 624
    NODENAME: driver-virtual-machine
     RELEASE: 5.4.0
     VERSION: #1 SMP Fri May 19 09:19:53 CST 2023
     MACHINE: x86_64  (2096 Mhz)
      MEMORY: 13 GB
       PANIC: "Oops: 0002 [#1] SMP NOPTI" (check log for details)
         PID: 7484
     COMMAND: "fio"
        TASK: ffff9f8d13cfdd00  [THREAD_INFO: ffff9f8d13cfdd00]
         CPU: 1
       STATE: TASK_RUNNING (PANIC)

crash> bt
PID: 7484   TASK: ffff9f8d13cfdd00  CPU: 1   COMMAND: "fio"
 #0 [ffffb8efc22f7658] machine_kexec at ffffffff9826f0e3
 #1 [ffffb8efc22f76b8] __crash_kexec at ffffffff983537d2
 #2 [ffffb8efc22f7788] crash_kexec at ffffffff98354559
 #3 [ffffb8efc22f77a0] oops_end at ffffffff98234db9
 #4 [ffffb8efc22f77c8] no_context at ffffffff9827f02e
 #5 [ffffb8efc22f7838] __bad_area_nosemaphore at ffffffff9827f240
 #6 [ffffb8efc22f7880] bad_area_nosemaphore at ffffffff9827f3a6
 #7 [ffffb8efc22f7890] do_user_addr_fault at ffffffff9827f8c7
 #8 [ffffb8efc22f78f8] __do_page_fault at ffffffff9827fde8
 #9 [ffffb8efc22f7920] do_page_fault at ffffffff9827fe4c
#10 [ffffb8efc22f7950] page_fault at ffffffff98e01284
    [exception RIP: nvme_queue_rq.cold+35]
    RIP: ffffffffc0832cf5  RSP: ffffb8efc22f7a00  RFLAGS: 00010246
    RAX: 0000000000000039  RBX: ffffb8efc22f7a88  RCX: 0000000000000000
    RDX: 0000000000000000  RSI: ffff9f8d2f0578c8  RDI: ffff9f8d2f0578c8
    RBP: ffffb8efc22f7a70   R8: ffff9f8d2f0578c8   R9: 0000000000000004
    R10: 0000000000000000  R11: 0000000000000001  R12: ffff9f8cc54c3480
    R13: 0000000000000000  R14: ffff9f8cc6160200  R15: ffff9f8cc6f1f000
    ORIG_RAX: ffffffffffffffff  CS: 0010  SS: 0018
#11 [ffffb8efc22f7a78] __blk_mq_try_issue_directly at ffffffff986e5c36
#12 [ffffb8efc22f7ad0] blk_mq_request_issue_directly at ffffffff986e68bb
#13 [ffffb8efc22f7b18] blk_mq_try_issue_list_directly at ffffffff986e6996
#14 [ffffb8efc22f7b40] blk_mq_sched_insert_requests at ffffffff986eb04e
#15 [ffffb8efc22f7b80] blk_mq_flush_plug_list at ffffffff986e67c8
#16 [ffffb8efc22f7c08] blk_flush_plug_list at ffffffff986db843
#17 [ffffb8efc22f7c60] blk_finish_plug at ffffffff986db896
#18 [ffffb8efc22f7c78] blkdev_write_iter at ffffffff9851e8dd
#19 [ffffb8efc22f7cd8] aio_write at ffffffff9853430c
#20 [ffffb8efc22f7de8] io_submit_one at ffffffff98536b69
#21 [ffffb8efc22f7ea8] __x64_sys_io_submit at ffffffff985375c0
#22 [ffffb8efc22f7f30] do_syscall_64 at ffffffff98204457
#23 [ffffb8efc22f7f50] entry_SYSCALL_64_after_hwframe at ffffffff98e0008c
    RIP: 00007f191ee1e73d  RSP: 00007ffe2b7385f8  RFLAGS: 00000246
    RAX: ffffffffffffffda  RBX: 00007f19155da888  RCX: 00007f191ee1e73d
    RDX: 0000556aeda578f0  RSI: 0000000000000001  RDI: 00007f19155bc000
    RBP: 00007f19155bc000   R8: 0000000000000000   R9: 0000000000000000
    R10: 0000556aeda520b8  R11: 0000000000000246  R12: 0000000000000001
    R13: 0000000000000000  R14: 0000556aeda578f0  R15: 0000556aeda57870
    ORIG_RAX: 00000000000000d1  CS: 0033  SS: 002b
crash> dis -rl ffffffffc0832cf5
0xffffffffc0832cd2 <nvme_queue_rq.cold>:        xor    %ecx,%ecx
0xffffffffc0832cd4 <nvme_queue_rq.cold+2>:      mov    0x28(%r12),%edx
0xffffffffc0832cd9 <nvme_queue_rq.cold+7>:      mov    0x30(%r12),%rsi
0xffffffffc0832cde <nvme_queue_rq.cold+12>:     mov    $0xffffffffc0833b00,%rdi
0xffffffffc0832ce5 <nvme_queue_rq.cold+19>:     callq  0xffffffff9830f463 <printk>
0xffffffffc0832cea <nvme_queue_rq.cold+24>:     cmpl   $0x19000,0x28(%r12)
0xffffffffc0832cf3 <nvme_queue_rq.cold+33>:     jne    0xffffffffc0832d00 <nvme_queue_rq.cold+46>
0xffffffffc0832cf5 <nvme_queue_rq.cold+35>:     movl   $0x1,0x12345678
```

最后几行汇编实际上就是加的几行代码，0x19000就是102400
```c
printk(KERN_WARNING "request received: pos=%llu bytes=%u "
		    "cur_bytes=%u dir=%c\n",
       (unsigned long long)blk_rq_pos(req), blk_rq_bytes(req),
       blk_rq_cur_bytes(req), rq_data_dir(req) ? 'W' : 'R');
if (blk_rq_bytes(req) == 100 * 1024) {
	int *p = 0x12345678;
	*p = 1;
}
```
[3.3.3 内核态调测工具：kdump&crash——crash解析](https://zhuanlan.zhihu.com/p/104384020)

其他命令输出：

```bash
crash> sys
      KERNEL: /root/kernel/linux-5.4/vmlinux
    DUMPFILE: dump.202305212232  [PARTIAL DUMP]
        CPUS: 2
        DATE: Sun May 21 22:31:43 2023
      UPTIME: 00:58:41
LOAD AVERAGE: 0.46, 0.33, 0.14
       TASKS: 624
    NODENAME: driver-virtual-machine
     RELEASE: 5.4.0
     VERSION: #1 SMP Fri May 19 09:19:53 CST 2023
     MACHINE: x86_64  (2096 Mhz)
      MEMORY: 13 GB
       PANIC: "Oops: 0002 [#1] SMP NOPTI" (check log for details)
crash>  kmem -i
                 PAGES        TOTAL      PERCENTAGE
    TOTAL MEM  3261021      12.4 GB         ----
         FREE  1550354       5.9 GB   47% of TOTAL MEM
         USED  1710667       6.5 GB   52% of TOTAL MEM
       SHARED   292849       1.1 GB    8% of TOTAL MEM
      BUFFERS    53004       207 MB    1% of TOTAL MEM
       CACHED  1061265         4 GB   32% of TOTAL MEM
         SLAB   116270     454.2 MB    3% of TOTAL MEM

   TOTAL HUGE        0            0         ----
    HUGE FREE        0            0    0% of TOTAL HUGE

   TOTAL SWAP   236354     923.3 MB         ----
    SWAP USED        0            0    0% of TOTAL SWAP
    SWAP FREE   236354     923.3 MB  100% of TOTAL SWAP

 COMMIT LIMIT  1866864       7.1 GB         ----
    COMMITTED  1340565       5.1 GB   71% of TOTAL LIMIT
# l不知道为什么没有显示源代码
crash> l *0xffffffffc0832cf5
crash> l *0x00007f191ee1e73d

crash> help

*              extend         log            rd             task           
alias          files          mach           repeat         timer          
ascii          foreach        mod            runq           tree           
bpf            fuser          mount          search         union          
bt             gdb            net            set            vm             
btop           help           p              sig            vtop           
dev            ipcs           ps             struct         waitq          
dis            irq            pte            swap           whatis         
eval           kmem           ptob           sym            wr             
exit           list           ptov           sys            q              

crash version: 7.2.8    gdb version: 7.6
For help on any command above, enter "help <command>".
For help on input options, enter "help input".
For help on output options, enter "help output".

crash> help dis

NAME
  dis - disassemble

SYNOPSIS
  dis [-rfludxs][-b [num]] [address | symbol | (expression)] [count]

DESCRIPTION
  This command disassembles source code instructions starting (or ending) at
  a text address that may be expressed by value, symbol or expression:

            -r  (reverse) displays all instructions from the start of the 
                routine up to and including the designated address.
            -f  (forward) displays all instructions from the given address 
                to the end of the routine.
            -l  displays source code line number data in addition to the 
                disassembly output.
            -u  address is a user virtual address in the current context;
                otherwise the address is assumed to be a kernel virtual address.
                If this option is used, then -r and -l are ignored.
            -x  override default output format with hexadecimal format.
            -d  override default output format with decimal format.
            -s  displays the filename and line number of the source code that
                is associated with the specified text location, followed by a
                source code listing if it is available on the host machine.
                The line associated with the text location will be marked with
                an asterisk; depending upon gdb's internal "listsize" variable,
                several lines will precede the marked location. If a "count"
                argument is entered, it specifies the number of source code
                lines to be displayed after the marked location; otherwise
                the remaining source code of the containing function will be
                displayed.
      -b [num]  modify the pre-calculated number of encoded bytes to skip after
                a kernel BUG ("ud2a") instruction; with no argument, displays
                the current number of bytes being skipped. (x86 and x86_64 only)
       address  starting hexadecimal text address.
        symbol  symbol of starting text address.  On ppc64, the symbol
                preceded by '.' is used.
  (expression)  expression evaluating to a starting text address.
         count  the number of instructions to be disassembled (default is 1).
                If no count argument is entered, and the starting address
                is entered as a text symbol, then the whole routine will be
                disassembled.  The count argument is supported when used with
                the -r and -f options.
```
先不研究其他命令，够用就行，本次调试到此结束！
## 其他
![](https://img-blog.csdnimg.cn/8df9eed354574f529da2e4102616131c.png)

[Linux内核映像vmlinux、Image、zImage、uImage区别](https://zhuanlan.zhihu.com/p/466226177)

```bash
grep -C 5 foo file 显示file文件里匹配foo字串那行以及上下5行
grep -B 5 foo file 显示foo及前5行
grep -A 5 foo file 显示foo及后5行
```

linux image中的signed与unsigned，之前一直以为是有符号与无符号，觉得很奇怪，后面才知道是签名与未签名
[我应该安装未签名的二进制文件吗？](https://www.reddit.com/r/debian/comments/af50ux/should_i_install_an_unsigned_binary/)


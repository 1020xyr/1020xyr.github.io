---
title: spdk环境搭建
date: 2023-04-16 21:24:55
tags: spdk
categories: zns ssd-femu-nvme-spdk-dpdk
index_img: https://img-blog.csdnimg.cn/7de079aaeb804a6baec56ce7f5d0054d.jpeg
---
<meta name="referrer" content="no-referrer" />


本来21年就写了这篇博客，但因为在博客中放了vmware的密钥，违规了，最近正好又要用到spdk，就重新搭建一下spdk，简单改一下博客再发一遍


# 运行环境
VMware16+Ubuntu21.04
Ubuntu下载地址：[https://repo.huaweicloud.com/ubuntu-releases/](https://repo.huaweicloud.com/ubuntu-releases/)
<mark>安装后记得换源</mark>
# 源码拉取

```bash
官网给出的命令如下
git clone https://github.com/spdk/spdk
cd spdk
git submodule update --init
```
这一次我没有遇到下载速度慢的问题,，直接运行以上命令就成功了

**下载速度慢的可能解决方案**
可以将https改成git，或者在com后加入.cnpmjs.org后缀。
```bash
git clone git://github.com/spdk/spdk
git clone https://github.com.cnpmjs.org/spdk/spdk
```
git clone命令完成后，修改spdk文件夹中的.gitmodules文件
```bash
[submodule "dpdk"]
	path = dpdk
	url = https://github.com.cnpmjs.org/spdk/dpdk.git
[submodule "intel-ipsec-mb"]
	path = intel-ipsec-mb
	url = https://github.com.cnpmjs.org/spdk/intel-ipsec-mb.git
[submodule "isa-l"]
	path = isa-l
	url = https://github.com.cnpmjs.org/spdk/isa-l.git
[submodule "ocf"]
	path = ocf
	url = https://github.com.cnpmjs.org/Open-CAS/ocf.git
[submodule "libvfio-user"]
	path = libvfio-user
	url = https://github.com.cnpmjs.org/nutanix/libvfio-user.git
```
最后再执行
```bash
cd spdk
git submodule update --init
```
[彻底解决git clone以及 recursive慢的问题](https://blog.csdn.net/m0_37604813/article/details/107130881)

git相关策略
 1. 关闭电脑代理，重置git代理
```bash
git config --global --unset http.proxy 
git config --global --unset https.proxy
```
 2. 修改hosts文件，添加github与ip地址映射 [https://github.com/521xueweihan/GitHub520](https://github.com/521xueweihan/GitHub520)
 3. 重启网络或主机

不过最后还是重启比较有效，git主打一个运气
# 编译

```bash
sudo ./scripts/pkgdep.sh  #安装依赖
sudo ./configure
make
./test/unit/unittest.sh   # 中途报错无所谓，脚本末尾的最后一条消息表示成功或失败。
```
![](https://img-blog.csdnimg.cn/30ab091c8a7a4b4395c85d4a2fc07103.png)

# 增加虚拟盘，运行样例
在运行SPDK应用程序之前，必须分配一些大页面，并且必须从本机内核驱动程序中取消绑定任何NVMe和I / OAT设备。SPDK包含一个脚本，可以在Linux和FreeBSD上自动执行此过程。该脚本应该以root身份运行。它只需要在系统上运行一次。
<mark>在VMware上增加一个未格式化NVMe硬盘</mark>
![](https://img-blog.csdnimg.cn/889f25d17774458c9643fca2d782c603.png)
注意要是新的硬盘设备（x:0）
<mark>不需要任何分区，挂载，格式化操作，裸盘即可</mark>
添加完之后用lsblk命令查看是否添加成功（nvme1n1）
![](https://img-blog.csdnimg.cn/ffa61388ebeb4b9ea0c9acebc3354748.png)
而后运行
```bash
sudo scripts/setup.sh  #绑定空白盘
sudo build/example/hello_world #运行测试用例
```
问题： No valid drivers found [vfio-pci, uio_pci_generic, igb_uio]. Please enable one of the kernel modules.

由于虚拟机切换过内核，有些模块没装，故装一下extra-module
![](https://img-blog.csdnimg.cn/fe8197c58def46e0844e2a913c51bf3c.png)
[docker ubuntu镜像中 缺少uio驱动和uio_pci_generic驱动的问题](https://www.cnblogs.com/correct/p/16572783.html)

绑定与解绑操作，HUGEMEM默认是2G
```c
root@driver-virtual-machine ~/s/s/scripts (master)# ./setup.sh 
0000:03:00.0 (15ad 07f0): Active devices: mount@nvme0n1:nvme0n1p1, so not binding PCI dev
0000:13:00.0 (15ad 07f0): nvme -> uio_pci_generic
0000:0b:00.0 (15ad 07f0): nvme -> uio_pci_generic

root@driver-virtual-machine ~/s/s/scripts (master)# 
root@driver-virtual-machine ~/s/s/scripts (master)# lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
loop0         7:0    0  63.3M  1 loop /snap/core20/1828
loop1         7:1    0     4K  1 loop /snap/bare/5
loop2         7:2    0  63.3M  1 loop /snap/core20/1852
loop3         7:3    0 346.3M  1 loop /snap/gnome-3-38-2004/119
loop4         7:4    0  65.2M  1 loop /snap/gtk-common-themes/1519
loop5         7:5    0  49.9M  1 loop /snap/snapd/18357
loop6         7:6    0  54.2M  1 loop /snap/snap-store/558
loop7         7:7    0  91.7M  1 loop /snap/gtk-common-themes/1535
loop8         7:8    0 349.7M  1 loop /snap/gnome-3-38-2004/137
loop9         7:9    0  49.9M  1 loop /snap/snapd/18596
loop10        7:10   0    46M  1 loop /snap/snap-store/638
sda           8:0    0    20G  0 disk 
├─sda1        8:1    0   512M  0 part /boot/efi
├─sda2        8:2    0     1K  0 part 
└─sda5        8:5    0  19.5G  0 part /
sr0          11:0    1   3.2G  0 rom  /media/driver/Ubuntu 20.04.4 LTS amd64
nvme0n1     259:1    0    10G  0 disk 
└─nvme0n1p1 259:2    0    10G  0 part /home/driver/Desktop/nvme_disk
root@driver-virtual-machine ~/s/s/scripts (master)# ./setup.sh reset
0000:03:00.0 (15ad 07f0): Active devices: mount@nvme0n1:nvme0n1p1, so not binding PCI dev
0000:13:00.0 (15ad 07f0): uio_pci_generic -> nvme
0000:0b:00.0 (15ad 07f0): uio_pci_generic -> nvme
root@driver-virtual-machine ~/s/s/scripts (master)# lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
loop0         7:0    0  63.3M  1 loop /snap/core20/1828
loop1         7:1    0     4K  1 loop /snap/bare/5
loop2         7:2    0  63.3M  1 loop /snap/core20/1852
loop3         7:3    0 346.3M  1 loop /snap/gnome-3-38-2004/119
loop4         7:4    0  65.2M  1 loop /snap/gtk-common-themes/1519
loop5         7:5    0  49.9M  1 loop /snap/snapd/18357
loop6         7:6    0  54.2M  1 loop /snap/snap-store/558
loop7         7:7    0  91.7M  1 loop /snap/gtk-common-themes/1535
loop8         7:8    0 349.7M  1 loop /snap/gnome-3-38-2004/137
loop9         7:9    0  49.9M  1 loop /snap/snapd/18596
loop10        7:10   0    46M  1 loop /snap/snap-store/638
sda           8:0    0    20G  0 disk 
├─sda1        8:1    0   512M  0 part /boot/efi
├─sda2        8:2    0     1K  0 part 
└─sda5        8:5    0  19.5G  0 part /
sr0          11:0    1   3.2G  0 rom  /media/driver/Ubuntu 20.04.4 LTS amd64
nvme2n1     259:0    0    10G  0 disk 
nvme0n1     259:1    0    10G  0 disk 
└─nvme0n1p1 259:2    0    10G  0 part /home/driver/Desktop/nvme_disk
```

```bash
root@driver-virtual-machine ~/s/s/b/examples (master)# ./hello_world 
TELEMETRY: No legacy callbacks, legacy socket not created
Initializing NVMe Controllers
Attaching to 0000:0b:00.0
Attaching to 0000:13:00.0
Attached to 0000:13:00.0
Attached to 0000:0b:00.0
  Namespace ID: 1 size: 10GB
Initialization complete.
INFO: using host memory buffer for IO
Hello world!
```

# hello world代码简要解析
建议先简要阅读[spdk官方文档中文版](https://www.cnblogs.com/whl320124/p/11398951.html)，转换成pdf更好读一点

为了看更多的输出，使能debug模式
```c
./configure --enable-debug
make
./hello_world -L all
```

```bash
root@driver-virtual-machine ~/s/s/b/examples (master)# ./hello_world -L all
[2023-04-17 19:10:08.463509] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-04-17 19:10:08.463623] [ DPDK EAL parameters: hello_world --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid63726 ]
TELEMETRY: No legacy callbacks, legacy socket not created
Initializing NVMe Controllers
Attaching to 0000:0b:00.0
[2023-04-17 19:10:08.629585] nvme_quirks.c: 112:nvme_get_quirks: *DEBUG*: Searching for 15ad:07f0 [15ad:07f0]...
[2023-04-17 19:10:08.629646] nvme_quirks.c: 118:nvme_get_quirks: *DEBUG*: Matched quirk 15ad:07f0 [ffff:ffff]:
[2023-04-17 19:10:08.630485] nvme_ctrlr.c:1462:_nvme_ctrlr_set_state: *DEBUG*: [0000:0b:00.0] setting state to delay init (no timeout)
[2023-04-17 19:10:08.631263] nvme_pcie_common.c: 132:nvme_pcie_qpair_construct: *INFO*: max_completions_cap = 64 num_trackers = 192
Attaching to 0000:13:00.0
...
...
Hello world!
[2023-04-17 19:10:08.654325] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: DELETE IO SQ (00) qid:0 cid:186 nsid:0 cdw10:00000001 cdw11:00000000 
[2023-04-17 19:10:08.654340] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:186 cdw0:0 sqhd:000b p:1 m:0 dnr:0
[2023-04-17 19:10:08.654360] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: DELETE IO CQ (04) qid:0 cid:186 nsid:0 cdw10:00000001 cdw11:00000000 
[2023-04-17 19:10:08.654450] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:186 cdw0:0 sqhd:000c p:1 m:0 dnr:0
[2023-04-17 19:10:08.654903] nvme_ctrlr.c:4168:nvme_ctrlr_destruct_async: *DEBUG*: [0000:13:00.0] Prepare to destruct SSD
[2023-04-17 19:10:08.654975] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:190 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.654985] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:189 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.654992] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:188 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.654999] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:187 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.655018] nvme_ctrlr.c:4168:nvme_ctrlr_destruct_async: *DEBUG*: [0000:0b:00.0] Prepare to destruct SSD
[2023-04-17 19:10:08.655026] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:190 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.655033] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:189 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.655040] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:188 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.655046] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: ABORTED - SQ DELETION (00/08) qid:0 cid:187 cdw0:0 sqhd:0000 p:0 m:0 dnr:0
[2023-04-17 19:10:08.655060] nvme_ctrlr.c:1063:nvme_ctrlr_shutdown_set_cc_done: *DEBUG*: [0000:0b:00.0] RTD3E = 0 us
[2023-04-17 19:10:08.655067] nvme_ctrlr.c:1066:nvme_ctrlr_shutdown_set_cc_done: *DEBUG*: [0000:0b:00.0] shutdown timeout = 10000 ms
[2023-04-17 19:10:08.655074] nvme_ctrlr.c:1063:nvme_ctrlr_shutdown_set_cc_done: *DEBUG*: [0000:13:00.0] RTD3E = 0 us
[2023-04-17 19:10:08.655080] nvme_ctrlr.c:1066:nvme_ctrlr_shutdown_set_cc_done: *DEBUG*: [0000:13:00.0] shutdown timeout = 10000 ms
[2023-04-17 19:10:08.655091] nvme_ctrlr.c:1178:nvme_ctrlr_shutdown_poll_async: *DEBUG*: [0000:13:00.0] shutdown complete in 0 milliseconds
[2023-04-17 19:10:08.656340] nvme_ctrlr.c:1178:nvme_ctrlr_shutdown_poll_async: *DEBUG*: [0000:0b:00.0] shutdown complete in 1 milliseconds
```


看这个debug输出可以知道，spdk的初始化非常复杂，所以我只是简单分析以下打印的过程，也就是hello_world函数
```bash
Initialization complete.
[2023-04-17 19:10:08.653348] nvme_pcie_common.c: 132:nvme_pcie_qpair_construct: *INFO*: max_completions_cap = 64 num_trackers = 192
[2023-04-17 19:10:08.653460] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: CREATE IO CQ (05) qid:0 cid:191 nsid:0 cdw10:00ff0001 cdw11:00000001 PRP1 0x230e15000 PRP2 0x0
[2023-04-17 19:10:08.653475] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:191 cdw0:0 sqhd:0009 p:1 m:0 dnr:0
[2023-04-17 19:10:08.653493] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: CREATE IO SQ (01) qid:0 cid:186 nsid:0 cdw10:00ff0001 cdw11:00010001 PRP1 0x230e10000 PRP2 0x0
[2023-04-17 19:10:08.653504] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:186 cdw0:0 sqhd:000a p:1 m:0 dnr:0
[2023-04-17 19:10:08.653515] nvme_pcie.c: 435:nvme_pcie_ctrlr_map_io_cmb: *DEBUG*: CMB not available
INFO: using host memory buffer for IO
[2023-04-17 19:10:08.653530] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200000219000 len:512
[2023-04-17 19:10:08.653536] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x230e19000
[2023-04-17 19:10:08.653553] nvme_qpair.c: 243:nvme_io_qpair_print_command: *NOTICE*: WRITE sqid:1 cid:191 nsid:1 lba:0 len:1 PRP1 0x230e19000 PRP2 0x0
[2023-04-17 19:10:08.654189] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:1 cid:191 cdw0:0 sqhd:0001 p:1 m:0 dnr:0
[2023-04-17 19:10:08.654217] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200000219000 len:512
[2023-04-17 19:10:08.654226] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x230e19000
[2023-04-17 19:10:08.654245] nvme_qpair.c: 243:nvme_io_qpair_print_command: *NOTICE*: READ sqid:1 cid:190 nsid:1 lba:0 len:1 PRP1 0x230e19000 PRP2 0x0
[2023-04-17 19:10:08.654298] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:1 cid:190 cdw0:0 sqhd:0002 p:1 m:0 dnr:0
Hello world!
```
我的相关文章：[NVMe驱动 请求路径学习记录](https://www.jiasun.top/blog/NVMe%E9%A9%B1%E5%8A%A8%20%E8%AF%B7%E6%B1%82%E8%B7%AF%E5%BE%84%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BD%95.html)
<font size=5>各个函数中省略了大部分代码，可使用gdb自行查看函数调用关系</font>
## 申请队列空间
```c
[2023-04-17 19:10:08.653348] nvme_pcie_common.c: 132:nvme_pcie_qpair_construct: *INFO*: max_completions_cap = 64 num_trackers = 192
```

```c
(gdb) bt
#0  nvme_pcie_qpair_construct (qpair=0x2000002dbce0, opts=0x7fffffffde70) at nvme_pcie_common.c:101
#1  0x00005555555870b9 in nvme_pcie_ctrlr_create_io_qpair (ctrlr=0x2000003d60c0, qid=1, opts=0x7fffffffde70) at nvme_pcie_common.c:1068
#2  0x0000555555593570 in nvme_transport_ctrlr_create_io_qpair (ctrlr=0x2000003d60c0, qid=1, opts=0x7fffffffde70) at nvme_transport.c:422
#3  0x0000555555570662 in nvme_ctrlr_create_io_qpair (ctrlr=0x2000003d60c0, opts=0x7fffffffde70) at nvme_ctrlr.c:396
#4  0x0000555555570a06 in spdk_nvme_ctrlr_alloc_io_qpair (ctrlr=0x2000003d60c0, user_opts=0x0, opts_size=0) at nvme_ctrlr.c:487
#5  0x00005555555650ff in hello_world () at hello_world.c:175
#6  0x00005555555659e4 in main (argc=3, argv=0x7fffffffe0a8) at hello_world.c:463
```

```c
int nvme_pcie_qpair_construct(struct spdk_nvme_qpair *qpair, const struct spdk_nvme_io_qpair_opts *opts) {
  // 申请SQ空间，设置SQ总线地址
  queue_len = pqpair->num_entries * sizeof(struct spdk_nvme_cmd);
  queue_align = spdk_max(spdk_align32pow2(queue_len), page_align);
  pqpair->cmd = spdk_zmalloc(queue_len, queue_align, NULL, SPDK_ENV_SOCKET_ID_ANY, flags);
  pqpair->cmd_bus_addr = nvme_pcie_vtophys(ctrlr, pqpair->cmd, NULL);
  // 申请CQ空间，设置CQ总线地址
  queue_len = pqpair->num_entries * sizeof(struct spdk_nvme_cpl);
  queue_align = spdk_max(spdk_align32pow2(queue_len), page_align);
  pqpair->cpl = spdk_zmalloc(queue_len, queue_align, NULL, SPDK_ENV_SOCKET_ID_ANY, flags);
  pqpair->cpl_bus_addr = nvme_pcie_vtophys(ctrlr, pqpair->cpl, NULL);
  // 设置SQ/CQ DB寄存器地址
  pqpair->sq_tdbl = pctrlr->doorbell_base + (2 * qpair->id + 0) * pctrlr->doorbell_stride_u32;
  pqpair->cq_hdbl = pctrlr->doorbell_base + (2 * qpair->id + 1) * pctrlr->doorbell_stride_u32;
}
```
## 发送admin 命令，创建SQ/CQ
```c
[2023-04-17 19:10:08.653460] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: CREATE IO CQ (05) qid:0 cid:191 nsid:0 cdw10:00ff0001 cdw11:00000001 PRP1 0x230e15000 PRP2 0x0
[2023-04-17 19:10:08.653475] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:191 cdw0:0 sqhd:0009 p:1 m:0 dnr:0
[2023-04-17 19:10:08.653493] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: CREATE IO SQ (01) qid:0 cid:186 nsid:0 cdw10:00ff0001 cdw11:00010001 PRP1 0x230e10000 PRP2 0x0
[2023-04-17 19:10:08.653504] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:186 cdw0:0 sqhd:000a p:1 m:0 dnr:0
```

```c
(gdb) bt
#0  nvme_pcie_ctrlr_cmd_create_io_cq (ctrlr=0x7ffff7959b95 <__libc_calloc+133>, io_que=0x0, cb_fn=0x0, cb_arg=0x555555ab3410) at nvme_pcie_common.c:339
#1  0x0000555555585cb5 in _nvme_pcie_ctrlr_create_io_qpair (ctrlr=0x2000003d60c0, qpair=0x2000002dbce0, qid=1) at nvme_pcie_common.c:551
#2  0x0000555555585d5b in nvme_pcie_ctrlr_connect_qpair (ctrlr=0x2000003d60c0, qpair=0x2000002dbce0) at nvme_pcie_common.c:568
#3  0x00005555555937aa in nvme_transport_ctrlr_connect_qpair (ctrlr=0x2000003d60c0, qpair=0x2000002dbce0) at nvme_transport.c:476
#4  0x00005555555707b7 in spdk_nvme_ctrlr_connect_io_qpair (ctrlr=0x2000003d60c0, qpair=0x2000002dbce0) at nvme_ctrlr.c:423
#5  0x0000555555570a39 in spdk_nvme_ctrlr_alloc_io_qpair (ctrlr=0x2000003d60c0, user_opts=0x0, opts_size=0) at nvme_ctrlr.c:493
#6  0x00005555555650ff in hello_world () at hello_world.c:175
#7  0x00005555555659e4 in main (argc=3, argv=0x7fffffffe0a8) at hello_world.c:463
```
相关代码

```c
static int _nvme_pcie_ctrlr_create_io_qpair(struct spdk_nvme_ctrlr *ctrlr, struct spdk_nvme_qpair *qpair, uint16_t qid) {
  rc = nvme_pcie_ctrlr_cmd_create_io_cq(ctrlr, qpair, nvme_completion_create_cq_cb, qpair);
  return 0;
}

int nvme_pcie_ctrlr_cmd_create_io_cq(struct spdk_nvme_ctrlr *ctrlr, struct spdk_nvme_qpair *io_que, spdk_nvme_cmd_cb cb_fn, void *cb_arg) {
  struct nvme_pcie_qpair *pqpair = nvme_pcie_qpair(io_que);
  struct nvme_request *req;
  struct spdk_nvme_cmd *cmd;

  req = nvme_allocate_request_null(ctrlr->adminq, cb_fn, cb_arg);
  if (req == NULL) {
    return -ENOMEM;
  }

  cmd = &req->cmd;
  cmd->opc = SPDK_NVME_OPC_CREATE_IO_CQ;

  cmd->cdw10_bits.create_io_q.qid = io_que->id;
  cmd->cdw10_bits.create_io_q.qsize = pqpair->num_entries - 1;

  cmd->cdw11_bits.create_io_cq.pc = 1;
  cmd->dptr.prp.prp1 = pqpair->cpl_bus_addr;  // CQ总线地址

  return nvme_ctrlr_submit_admin_request(ctrlr, req);  // 发送CREATE_IO_CQ命令
}

// CQ回调函数
static void nvme_completion_create_cq_cb(void *arg, const struct spdk_nvme_cpl *cpl) {
  rc = nvme_pcie_ctrlr_cmd_create_io_sq(qpair->ctrlr, qpair, nvme_completion_create_sq_cb, qpair);
  return 0;
}

int nvme_pcie_ctrlr_cmd_create_io_sq(struct spdk_nvme_ctrlr *ctrlr, struct spdk_nvme_qpair *io_que, spdk_nvme_cmd_cb cb_fn, void *cb_arg) {
  struct nvme_pcie_qpair *pqpair = nvme_pcie_qpair(io_que);
  struct nvme_request *req;
  struct spdk_nvme_cmd *cmd;

  req = nvme_allocate_request_null(ctrlr->adminq, cb_fn, cb_arg);
  if (req == NULL) {
    return -ENOMEM;
  }

  cmd = &req->cmd;
  cmd->opc = SPDK_NVME_OPC_CREATE_IO_SQ;

  cmd->cdw10_bits.create_io_q.qid = io_que->id;
  cmd->cdw10_bits.create_io_q.qsize = pqpair->num_entries - 1;
  cmd->cdw11_bits.create_io_sq.pc = 1;
  cmd->cdw11_bits.create_io_sq.qprio = io_que->qprio;
  cmd->cdw11_bits.create_io_sq.cqid = io_que->id;
  cmd->dptr.prp.prp1 = pqpair->cmd_bus_addr;  // SQ总线地址

  return nvme_ctrlr_submit_admin_request(ctrlr, req);  // 发送CREATE_IO_SQ命令
}
```
## 申请DMA缓冲区
```c
[2023-04-17 19:10:08.653515] nvme_pcie.c: 435:nvme_pcie_ctrlr_map_io_cmb: *DEBUG*: CMB not available
```
```c
static void *nvme_pcie_ctrlr_map_io_cmb(struct spdk_nvme_ctrlr *ctrlr, size_t *size) {
  if (pctrlr->cmb.bar_va == NULL) {
    SPDK_DEBUGLOG(nvme, "CMB not available\n");
    return NULL;
  }
}
// CMB不可用，故使用spdk_zmalloc申请DMA缓冲区
sequence.buf = spdk_nvme_ctrlr_map_cmb(ns_entry->ctrlr, &sz);
if (sequence.buf == NULL || sz < 0x1000) {  
	sequence.using_cmb_io = 0;
	sequence.buf = spdk_zmalloc(0x1000, 0x1000, NULL, SPDK_ENV_SOCKET_ID_ANY, SPDK_MALLOC_DMA);
}
```

## PRP处理
然后prp相关的两行输出
```bash
[2023-04-17 19:10:08.653530] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200000219000 len:512
[2023-04-17 19:10:08.653536] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x230e19000
```

建议阅读：
[SSD NVMe核心之PRP算法](https://www.cnblogs.com/ingram14/p/15778938.html)
NVM-Express-Base-Specification中Figure 87: Common Command Format
```c
static inline int nvme_pcie_prp_list_append(struct spdk_nvme_ctrlr *ctrlr, struct nvme_tracker *tr, uint32_t *prp_index, void *virt_addr, size_t len, uint32_t page_size) {
  struct spdk_nvme_cmd *cmd = &tr->req->cmd;
  uintptr_t page_mask = page_size - 1;
  uint64_t phys_addr;
  uint32_t i;

  SPDK_DEBUGLOG(nvme, "prp_index:%u virt_addr:%p len:%u\n", *prp_index, virt_addr, (uint32_t)len);

  if (spdk_unlikely(((uintptr_t)virt_addr & 3) != 0)) {  // 末尾两位不为0
    SPDK_ERRLOG("virt_addr %p not dword aligned\n", virt_addr);
    return -EFAULT;
  }

  i = *prp_index;
  while (len) {
    uint32_t seg_len;

    /*
     * prp_index 0 is stored in prp1, and the rest are stored in the prp[] array,
     * so prp_index == count is valid.
     */
    if (spdk_unlikely(i > SPDK_COUNTOF(tr->u.prp))) {
      SPDK_ERRLOG("out of PRP entries\n");
      return -EFAULT;
    }

    phys_addr = nvme_pcie_vtophys(ctrlr, virt_addr, NULL);  // 虚拟地址转换为物理地址
    if (spdk_unlikely(phys_addr == SPDK_VTOPHYS_ERROR)) {
      SPDK_ERRLOG("vtophys(%p) failed\n", virt_addr);
      return -EFAULT;
    }

    if (i == 0) {
      SPDK_DEBUGLOG(nvme, "prp1 = %p\n", (void *)phys_addr);
      cmd->dptr.prp.prp1 = phys_addr;
      seg_len = page_size - ((uintptr_t)virt_addr & page_mask);  // 该prp条目能描述的最大长度
    } else {
      if ((phys_addr & page_mask) != 0) {
        SPDK_ERRLOG("PRP %u not page aligned (%p)\n", i, virt_addr);
        return -EFAULT;
      }

      SPDK_DEBUGLOG(nvme, "prp[%u] = %p\n", i - 1, (void *)phys_addr);
      tr->u.prp[i - 1] = phys_addr;
      seg_len = page_size;
    }

    seg_len = spdk_min(seg_len, len);  // 实际长度
    virt_addr += seg_len;
    len -= seg_len;
    i++;
  }

  cmd->psdt = SPDK_NVME_PSDT_PRP;  // PRP or SGL for Data Transfer： 00b PRPs are used for this transfer.
  if (i <= 1) {                    // 未使用prp2，Only prp1
    cmd->dptr.prp.prp2 = 0;
  } else if (i == 2) {
    cmd->dptr.prp.prp2 = tr->u.prp[0];
    SPDK_DEBUGLOG(nvme, "prp2 = %p\n", (void *)cmd->dptr.prp.prp2);
  } else {
    cmd->dptr.prp.prp2 = tr->prp_sgl_bus_addr;
    SPDK_DEBUGLOG(nvme, "prp2 = %p (PRP list)\n", (void *)cmd->dptr.prp.prp2);
  }

  *prp_index = i;
  return 0;
}

```
gdb打印相关信息
```c
(gdb) bt
#0  nvme_pcie_prp_list_append (ctrlr=0x2000003d60c0, tr=0x2000005d6000, prp_index=0x7fffffffdd28, virt_addr=0x200000219000, len=512, page_size=4096) at nvme_pcie_common.c:1202
#1  0x000055555558797f in nvme_pcie_qpair_build_contig_request (qpair=0x2000002dbce0, req=0x2000005ffec0, tr=0x2000005d6000, dword_aligned=true) at nvme_pcie_common.c:1289
#2  0x00005555555886b9 in nvme_pcie_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_pcie_common.c:1683
#3  0x0000555555593c52 in nvme_transport_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_transport.c:596
#4  0x000055555558de4b in _nvme_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_qpair.c:1021
#5  0x000055555558e024 in nvme_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_qpair.c:1083
#6  0x000055555558176f in spdk_nvme_ns_cmd_write (ns=0x200000216f00, qpair=0x2000002dbce0, buffer=0x200000219000, lba=0, lba_count=1, cb_fn=0x555555564db4 <write_complete>, cb_arg=0x7fffffffdef0, io_flags=0) at nvme_ns_cmd.c:782
#7  0x0000555555565249 in hello_world () at hello_world.c:250
#8  0x00005555555659e4 in main (argc=3, argv=0x7fffffffe0a8) at hello_world.c:494
(gdb) f 7
#7  0x0000555555565249 in hello_world () at hello_world.c:250
250                     rc = spdk_nvme_ns_cmd_write(ns_entry->ns, ns_entry->qpair, sequence.buf,
(gdb) p sequence.buf
$1 = 0x200000219000 "Hello world!\n"
(gdb) n
1203            uintptr_t page_mask = page_size - 1;
(gdb) n
1207            SPDK_DEBUGLOG(nvme, "prp_index:%u virt_addr:%p len:%u\n",
(gdb) n
[2023-04-18 10:09:22.079246] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200000219000 len:512
1210            if (spdk_unlikely(((uintptr_t)virt_addr & 3) != 0)) {
(gdb) n
1215            i = *prp_index;
(gdb) n
1216            while (len) {
(gdb) p len
$2 = 512
(gdb) n
1223                    if (spdk_unlikely(i > SPDK_COUNTOF(tr->u.prp))) {
(gdb) n
1228                    phys_addr = nvme_pcie_vtophys(ctrlr, virt_addr, NULL);
(gdb) n
1229                    if (spdk_unlikely(phys_addr == SPDK_VTOPHYS_ERROR)) {
(gdb) p phys_addr
$3 = 9410023424
(gdb) p/x phys_addr
$4 = 0x230e19000
(gdb) n
1234                    if (i == 0) {
(gdb) n
1235                            SPDK_DEBUGLOG(nvme, "prp1 = %p\n", (void *)phys_addr);
(gdb) n
[2023-04-18 10:09:47.151443] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x230e19000
1236                            cmd->dptr.prp.prp1 = phys_addr;
(gdb) n
1237                            seg_len = page_size - ((uintptr_t)virt_addr & page_mask);
(gdb) n
1249                    seg_len = spdk_min(seg_len, len);
(gdb) p seg_len
$5 = 4096
(gdb) n
1250                    virt_addr += seg_len;
(gdb) p seg_len
$6 = 512
(gdb) n
1251                    len -= seg_len;
(gdb) n
1252                    i++;
(gdb) n
1216            while (len) {
(gdb) n
1255            cmd->psdt = SPDK_NVME_PSDT_PRP;
(gdb) n
1256            if (i <= 1) {
(gdb) n
1257                    cmd->dptr.prp.prp2 = 0;
(gdb) n
1266            *prp_index = i;
```
输出中打印的虚拟地址与物理地址就是sequence.buf的地址，长度为512是因为spdk_nvme_ns_cmd_write中的lba_count是以sector计数的，一个sector即为512字节

在函数调用中有两次利用了函数指针跳转
```c
const struct spdk_nvme_transport_ops pcie_ops = {
    .name = "PCIE",
    .type = SPDK_NVME_TRANSPORT_PCIE,
    .qpair_submit_request = nvme_pcie_qpair_submit_request,
};

int nvme_transport_qpair_submit_request(struct spdk_nvme_qpair *qpair, struct nvme_request *req) {
  if (spdk_likely(!nvme_qpair_is_admin_queue(qpair))) {
    return qpair->transport->ops.qpair_submit_request(qpair, req);
  }
}

static build_req_fn const g_nvme_pcie_build_req_table[][2] = {
	[NVME_PAYLOAD_TYPE_INVALID] = {
		nvme_pcie_qpair_build_request_invalid,			/* PRP */
		nvme_pcie_qpair_build_request_invalid			/* SGL */
	},
	[NVME_PAYLOAD_TYPE_CONTIG] = {
		nvme_pcie_qpair_build_contig_request,			/* PRP */
		nvme_pcie_qpair_build_contig_hw_sgl_request		/* SGL */
	},
	[NVME_PAYLOAD_TYPE_SGL] = {
		nvme_pcie_qpair_build_prps_sgl_request,			/* PRP */
		nvme_pcie_qpair_build_hw_sgl_request			/* SGL */
	}
};

int nvme_pcie_qpair_submit_request(struct spdk_nvme_qpair *qpair, struct nvme_request *req) {
  rc = g_nvme_pcie_build_req_table[payload_type][sgl_supported](qpair, req, tr, dword_aligned);
  return 0;
}

```

```c
(gdb) f 3
#3  0x0000555555593c52 in nvme_transport_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_transport.c:596
596                     return qpair->transport->ops.qpair_submit_request(qpair, req);
(gdb) p qpair->transport
$7 = (const struct spdk_nvme_transport *) 0x55555587d2e0 <g_spdk_transports>
(gdb) p *qpair->transport
$8 = {ops = {name = "PCIE", '\000' <repeats 28 times>, type = SPDK_NVME_TRANSPORT_PCIE, ctrlr_construct = 0x55555558af20 <nvme_pcie_ctrlr_construct>, ctrlr_scan = 0x55555558ae3f <nvme_pcie_ctrlr_scan>, ctrlr_destruct = 0x55555558b41a <nvme_pcie_ctrlr_destruct>, 
    ctrlr_enable = 0x55555558b28c <nvme_pcie_ctrlr_enable>, ctrlr_set_reg_4 = 0x555555589308 <nvme_pcie_ctrlr_set_reg_4>, ctrlr_set_reg_8 = 0x5555555893ac <nvme_pcie_ctrlr_set_reg_8>, ctrlr_get_reg_4 = 0x555555589453 <nvme_pcie_ctrlr_get_reg_4>, 
    ctrlr_get_reg_8 = 0x55555558952e <nvme_pcie_ctrlr_get_reg_8>, ctrlr_set_reg_4_async = 0x0, ctrlr_set_reg_8_async = 0x0, ctrlr_get_reg_4_async = 0x0, ctrlr_get_reg_8_async = 0x0, ctrlr_get_max_xfer_size = 0x5555555897e5 <nvme_pcie_ctrlr_get_max_xfer_size>, 
    ctrlr_get_max_sges = 0x555555589803 <nvme_pcie_ctrlr_get_max_sges>, ctrlr_reserve_cmb = 0x555555589aac <nvme_pcie_ctrlr_reserve_cmb>, ctrlr_map_cmb = 0x555555589b69 <nvme_pcie_ctrlr_map_io_cmb>, ctrlr_unmap_cmb = 0x555555589dfd <nvme_pcie_ctrlr_unmap_io_cmb>, 
    ctrlr_enable_pmr = 0x55555558a76f <nvme_pcie_ctrlr_enable_pmr>, ctrlr_disable_pmr = 0x55555558a792 <nvme_pcie_ctrlr_disable_pmr>, ctrlr_map_pmr = 0x55555558a7b5 <nvme_pcie_ctrlr_map_io_pmr>, ctrlr_unmap_pmr = 0x55555558aa1d <nvme_pcie_ctrlr_unmap_io_pmr>, 
    ctrlr_create_io_qpair = 0x555555586fa8 <nvme_pcie_ctrlr_create_io_qpair>, ctrlr_delete_io_qpair = 0x5555555870db <nvme_pcie_ctrlr_delete_io_qpair>, ctrlr_connect_qpair = 0x555555585d0c <nvme_pcie_ctrlr_connect_qpair>, 
    ctrlr_disconnect_qpair = 0x555555585d76 <nvme_pcie_ctrlr_disconnect_qpair>, qpair_abort_reqs = 0x5555555867b2 <nvme_pcie_qpair_abort_reqs>, qpair_reset = 0x555555584699 <nvme_pcie_qpair_reset>, qpair_submit_request = 0x555555588463 <nvme_pcie_qpair_submit_request>, 
    qpair_process_completions = 0x5555555868f3 <nvme_pcie_qpair_process_completions>, qpair_iterate_requests = 0x55555558b4c3 <nvme_pcie_qpair_iterate_requests>, admin_qpair_abort_aers = 0x5555555866d7 <nvme_pcie_admin_qpair_abort_aers>, 
    poll_group_create = 0x55555558877e <nvme_pcie_poll_group_create>, qpair_get_optimal_poll_group = 0x0, poll_group_add = 0x555555588800 <nvme_pcie_poll_group_add>, poll_group_remove = 0x555555588817 <nvme_pcie_poll_group_remove>, 
    poll_group_connect_qpair = 0x5555555887da <nvme_pcie_poll_group_connect_qpair>, poll_group_disconnect_qpair = 0x5555555887ed <nvme_pcie_poll_group_disconnect_qpair>, poll_group_process_completions = 0x555555588851 <nvme_pcie_poll_group_process_completions>, 
    poll_group_destroy = 0x55555558894f <nvme_pcie_poll_group_destroy>, poll_group_get_stats = 0x555555588993 <nvme_pcie_poll_group_get_stats>, poll_group_free_stats = 0x555555588a76 <nvme_pcie_poll_group_free_stats>, ctrlr_get_memory_domains = 0x0, ctrlr_ready = 0x0, 
    ctrlr_get_registers = 0x5555555892db <nvme_pcie_ctrlr_get_registers>}, link = {tqe_next = 0x55555587d478 <g_spdk_transports+408>, tqe_prev = 0x555555869320 <g_spdk_nvme_transports>}}
(gdb) f 2
#2  0x00005555555886b9 in nvme_pcie_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_pcie_common.c:1683
1683                    rc = g_nvme_pcie_build_req_table[payload_type][sgl_supported](qpair, req, tr, dword_aligned);
(gdb) p payload_type
$9 = NVME_PAYLOAD_TYPE_CONTIG
(gdb) p sgl_supported
$10 = false
```
## 数据收发流程
hello_world函数的执行流程大致如下：

```base
创建SQ/CQ队列
申请DMA缓冲区，写入数据
发送写命令
持续轮询
	写完成，调用写回调函数
		释放DMA缓冲区并重新申请，发送读命令
	读完成，调用读回调函数
		打印缓冲区数据，释放DMA缓冲区
销毁SQ/CQ队列
```
读写命令是类似的，故只分析发送写命令到调用写回调函数的过程

```c
[2023-04-17 19:10:08.653553] nvme_qpair.c: 243:nvme_io_qpair_print_command: *NOTICE*: WRITE sqid:1 cid:191 nsid:1 lba:0 len:1 PRP1 0x230e19000 PRP2 0x0
[2023-04-17 19:10:08.654189] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:1 cid:191 cdw0:0 sqhd:0001 p:1 m:0 dnr:0
```

由《深入浅出SSD》 6.5节trace分析可知，主机读请求的执行流程如下：

 1. 主机准备好命令放在SQ
 2. 主机通过写SQ的Tail DB，通知SSD来取命令（Memory Write TLP）
 3. SSD收到通知，去主机端的SQ取指令（Memory Read TLP）
 4. SSD执行命令，把数据传给主机（Memory Write TLP）
 5. SSD往主机的CQ中返回状态
 6. SSD采用中断的方式告诉主机去处理CQ
 7. 主机处理相应CQ，更新CQ Head DB（Memory Write TLP）

主机相关的三行代码如下：

```c
// 主机准备好命令放在SQ
nvme_pcie_copy_command(&pqpair->cmd[pqpair->sq_tail], &req->cmd);

// 主机通过写SQ的Tail DB，通知SSD来取命令
spdk_mmio_write_4(pqpair->sq_tdbl, pqpair->sq_tail);

// 主机处理相应CQ，更新CQ Head DB
spdk_mmio_write_4(pqpair->cq_hdbl, pqpair->cq_head);
```
 相关代码
```c
void nvme_pcie_qpair_submit_tracker(struct spdk_nvme_qpair *qpair, struct nvme_tracker *tr) {
  /* Don't use wide instructions to copy NVMe command, this is limited by QEMU
   * virtual NVMe controller, the maximum access width is 8 Bytes for one time.
   */
  if (spdk_unlikely((ctrlr->quirks & NVME_QUIRK_MAXIMUM_PCI_ACCESS_WIDTH) && pqpair->sq_in_cmb)) {
    nvme_pcie_copy_command_mmio(&pqpair->cmd[pqpair->sq_tail], &req->cmd);
  } else {
    /* Copy the command from the tracker to the submission queue. */
    nvme_pcie_copy_command(&pqpair->cmd[pqpair->sq_tail], &req->cmd);
  }
  if (!pqpair->flags.delay_cmd_submit) {
    nvme_pcie_qpair_ring_sq_doorbell(qpair);
  }
}

static inline void nvme_pcie_qpair_ring_sq_doorbell(struct spdk_nvme_qpair *qpair) {
  if (spdk_likely(need_mmio)) {
    spdk_wmb();
    pqpair->stat->sq_mmio_doorbell_updates++;
    g_thread_mmio_ctrlr = pctrlr;
    spdk_mmio_write_4(pqpair->sq_tdbl, pqpair->sq_tail);
    g_thread_mmio_ctrlr = NULL;
  }
}


(gdb) bt
#0  nvme_pcie_qpair_submit_tracker (qpair=0x2000002dbce0, tr=0x2000005d6000) at nvme_pcie_common.c:626
#1  0x0000555555588753 in nvme_pcie_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_pcie_common.c:1698
#2  0x0000555555593c52 in nvme_transport_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_transport.c:596
#3  0x000055555558de4b in _nvme_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_qpair.c:1021
#4  0x000055555558e024 in nvme_qpair_submit_request (qpair=0x2000002dbce0, req=0x2000005ffec0) at nvme_qpair.c:1083
#5  0x000055555558176f in spdk_nvme_ns_cmd_write (ns=0x200000216f00, qpair=0x2000002dbce0, buffer=0x200000219000, lba=0, lba_count=1, cb_fn=0x555555564db4 <write_complete>, cb_arg=0x7fffffffdef0, io_flags=0) at nvme_ns_cmd.c:782
#6  0x0000555555565249 in hello_world () at hello_world.c:250
#7  0x00005555555659e4 in main (argc=3, argv=0x7fffffffe0a8) at hello_world.c:494
```
```c
int32_t nvme_pcie_qpair_process_completions(struct spdk_nvme_qpair *qpair, uint32_t max_completions) {
  pqpair->stat->polls++;

  while (1) {
    cpl = &pqpair->cpl[pqpair->cq_head];

    if (!next_is_valid && cpl->status.p != pqpair->flags.phase) {
      break;
    }
    tr = &pqpair->tr[cpl->cid];
    pqpair->sq_head = cpl->sqhd;
    if (tr->req) {
      nvme_pcie_qpair_complete_tracker(qpair, tr, cpl, true);  // 处理请求
    }
    if (++num_completions == max_completions) {
      break;
    }
  }

  if (num_completions > 0) {
    pqpair->stat->completions += num_completions;
    nvme_pcie_qpair_ring_cq_doorbell(qpair);
  } else {
    pqpair->stat->idle_polls++;
  }
  return num_completions;
}

void nvme_pcie_qpair_complete_tracker(struct spdk_nvme_qpair *qpair, struct nvme_tracker *tr, struct spdk_nvme_cpl *cpl, bool print_on_error) {
  struct nvme_pcie_qpair *pqpair = nvme_pcie_qpair(qpair);
  error = spdk_nvme_cpl_is_error(cpl);
  retry = error && nvme_completion_is_retry(cpl) && req->retries < pqpair->retry_count;

  if (retry) {
    req->retries++;
    nvme_pcie_qpair_submit_tracker(qpair, tr);  // 重新发送命令
  } else {
    /* Only check admin requests from different processes. */
    if (nvme_qpair_is_admin_queue(qpair) && req->pid != getpid()) {
      req_from_current_proc = false;
      nvme_pcie_qpair_insert_pending_admin_request(qpair, req, cpl);
    } else {
      nvme_complete_request(tr->cb_fn, tr->cb_arg, qpair, req, cpl);
    }
  }
}

static inline void nvme_complete_request(spdk_nvme_cmd_cb cb_fn, void *cb_arg, struct spdk_nvme_qpair *qpair, struct nvme_request *req, struct spdk_nvme_cpl *cpl) {
  if (cb_fn) {  // 执行回调函数
    cb_fn(cb_arg, cpl);
  }
}

static inline void nvme_pcie_qpair_ring_cq_doorbell(struct spdk_nvme_qpair *qpair) {
  if (spdk_likely(need_mmio)) {
    pqpair->stat->cq_mmio_doorbell_updates++;
    g_thread_mmio_ctrlr = pctrlr;
    spdk_mmio_write_4(pqpair->cq_hdbl, pqpair->cq_head);
    g_thread_mmio_ctrlr = NULL;
  }
}

(gdb) bt
#0  nvme_pcie_qpair_ring_cq_doorbell (qpair=0x2000002dbce0) at nvme_pcie_internal.h:277
#1  0x0000555555586cf1 in nvme_pcie_qpair_process_completions (qpair=0x2000002dbce0, max_completions=64) at nvme_pcie_common.c:949
#2  0x0000555555593cf8 in nvme_transport_qpair_process_completions (qpair=0x2000002dbce0, max_completions=0) at nvme_transport.c:610
#3  0x000055555558d507 in spdk_nvme_qpair_process_completions (qpair=0x2000002dbce0, max_completions=0) at nvme_qpair.c:792
#4  0x0000555555565298 in hello_world () at hello_world.c:273
#5  0x00005555555659e4 in main (argc=3, argv=0x7fffffffe0a8) at hello_world.c:494
```



spdk github地址：
[https://github.com/spdk/spdk](https://github.com/spdk/spdk)
[spdk官方文档中文版](https://www.cnblogs.com/whl320124/p/11398951.html)
英文官网地址：
[https://spdk.io/doc/](https://spdk.io/doc/)

[并发编程中的futrue和promise，你了解多少？](https://zhuanlan.zhihu.com/p/493225557)
[configure、 make、 make install 背后的原理(翻译)](https://zhuanlan.zhihu.com/p/77813702)

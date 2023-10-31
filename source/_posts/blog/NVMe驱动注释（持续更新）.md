---
title: NVMe驱动注释（持续更新）
date: 2023-03-06 10:26:57
tags: nvme驱动
categories: 
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
---
<meta name="referrer" content="no-referrer" />



往期文章：
[NVMe驱动学习记录-1](https://www.jiasun.top/blog/NVMe%E9%A9%B1%E5%8A%A8%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BD%95-1.html)
[NVMe驱动学习记录-2](https://www.jiasun.top/blog/NVMe%E9%A9%B1%E5%8A%A8%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BD%95-2.html)
[NVMe驱动 请求路径学习记录](https://www.jiasun.top/blog/NVMe%E9%A9%B1%E5%8A%A8%20%E8%AF%B7%E6%B1%82%E8%B7%AF%E5%BE%84%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BD%95.html)

整合了之前文章的一些内容
# 参考

源码地址：[https://mirrors.tuna.tsinghua.edu.cn/kernel/v4.x/linux-4.19.90.tar.gz](https://mirrors.tuna.tsinghua.edu.cn/kernel/v4.x/linux-4.19.90.tar.gz)    

> linux-4.19.90\drivers\nvme\host

源码阅读环境：[Windows 搭建 opengrok|极客教程 (geek-docs.com)](https://geek-docs.com/personal/obama/windows-setup-opengrok.html)

书籍：
[LINUX设备驱动程序](https://github.com/1020xyr/books/blob/main/LINUX%E8%AE%BE%E5%A4%87%E9%A9%B1%E5%8A%A8%E7%A8%8B%E5%BA%8F(%E7%AC%AC3%E7%89%88).pdf)    
[NVMe Base Specification](https://nvmexpress.org/developers/nvme-specification/)

初始化参考链接：[linux里的nvme驱动代码分析（加载初始化） ](https://blog.csdn.net/panzhenjie/article/details/51581063) nvme_reset_work()函数后的代码大致相同

IO入口点：[NVMe的Linux内核驱动分析](https://zhuanlan.zhihu.com/p/72234187)

块设备层相关数据结构：[Block multi-queue 架构解析（一）数据结构](https://blog.csdn.net/qq_32740107/article/details/106302376?spm=1001.2014.3001.5501)

块设备层文档：[Block Device Drivers](https://linux-kernel-labs.github.io/refs/heads/master/labs/block_device_drivers.html#block-device-drivers)

[linux内核源码分析 - nvme设备的初始化](https://www.cnblogs.com/tolimit/p/8779876.html)



函数查询：[identifier - Linux source code (v5.14.9) - Bootlin](https://elixir.bootlin.com/linux/latest/ident)

![preview](https://img-blog.csdnimg.cn/img_convert/4ecd7c7deba418d2d5ceba1203f15d13.png)



[手把手教Linux驱动](https://blog.csdn.net/daocaokafei/article/details/108071589)

[linux驱动开发](https://www.cnblogs.com/xiaojiang1025/category/918665.html?page=2)

[nvme kernel driver 阅读笔记](https://www.dazhuanlan.com/karenchan/topics/1006006)

[nvme协议详解](https://www.zhihu.com/column/c_1338070478725480449)

# 源代码
<font size=5>请注意，本文已将错误处理代码 unlikely分支代码略去，留下基本的处理代码，若需阅读相关代码，请自行下载源码</font>
## 阅读顺序
```c
nvme_core模块初始化
	nvme_core_init():创建工作队列，类；申请设备号
nvme模块初始化
	nvme_init():注册pci_driver结构体
	nvme_probe()
		nvme_dev_map():申请IO内存并进行映射
		nvme_setup_prp_pools():创建DMA池
		nvme_init_ctrl():填充nvme_ctrl结构体，创建字符设备
		nvme_reset_ctrl():修改nvme_ctrl结构体状态，将nvme_reset_work加入工作队列nvme_reset_wq
    
	nvme_reset_work():重启设备，涉及许多nvme协议相关知识，还有设备各阶段对寄存器的操作，没太仔细看，就对照博客看一下功能即可
    	nvme_dev_disable(dev, false):正常关机
		nvme_pci_enable():初始化pci设备（BAR寄存器，MSI-X中断，CMB等)
  		nvme_pci_configure_admin_queue():映射bar寄存器，申请并初始化admin队列
		nvme_alloc_admin_tags():初始化dev->admin_tagset结构体，并创建请求队列
    	nvme_init_identify(): 向NVMe设备发送identify命令
    	nvme_setup_io_queues():向NVMe设备发送set feature命令，再次申请中断号，注册中断函数 申请空间，创建IO队列
    	nvme_dev_add():填充dev->tagset 
    	nvme_start_ctrl()->nvme_queue_scan()->ctrl->scan_work->nvme_scan_work()
    
    nvme_scan_work(): 发送一系列identify命令，创建块设备
    只需看nvme_scan_ns_list()->nvme_validate_ns()->nvme_alloc_ns()
    	nvme_alloc_ns():填充ns，创建块设备

```

## 简单注释
nvme驱动由两个内核模块组成：nvme模块与nvme_core模块，nvme模块依赖于nvme_core模块
```bash
s081@ubuntu ~> lsmod | grep "nvme"
nvme                   49152  0
nvme_core             135168  1 nvme
s081@ubuntu ~> rmmod nvme_core
rmmod: ERROR: Module nvme_core is in use by: nvme
```

Makefile文件如下：
```cpp
# SPDX-License-Identifier: GPL-2.0

ccflags-y				+= -I$(src)

obj-$(CONFIG_NVME_CORE)			+= nvme-core.o
obj-$(CONFIG_BLK_DEV_NVME)		+= nvme.o
obj-$(CONFIG_NVME_FABRICS)		+= nvme-fabrics.o
obj-$(CONFIG_NVME_RDMA)			+= nvme-rdma.o
obj-$(CONFIG_NVME_FC)			+= nvme-fc.o

nvme-core-y				:= core.o
nvme-core-$(CONFIG_TRACING)		+= trace.o
nvme-core-$(CONFIG_NVME_MULTIPATH)	+= multipath.o
nvme-core-$(CONFIG_NVM)			+= lightnvm.o
nvme-core-$(CONFIG_FAULT_INJECTION_DEBUG_FS)	+= fault_inject.o

nvme-y					+= pci.o

nvme-fabrics-y				+= fabrics.o

nvme-rdma-y				+= rdma.o

nvme-fc-y				+= fc.o
```
可以看出nvme-core模块由core.c编译而来，nvme模块由pci.c编译而来
主要涉及的文件有
```c++
drivers\nvme\host\nvme.h
\include\linux\nvme.h
drivers\nvme\host\pci.c
drivers\nvme\host\core.c
```


### 初始化
#### nvme_core_init
nvme驱动首先加载nvme_core模块，再加载nvme模块，故先看nvme_core模块的入口点函数
```c
int __init nvme_core_init(void) {
  int result = -ENOMEM;
  // 创建工作队列
  nvme_wq = alloc_workqueue("nvme-wq", WQ_UNBOUND | WQ_MEM_RECLAIM | WQ_SYSFS, 0);
  nvme_reset_wq = alloc_workqueue("nvme-reset-wq", WQ_UNBOUND | WQ_MEM_RECLAIM | WQ_SYSFS, 0);
  nvme_delete_wq = alloc_workqueue("nvme-delete-wq", WQ_UNBOUND | WQ_MEM_RECLAIM | WQ_SYSFS, 0);
  // 申请设备号
  result = alloc_chrdev_region(&nvme_chr_devt, 0, NVME_MINORS, "nvme");
  // 创建struct class对象，用作device_create(struct class *class, struct device *parent,dev_t devt, void *drvdata, const char *fmt, ...)参数
  nvme_class = class_create(THIS_MODULE, "nvme");
  nvme_subsys_class = class_create(THIS_MODULE, "nvme-subsystem");

  return 0;
}

MODULE_LICENSE("GPL");
MODULE_VERSION("1.0");
module_init(nvme_core_init);
module_exit(nvme_core_exit);
```
nvme_core模块只是创建了3个工作队列，申请了字符设备的设备号，创建了两个class类
![](https://img-blog.csdnimg.cn/5910c833b1644958863005af04c5e394.png)
nvme-generic不知道从哪来的，有可能是内核版本不一致的问题，虚拟机内核版本5.15.0，nvme代码版本4.19.0

然后便是nvme模块的入口点函数

```c
static const struct pci_device_id nvme_id_table[] = {{
                                                         PCI_VDEVICE(INTEL, 0x0953),
                                                         .driver_data = NVME_QUIRK_STRIPE_SIZE | NVME_QUIRK_DEALLOCATE_ZEROES,
                                                     },
// 略去一些id
                                                     {PCI_DEVICE_CLASS(PCI_CLASS_STORAGE_EXPRESS, 0xffffff)},
                                                     {PCI_DEVICE(PCI_VENDOR_ID_APPLE, 0x2001)},
                                                     {PCI_DEVICE(PCI_VENDOR_ID_APPLE, 0x2003)},
                                                     {
                                                         0,
                                                     }};
MODULE_DEVICE_TABLE(pci, nvme_id_table);

static struct pci_driver nvme_driver = {
    .name = "nvme",
    .id_table = nvme_id_table,
    .probe = nvme_probe,  // 探测函数
    .remove = nvme_remove,
    .shutdown = nvme_shutdown,
    .driver =
        {
            .pm = &nvme_dev_pm_ops,
        },
    .sriov_configure = pci_sriov_configure_simple,
    .err_handler = &nvme_err_handler,
};

static int __init nvme_init(void) {
  return pci_register_driver(&nvme_driver);  // 注册pci_driver对象
}

MODULE_AUTHOR("Matthew Wilcox <willy@linux.intel.com>");
MODULE_LICENSE("GPL");
MODULE_VERSION("1.0");
module_init(nvme_init);
module_exit(nvme_exit);

```
nvme_init函数向系统注册一个pci_driver对象，当连入pci总线的设备ID与nvme_id_table匹配时，则会调用驱动的探测函数nvme_probe，进行设备的初始化操作
#### nvme_probe
```c
static int nvme_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
  int node, result = -ENOMEM;
  struct nvme_dev *dev;
  unsigned long quirks = id->driver_data;  // enum nvme_quirks对象，非标准方法
  size_t alloc_size;

  node = dev_to_node(&pdev->dev);                                         // 获取所属内存节点
  if (node == NUMA_NO_NODE) set_dev_node(&pdev->dev, first_memory_node);  // 设置所属内存节点

  dev = kzalloc_node(sizeof(*dev), GFP_KERNEL, node);  // 为nvme_dev结构体申请空间，注意dev为struct nvme_dev *类型而不是struct device*类型

  dev->queues = kcalloc_node(num_possible_cpus() + 1, sizeof(struct nvme_queue), GFP_KERNEL, node);  // 申请(num_possible_cpus() + 1)个nvme_queue结构体空间

  dev->dev = get_device(&pdev->dev);  // 增加pdev->dev引用计数
  pci_set_drvdata(pdev, dev);         // 设置device私有数据，pdev->dev->driver_data = dev

  result = nvme_dev_map(dev);  // 映射BAR空间
  // 创建工作项
  INIT_WORK(&dev->ctrl.reset_work, nvme_reset_work);
  INIT_WORK(&dev->remove_work, nvme_remove_dead_ctrl_work);
  // 初始化互斥锁
  mutex_init(&dev->shutdown_lock);
  // 初始化完成变量
  init_completion(&dev->ioq_wait);

  result = nvme_setup_prp_pools(dev);  // 创建DMA池

  quirks |= check_vendor_combination_bug(pdev);  // 特殊设备处理，不需要关注

  /*
   * Double check that our mempool alloc size will cover the biggest
   * command we support.
   */
  alloc_size = nvme_pci_iod_alloc_size(dev, NVME_MAX_KB_SZ, NVME_MAX_SEGS, true); // 分配的内存池大小，与sgl命令 scatterlist有关，暂不分析
  WARN_ON_ONCE(alloc_size > PAGE_SIZE);
  /*
  mempool_t *mempool_create_node(int min_nr, mempool_alloc_t *alloc_fn,mempool_free_t *free_fn, void *pool_data,gfp_t gfp_mask, int node_id)
  void *mempool_kmalloc(gfp_t gfp_mask, void *pool_data)
  {
        size_t size = (size_t)pool_data;
        return kmalloc(size, gfp_mask);
  }
  */
  dev->iod_mempool = mempool_create_node(1, mempool_kmalloc, mempool_kfree, (void *)alloc_size, GFP_KERNEL, node);  // 创建内存池，预分配一个对象空间

  result = nvme_init_ctrl(&dev->ctrl, &pdev->dev, &nvme_pci_ctrl_ops, quirks);  // 填充struct nvme_ctrl结构体并注册字符设备

  dev_info(dev->ctrl.device, "pci function %s\n", dev_name(&pdev->dev));

  nvme_reset_ctrl(&dev->ctrl);            // 重置控制器
  nvme_get_ctrl(&dev->ctrl);              // 增加dev->ctrl->device引用计数
  async_schedule(nvme_async_probe, dev);  // 等待任务完成再减小引用计数
  return 0;
}
```
分析nvme_dev_map函数与BAR相关代码
```c
static int nvme_remap_bar(struct nvme_dev *dev, unsigned long size) {
  struct pci_dev *pdev = to_pci_dev(dev->dev);
  if (size <= dev->bar_mapped_size) return 0;             // 如果小于之前的映射空间大小，则不需要重新映射
  if (size > pci_resource_len(pdev, 0)) return -ENOMEM;   //  超出BAR空间大小，返回错误
  if (dev->bar) iounmap(dev->bar);                        // 取消之前的映射
  dev->bar = ioremap(pci_resource_start(pdev, 0), size);  // 映射BAR0
  dev->bar_mapped_size = size;
  dev->dbs = dev->bar + NVME_REG_DBS;
  return 0;
}

static int nvme_dev_map(struct nvme_dev *dev) {
  struct pci_dev *pdev = to_pci_dev(dev->dev);
  pci_request_mem_regions(pdev, "nvme");     // 声明占用内存空间，只调用一次
  nvme_remap_bar(dev, NVME_REG_DBS + 4096);  // 进行BAR空间映射，调用了三次
  return 0;
}
```

```c
三次nvme_remap_bar调用
enum {
  NVME_REG_CAP = 0x0000,    /* Controller Capabilities */
  NVME_REG_VS = 0x0008,     /* Version */
  NVME_REG_INTMS = 0x000c,  /* Interrupt Mask Set */
  NVME_REG_INTMC = 0x0010,  /* Interrupt Mask Clear */
  NVME_REG_CC = 0x0014,     /* Controller Configuration */
  NVME_REG_CSTS = 0x001c,   /* Controller Status */
  NVME_REG_NSSR = 0x0020,   /* NVM Subsystem Reset */
  NVME_REG_AQA = 0x0024,    /* Admin Queue Attributes */
  NVME_REG_ASQ = 0x0028,    /* Admin SQ Base Address */
  NVME_REG_ACQ = 0x0030,    /* Admin CQ Base Address */
  NVME_REG_CMBLOC = 0x0038, /* Controller Memory Buffer Location */
  NVME_REG_CMBSZ = 0x003c,  /* Controller Memory Buffer Size */
  NVME_REG_DBS = 0x1000,    /* SQ 0 Tail Doorbell */
};

#define NVME_CAP_STRIDE(cap)	(((cap) >> 32) & 0xf)	// DB寄存器步长

dev->db_stride = 1 << NVME_CAP_STRIDE(dev->ctrl.cap);   // CAP寄存器32-35位

static unsigned long db_bar_size(struct nvme_dev *dev, unsigned nr_io_queues) { 
	return NVME_REG_DBS + ((nr_io_queues + 1) * 8 * dev->db_stride); 
}

// nvme_dev_map
nvme_remap_bar(dev, NVME_REG_DBS + 4096); 

// nvme_pci_configure_admin_queue
result = nvme_remap_bar(dev, db_bar_size(dev, 0));

// nvme_setup_io_queues
  do {
    size = db_bar_size(dev, nr_io_queues);
    result = nvme_remap_bar(dev, size);
    if (!result) break;		// 映射成功，退出循环
    if (!--nr_io_queues) return -ENOMEM;
  } while (1);
```

```c
使用方式
// nvme_init_queue  nvme_alloc_queue
nvmeq->q_db = &dev->dbs[qid * 2 * dev->db_stride];
// nvme_submit_cmd
writel(nvmeq->sq_tail, nvmeq->q_db);
// nvme_ring_cq_doorbell
u16 head = nvmeq->cq_head;
writel(head, nvmeq->q_db + nvmeq->dev->db_stride);
```
首先介绍Doorbell Stride寄存器——NVM-Express-Base-Specification
![](https://img-blog.csdnimg.cn/d3a1901b8d9e49aaa96f266b1524fe8a.png)
![](https://img-blog.csdnimg.cn/14c45b6066d64a289eb97e263bbf9037.png)
总的来说一句话，实际的物理设备CAP.DSTRD值为0，dev->db_stride为1，之后分析中默认db_stride为1
![](https://img-blog.csdnimg.cn/7e8ebb2b41004945840c592f8d7f81fa.png)
vmware中虚拟nvme硬盘BAR0为16K，驱动第一次映射了8K空间，第二次仅仅映射1个sq/cq寄存器对（admin）的空间，大概率是小于8K的，不需要重新映射，第三次首先计算IO队列数，而后持续尝试映射对应大小的BAR空间，直到找到合适的IO队列数，但通常也是小于8K的，所以不需要进行循环，所以大多数情况只需要进行一次实际的BAR空间映射
**NVMe白皮书对NVMe的配置建议**
![](https://img-blog.csdnimg.cn/f9858338fc8443868e85327d0842e918.png)
由dev->dbs使用方式可知，每一个DB寄存器对，前4个字节为SQ Tail DB，后四个字节为CQ Head DB

**DMA池代码**
```c
static int nvme_setup_prp_pools(struct nvme_dev *dev) {
  // struct dma_pool *dma_pool_create(const char *name, struct device *dev,size_t size, size_t align, size_t boundary)
  // 创建页DMA池
  dev->prp_page_pool = dma_pool_create("prp list page", dev->dev, PAGE_SIZE, PAGE_SIZE, 0);
  // 创建小DMA池
  /* Optimisation for I/Os between 4k and 128k */
  dev->prp_small_pool = dma_pool_create("prp list 256", dev->dev, 256, 256, 0);
  return 0;
}

```
#### nvme_init_ctrl
**nvme_ctrl结构体初始化**

```c
#define MINORBITS	20
#define MINORMASK	((1U << MINORBITS) - 1)

#define MAJOR(dev)	((unsigned int) ((dev) >> MINORBITS))
#define MINOR(dev)	((unsigned int) ((dev) & MINORMASK))
#define MKDEV(ma,mi)	(((ma) << MINORBITS) | (mi))

/*
 * Initialize a NVMe controller structures.  This needs to be called during
 * earliest initialization so that we have the initialized structured around
 * during probing.
 */
int nvme_init_ctrl(struct nvme_ctrl *ctrl, struct device *dev, const struct nvme_ctrl_ops *ops, unsigned long quirks) {
  int ret;

  ctrl->state = NVME_CTRL_NEW;
  spin_lock_init(&ctrl->lock);
  mutex_init(&ctrl->scan_lock);
  INIT_LIST_HEAD(&ctrl->namespaces);
  init_rwsem(&ctrl->namespaces_rwsem);
  ctrl->dev = dev;
  ctrl->ops = ops;
  ctrl->quirks = quirks;
  // 创建工作项
  INIT_WORK(&ctrl->scan_work, nvme_scan_work);
  INIT_WORK(&ctrl->async_event_work, nvme_async_event_work);
  INIT_WORK(&ctrl->fw_act_work, nvme_fw_act_work);
  INIT_WORK(&ctrl->delete_work, nvme_delete_ctrl_work);
  // 创建延迟工作项
  INIT_DELAYED_WORK(&ctrl->ka_work, nvme_keep_alive_work);
  memset(&ctrl->ka_cmd, 0, sizeof(ctrl->ka_cmd));
  ctrl->ka_cmd.common.opcode = nvme_admin_keep_alive;

  BUILD_BUG_ON(NVME_DSM_MAX_RANGES * sizeof(struct nvme_dsm_range) > PAGE_SIZE);
  ctrl->discard_page = alloc_page(GFP_KERNEL);
  // 分配未使用的唯一ID
  ret = ida_simple_get(&nvme_instance_ida, 0, 0, GFP_KERNEL);
  ctrl->instance = ret;

  device_initialize(&ctrl->ctrl_device);  // 初始化struct device结构体
  ctrl->device = &ctrl->ctrl_device;
  ctrl->device->devt = MKDEV(MAJOR(nvme_chr_devt), ctrl->instance);  // 使用之前申请的设备号
  ctrl->device->class = nvme_class;
  ctrl->device->parent = ctrl->dev;
  ctrl->device->groups = nvme_dev_attr_groups;
  ctrl->device->release = nvme_free_ctrl;
  dev_set_drvdata(ctrl->device, ctrl);	// ctrl->device->driver_data=ctrl
  ret = dev_set_name(ctrl->device, "nvme%d", ctrl->instance); 

  cdev_init(&ctrl->cdev, &nvme_dev_fops);  // 初始化字符设备
  ctrl->cdev.owner = ops->module;
  ret = cdev_device_add(&ctrl->cdev, ctrl->device);  // 注册字符设备并导出至用户空间

  /*
   * Initialize latency tolerance controls.  The sysfs files won't
   * be visible to userspace unless the device actually supports APST.
   */
  ctrl->device->power.set_latency_tolerance = nvme_set_latency_tolerance;
  dev_pm_qos_update_user_latency_tolerance(ctrl->device, min(default_ps_max_latency_us, (unsigned long)S32_MAX));

  return 0;
}
```
nvme_init_ctrl函数主要就是填充了一遍nvme_ctrl结构体并注册了字符设备，nvme0即为导出的字符设备，主设备号为240，次设备号为0
![](https://img-blog.csdnimg.cn/da7278c5a4eb421f922a05022fa265cd.png)
再向虚拟机中加入一个nvme盘，注意需设置为新的设备节点
![](https://img-blog.csdnimg.cn/8e08b8d6be35458d8f2cdb0a58164d0d.png)
![](https://img-blog.csdnimg.cn/c4133ba2520b4f21b9e671cd3d0209bc.png)
![](https://img-blog.csdnimg.cn/28607989a14247cbb513a72b489c7b38.png)
默认设置的话就会变成以下的样子
![](https://img-blog.csdnimg.cn/7679029c10cd4a9aa4d775c28248586f.png)
![](https://img-blog.csdnimg.cn/209e8945b42346c699e60ef7025d262b.png)
nvme_probe函数中的dev_info输出如下
![](https://img-blog.csdnimg.cn/f2853984dd2b4101b4600429588cf3c8.png)
也就是说，设备有两个，驱动也执行了两次探测函数，创建了两个nvme字符设备，那么问题来了，nvme驱动是一个块设备驱动，为什么要创建字符设备呢？ 当然是提供相应的功能，也就是file_operations操作
```c
#define NVME_IOCTL_ID		_IO('N', 0x40)
#define NVME_IOCTL_ADMIN_CMD	_IOWR('N', 0x41, struct nvme_admin_cmd)
#define NVME_IOCTL_SUBMIT_IO	_IOW('N', 0x42, struct nvme_user_io)
#define NVME_IOCTL_IO_CMD	_IOWR('N', 0x43, struct nvme_passthru_cmd)
#define NVME_IOCTL_RESET	_IO('N', 0x44)
#define NVME_IOCTL_SUBSYS_RESET	_IO('N', 0x45)
#define NVME_IOCTL_RESCAN	_IO('N', 0x46)

static int nvme_dev_open(struct inode *inode, struct file *file) {
  struct nvme_ctrl *ctrl = container_of(inode->i_cdev, struct nvme_ctrl, cdev);

  switch (ctrl->state) {
    case NVME_CTRL_LIVE:
    case NVME_CTRL_ADMIN_ONLY:
      break;
    default:
      return -EWOULDBLOCK;
  }

  file->private_data = ctrl;  // 先将private_data赋值为ctrl，便于之后使用
  return 0;
}

static long nvme_dev_ioctl(struct file *file, unsigned int cmd, unsigned long arg) {
  struct nvme_ctrl *ctrl = file->private_data; 
  void __user *argp = (void __user *)arg;

  switch (cmd) {
    case NVME_IOCTL_ADMIN_CMD:
      return nvme_user_cmd(ctrl, NULL, argp);
    case NVME_IOCTL_IO_CMD:
      return nvme_dev_user_cmd(ctrl, argp);
    case NVME_IOCTL_RESET:
      dev_warn(ctrl->device, "resetting controller\n");
      return nvme_reset_ctrl_sync(ctrl);
    case NVME_IOCTL_SUBSYS_RESET:
      return nvme_reset_subsystem(ctrl);
    case NVME_IOCTL_RESCAN:
      nvme_queue_scan(ctrl);
      return 0;
    default:
      return -ENOTTY;
  }
}

static const struct file_operations nvme_dev_fops = {
    .owner = THIS_MODULE,
    .open = nvme_dev_open,
    .unlocked_ioctl = nvme_dev_ioctl,
    .compat_ioctl = nvme_dev_ioctl,
};
```
之后深入的操作太头疼了，暂不分析

继续看nvme_probe函数
```c
nvme_reset_ctrl(&dev->ctrl);            // 重置控制器
nvme_get_ctrl(&dev->ctrl);              // 增加dev->ctrl->device引用计数
async_schedule(nvme_async_probe, dev);  // 等待任务完成再减小引用计数

int nvme_reset_ctrl(struct nvme_ctrl *ctrl) {
  if (!nvme_change_ctrl_state(ctrl, NVME_CTRL_RESETTING)) return -EBUSY;  // 修改crtl状态
  if (!queue_work(nvme_reset_wq, &ctrl->reset_work)) return -EBUSY;       // 调度reset_work
  return 0;
}


static void nvme_async_probe(void *data, async_cookie_t cookie) {
  struct nvme_dev *dev = data;
  // flush_work - wait for a work to finish executing the last queueing instance
  // 等待以下两个任务执行完成
  flush_work(&dev->ctrl.reset_work);
  flush_work(&dev->ctrl.scan_work);
  nvme_put_ctrl(&dev->ctrl);  // 减小dev->ctrl->device引用计数
}
```
可以看出距离初始化完毕至少还有两个work：reset_work，scan_work
```c
INIT_WORK(&dev->ctrl.reset_work, nvme_reset_work);
INIT_WORK(&ctrl->scan_work, nvme_scan_work);
```
#### nvme_reset_work

```cpp
static void nvme_reset_work(struct work_struct *work) {
  struct nvme_dev *dev = container_of(work, struct nvme_dev, ctrl.reset_work);
  bool was_suspend = !!(dev->ctrl.ctrl_config & NVME_CC_SHN_NORMAL);
  int result;
  enum nvme_ctrl_state new_state = NVME_CTRL_LIVE;

  /*
   * If we're called to reset a live controller first shut it down before
   * moving on.
   */
  // nvme_enable_ctrl： ctrl->ctrl_config |= NVME_CC_ENABLE;
  if (dev->ctrl.ctrl_config & NVME_CC_ENABLE) nvme_dev_disable(dev, false);  // 驱动初始化时NVME_CC_ENABLE并未置位，不进入该函数

  mutex_lock(&dev->shutdown_lock);
  result = nvme_pci_enable(dev);  // 使能PCI设备

  result = nvme_pci_configure_admin_queue(dev);  // 配置admin queue
```


#### nvme_pci_enable

```c
static int nvme_pci_enable(struct nvme_dev *dev) {
  int result = -ENOMEM;
  struct pci_dev *pdev = to_pci_dev(dev->dev);

  pci_enable_device_mem(pdev);  // 使能设备的内存空间

  pci_set_master(pdev);  // 设置PCI_COMMAND寄存器bus master位，使能DMA
  // 对dma_mask和coherent_dma_mask赋值
  if (dma_set_mask_and_coherent(dev->dev, DMA_BIT_MASK(64)) && dma_set_mask_and_coherent(dev->dev, DMA_BIT_MASK(32))) goto disable;

  if (readl(dev->bar + NVME_REG_CSTS) == -1) {  // 测试是否能读取BAR空间
    result = -ENODEV;
    goto disable;
  }

  /*
   * Some devices and/or platforms don't advertise or work with INTx
   * interrupts. Pre-enable a single MSIX or MSI vec for setup. We'll
   * adjust this later.
   */
  result = pci_alloc_irq_vectors(pdev, 1, 1, PCI_IRQ_ALL_TYPES);  // 请求中断向量

  dev->ctrl.cap = lo_hi_readq(dev->bar + NVME_REG_CAP);  // 读取CAP寄存器

  dev->q_depth = min_t(int, NVME_CAP_MQES(dev->ctrl.cap) + 1, io_queue_depth);  // 设置队列深度
  dev->db_stride = 1 << NVME_CAP_STRIDE(dev->ctrl.cap);                         // 设置DB寄存器步长，一般为1
  dev->dbs = dev->bar + 4096;                                                   // 设置DB寄存器内存映射起始地址

  nvme_map_cmb(dev);  // 映射CMB
  /*
  pci_enable_pcie_error_reporting enables the device to send error messages to root port when an error is detected.
  Note that devices don’t enable the error reporting by default, so device drivers need call this function to enable it.
  */
  pci_enable_pcie_error_reporting(pdev);
  /*
  The pci_save_state() and pci_restore_state() functions can be used by a device driver to save and restore standard PCI config registers.
  The pci_save_state() function must be invoked while the device has valid state before pci_restore_state() can be used.
  If the device is not in the fully-powered state (PCI_POWERSTATE_D0) when pci_restore_state() is  invoked,
  then the device will be transitioned to PCI_POWERSTATE_D0 before any config registers are restored.
  */
  pci_save_state(pdev);
  return 0;

disable:
  pci_disable_device(pdev);
  return result;
}
```
>pci_enable_device_mem

PCI/PCIE的BAR有两种类型，memory和IO。pci_enable_device_mem只初始化memory类型的BAR，pci_enable_device同时初始化memory和IO类型的BAR。如果要驱动的PCI/PCIE设备包含IO空间，那么必须使用pci_enable_device

```c
/**
 * pci_enable_device_mem - Initialize a device for use with Memory space
 * @dev: PCI device to be initialized
 *
 * Initialize device before it's used by a driver. Ask low-level code
 * to enable Memory resources. Wake up the device if it was suspended.
 * Beware, this function can fail.
 */
int pci_enable_device_mem(struct pci_dev *dev)
{
	return pci_enable_device_flags(dev, IORESOURCE_MEM);
}
/**
 * pci_enable_device - Initialize device before it's used by a driver.
 * @dev: PCI device to be initialized
 *
 * Initialize device before it's used by a driver. Ask low-level code
 * to enable I/O and memory. Wake up the device if it was suspended.
 * Beware, this function can fail.
 *
 * Note we don't actually enable the device many times if we call
 * this function repeatedly (we just increment the count).
 */
int pci_enable_device(struct pci_dev *dev)
{
	return pci_enable_device_flags(dev, IORESOURCE_MEM | IORESOURCE_IO);
}

Before touching any device registers, the driver needs to enable the PCI device by calling pci_enable_device(). 
This will:
1 wake up the device if it was in suspended state,
2 allocate I/O and memory regions of the device (if BIOS did not),
3 allocate an IRQ (if BIOS did not).
```
>dma_set_mask_and_coherent

函数dma_set_mask_and_coherent()用于对dma_mask和coherent_dma_mask赋值。

dma_mask表示的是该设备通过DMA方式可寻址的物理地址范围，coherent_dma_mask表示所有设备通过DMA方式可寻址的公共的物理地址范围，因为不是所有的硬件设备都能够支持64bit的地址宽度。
```c
/*
 * Set both the DMA mask and the coherent DMA mask to the same thing.
 * Note that we don't check the return value from dma_set_coherent_mask()
 * as the DMA API guarantees that the coherent DMA mask can be set to
 * the same or smaller than the streaming DMA mask.
 */
static inline int dma_set_mask_and_coherent(struct device *dev, u64 mask)
{
	int rc = dma_set_mask(dev, mask);
	if (rc == 0)
		dma_set_coherent_mask(dev, mask);
	return rc;
}
```
>pci_alloc_irq_vectors

传统中断在系统初始化扫描PCI bus tree时就已自动为设备分配好中断号, 但是如果设备需要使用MSI，驱动需要进行一些额外的配置。linux内核提供pci_alloc_irq_vectors来进行MSI/MSI-X capablity的初始化配置以及中断号分配。

```c
/**
 * pci_alloc_irq_vectors() - Allocate multiple device interrupt vectors
 * @dev:      the PCI device to operate on
 * @min_vecs: minimum required number of vectors (must be >= 1)
 * @max_vecs: maximum desired number of vectors
 * @flags:    One or more of:
 *
 *            * %PCI_IRQ_MSIX      Allow trying MSI-X vector allocations
 *            * %PCI_IRQ_MSI       Allow trying MSI vector allocations
 *
 *            * %PCI_IRQ_LEGACY    Allow trying legacy INTx interrupts, if
 *              and only if @min_vecs == 1
 *
 *            * %PCI_IRQ_AFFINITY  Auto-manage IRQs affinity by spreading
 *              the vectors around available CPUs
 *
 * Allocate up to @max_vecs interrupt vectors on device. MSI-X irq
 * vector allocation has a higher precedence over plain MSI, which has a
 * higher precedence over legacy INTx emulation.
 *
 * Upon a successful allocation, the caller should use pci_irq_vector()
 * to get the Linux IRQ number to be passed to request_threaded_irq().
 * The driver must call pci_free_irq_vectors() on cleanup.
 *
 * Return: number of allocated vectors (which might be smaller than
 * @max_vecs), -ENOSPC if less than @min_vecs interrupt vectors are
 * available, other errnos otherwise.
 */
int pci_alloc_irq_vectors(struct pci_dev *dev, unsigned int min_vecs,
			  unsigned int max_vecs, unsigned int flags)
{
	return pci_alloc_irq_vectors_affinity(dev, min_vecs, max_vecs,
					      flags, NULL);
}
```
>小端数据读写
```c
static inline __u64 lo_hi_readq(const volatile void __iomem *addr)
{
	const volatile u32 __iomem *p = addr;
	u32 low, high;

	low = readl(p);
	high = readl(p + 1);

	return low + ((u64)high << 32);
}

static inline void lo_hi_writeq(__u64 val, volatile void __iomem *addr)
{
	writel(val, addr);
	writel(val >> 32, addr + 4);
}
```
接下来看nvme_pci_enable函数中的nvme_map_cmb

```c
static void nvme_map_cmb(struct nvme_dev *dev) {
  u64 size, offset;
  resource_size_t bar_size;
  struct pci_dev *pdev = to_pci_dev(dev->dev);
  int bar;

  if (dev->cmb_size) return;  // 已经映射过，直接退出

  dev->cmbsz = readl(dev->bar + NVME_REG_CMBSZ);  // 读取控制器内存大小
  if (!dev->cmbsz) return;
  dev->cmbloc = readl(dev->bar + NVME_REG_CMBLOC);  // 读取控制器内存位置

  if (!use_cmb_sqes) return;
  // 设置CMB映射的起始地址与大小
  size = nvme_cmb_size_unit(dev) * nvme_cmb_size(dev);
  offset = nvme_cmb_size_unit(dev) * NVME_CMB_OFST(dev->cmbloc);
  bar = NVME_CMB_BIR(dev->cmbloc);
  bar_size = pci_resource_len(pdev, bar);

  if (offset > bar_size) return;

  /*
   * Controllers may support a CMB size larger than their BAR,
   * for example, due to being behind a bridge. Reduce the CMB to
   * the reported size of the BAR
   */
  if (size > bar_size - offset) size = bar_size - offset;
  dev->cmb = ioremap_wc(pci_resource_start(pdev, bar) + offset, size);  // 进行虚拟地址-总线地址映射
  if (!dev->cmb) return;
  dev->cmb_bus_addr = pci_bus_address(pdev, bar) + offset;  // 设置CMB总线地址
  dev->cmb_size = size;
  /**
   * sysfs_add_file_to_group - add an attribute file to a pre-existing group.
   * @kobj: object we're acting for.
   * @attr: attribute descriptor.
   * @group: group name.
   */
  // 将一个属性attr加入kobj目录下已存在的的属性集合group
  sysfs_add_file_to_group(&dev->ctrl.device->kobj, &dev_attr_cmb.attr, NULL);
}
```
>CMB

但是如果CPU将整条指令而不是指针直接写到SSD端的DRAM的话，并不耗费太多资源，此时能够节省一次PCIE往返及一次SSD控制器内部的中断处理。于是，人们就想将SSD控制器上的一小段DRAM空间映射到host物理地址空间从而可以让驱动直接写指令进去，甚至写一些数据进去也是可以的。这块被映射到host物理地址空间的DRAM空间便被称为CMB了
>ioremap_wc

```c
/*
/*
* ioremap() and friends.
*
* ioremap() takes a resource address, and size.  Due to the ARM memory
* types, it is important to use the correct ioremap() function as each
* mapping has specific properties.
*
* Function		Memory type	Cacheability	Cache hint
* ioremap()		Device		n/a		n/a
* ioremap_cache()	Normal		Writeback	Read allocate
* ioremap_wc()		Normal		Non-cacheable	n/a
* ioremap_wt()		Normal		Non-cacheable	n/a
*
* All device mappings have the following properties:
* - no access speculation
* - no repetition (eg, on return from an exception)
* - number, order and size of accesses are maintained
* - unaligned accesses are "unpredictable"
* - writes may be delayed before they hit the endpoint device
*
* All normal memory mappings have the following properties:
* - reads can be repeated with no side effects
* - repeated reads return the last value written
* - reads can fetch additional locations without side effects
* - writes can be repeated (in certain cases) with no side effects
* - writes can be merged before accessing the target
* - unaligned accesses can be supported
* - ordering is not guaranteed without explicit dependencies or barrier
*   instructions
* - writes may be delayed before they hit the endpoint memory
*
* The cache hint is only a performance hint: CPUs may alias these hints.
* Eg, a CPU not implementing read allocate but implementing write allocate
* will provide a write allocate mapping instead.
*/
/**
* ioremap_wc	-	map memory into CPU space write combined
* @phys_addr:	bus address of the memory
* @size:	size of the resource to map
*
* This version of ioremap ensures that the memory is marked write combining.
* Write combining allows faster writes to some hardware devices.
*
* Must be freed with iounmap.
*/
void __iomem *ioremap_wc(resource_size_t phys_addr, unsigned long size)
{
	return __ioremap_caller(phys_addr, size, _PAGE_CACHE_MODE_WC,
					__builtin_return_address(0), false);
}
```
#### nvme_pci_configure_admin_queue

```c
static int nvme_pci_configure_admin_queue(struct nvme_dev *dev) {
  int result;
  u32 aqa;
  struct nvme_queue *nvmeq;

  result = nvme_remap_bar(dev, db_bar_size(dev, 0));  // 重映射BAR空间（之前已映射，大概率直接返回）

  dev->subsystem = readl(dev->bar + NVME_REG_VS) >= NVME_VS(1, 1, 0) ? NVME_CAP_NSSRC(dev->ctrl.cap) : 0;  // NVM Subsystem Reset Supported

  if (dev->subsystem && (readl(dev->bar + NVME_REG_CSTS) & NVME_CSTS_NSSRO)) writel(NVME_CSTS_NSSRO, dev->bar + NVME_REG_CSTS);  // NVM Subsystem Reset Occurred

  result = nvme_disable_ctrl(&dev->ctrl, dev->ctrl.cap);  //  重置控制器

  result = nvme_alloc_queue(dev, 0, NVME_AQ_DEPTH);  // 为admin queue分配空间

  nvmeq = &dev->queues[0];
  aqa = nvmeq->q_depth - 1;
  aqa |= aqa << 16;

  writel(aqa, dev->bar + NVME_REG_AQA);  // 同时设置admin SQ队列深度与CQ队列深度
  // 设置admin SQ/CQ基址
  lo_hi_writeq(nvmeq->sq_dma_addr, dev->bar + NVME_REG_ASQ);
  lo_hi_writeq(nvmeq->cq_dma_addr, dev->bar + NVME_REG_ACQ);

  result = nvme_enable_ctrl(&dev->ctrl, dev->ctrl.cap);  // 使能控制器

  nvmeq->cq_vector = 0;
  nvme_init_queue(nvmeq, 0); // 初始化admin queue
```
nvme_disable_ctrl与nvme_enable_ctrl

```c
int nvme_disable_ctrl(struct nvme_ctrl *ctrl, u64 cap) {
  int ret;

  ctrl->ctrl_config &= ~NVME_CC_SHN_MASK;
  ctrl->ctrl_config &= ~NVME_CC_ENABLE;
  // 将Controller Configuration寄存器Enable,Shutdown Notification位重置
  ret = ctrl->ops->reg_write32(ctrl, NVME_REG_CC, ctrl->ctrl_config);  

  return nvme_wait_ready(ctrl, cap, false);  // 等待状态设置完毕
}

int nvme_enable_ctrl(struct nvme_ctrl *ctrl, u64 cap) {
  /*
   * Default to a 4K page size, with the intention to update this
   * path in the future to accomodate architectures with differing
   * kernel and IO page sizes.
   */
  unsigned dev_page_min = NVME_CAP_MPSMIN(cap) + 12, page_shift = 12;
  int ret;

  if (page_shift < dev_page_min) {
    dev_err(ctrl->device, "Minimum device page size %u too large for host (%u)\n", 1 << dev_page_min, 1 << page_shift);
    return -ENODEV;
  }

  ctrl->page_size = 1 << page_shift;

  ctrl->ctrl_config = NVME_CC_CSS_NVM;                          // I/O Command Set Selected设置为NVM Command Set
  ctrl->ctrl_config |= (page_shift - 12) << NVME_CC_MPS_SHIFT;  // 设置Memory Page Size寄存器
  ctrl->ctrl_config |= NVME_CC_AMS_RR | NVME_CC_SHN_NONE;       // Arbitration Mechanism Selected 设置为Round Robin，Shutdown Notification设置为No notification; no effect
  ctrl->ctrl_config |= NVME_CC_IOSQES | NVME_CC_IOCQES;         // 设置SQ为64字节，CQ为16字节
  ctrl->ctrl_config |= NVME_CC_ENABLE;                          // 置位ENABLE位

  ret = ctrl->ops->reg_write32(ctrl, NVME_REG_CC, ctrl->ctrl_config);  // 写入Controller Configuration寄存器
  return nvme_wait_ready(ctrl, cap, true);                             // 等待状态设置完毕
}

static int nvme_wait_ready(struct nvme_ctrl *ctrl, u64 cap, bool enabled) {
  unsigned long timeout = ((NVME_CAP_TIMEOUT(cap) + 1) * HZ / 2) + jiffies;  // 设置超时时间
  u32 csts, bit = enabled ? NVME_CSTS_RDY : 0;                               // 预期值与CC.EN保持一致
  int ret;

  while ((ret = ctrl->ops->reg_read32(ctrl, NVME_REG_CSTS, &csts)) == 0) {  // 读取Controller Status寄存器
    if (csts == ~0) return -ENODEV;                                         // 全F，出现错误
    if ((csts & NVME_CSTS_RDY) == bit) break;                               // 读到预期值，跳出循环

    msleep(100);
    if (fatal_signal_pending(current)) return -EINTR;
    if (time_after(jiffies, timeout)) {  // 等待状态超时，返回错误
      dev_err(ctrl->device, "Device not ready; aborting %s\n", enabled ? "initialisation" : "reset");
      return -ENODEV;
    }
  }

  return ret;
}
```
其中CC.EN与CSTS.RDY的相关描述如下：
![](https://img-blog.csdnimg.cn/34987e7f18924c63afe70e003e0203e5.png)
![](https://img-blog.csdnimg.cn/ed7c8032112b466b891c08bd66509d65.png)
然后是nvme_alloc_queue与nvme_init_queue
```c
#define SQ_SIZE(depth) (depth * sizeof(struct nvme_command))
#define CQ_SIZE(depth) (depth * sizeof(struct nvme_completion))

static int nvme_alloc_sq_cmds(struct nvme_dev *dev, struct nvme_queue *nvmeq, int qid, int depth) {
  /* CMB SQEs will be mapped before creation */
  if (qid && dev->cmb && use_cmb_sqes && (dev->cmbsz & NVME_CMBSZ_SQS)) return 0;                  // 使用CMB
  nvmeq->sq_cmds = dma_alloc_coherent(dev->dev, SQ_SIZE(depth), &nvmeq->sq_dma_addr, GFP_KERNEL);  // 为SQ创建DMA缓冲区
  return 0;
}

static int nvme_alloc_queue(struct nvme_dev *dev, int qid, int depth) {
  struct nvme_queue *nvmeq = &dev->queues[qid];

  if (dev->ctrl.queue_count > qid) return 0;  // 已经为该队列分配空间

  nvmeq->cqes = dma_zalloc_coherent(dev->dev, CQ_SIZE(depth), &nvmeq->cq_dma_addr, GFP_KERNEL);  // 为CQ创建DMA缓冲区

  nvme_alloc_sq_cmds(dev, nvmeq, qid, depth);  // 如果不使用CMB，为SQ创建DMA缓冲区
  // 初始化nvme_queue结构体成员
  nvmeq->q_dmadev = dev->dev;
  nvmeq->dev = dev;
  spin_lock_init(&nvmeq->sq_lock);
  spin_lock_init(&nvmeq->cq_lock);
  nvmeq->cq_head = 0;
  nvmeq->cq_phase = 1;
  nvmeq->q_db = &dev->dbs[qid * 2 * dev->db_stride];
  nvmeq->q_depth = depth;
  nvmeq->qid = qid;
  nvmeq->cq_vector = -1;
  // 队列数量加一
  dev->ctrl.queue_count++;

  return 0;
}

static void nvme_init_queue(struct nvme_queue *nvmeq, u16 qid) {
  struct nvme_dev *dev = nvmeq->dev;

  spin_lock_irq(&nvmeq->cq_lock);
  nvmeq->sq_tail = 0;
  nvmeq->cq_head = 0;
  nvmeq->cq_phase = 1;
  nvmeq->q_db = &dev->dbs[qid * 2 * dev->db_stride];
  memset((void *)nvmeq->cqes, 0, CQ_SIZE(nvmeq->q_depth));
  nvme_dbbuf_init(dev, nvmeq, qid);
  dev->online_queues++;
  spin_unlock_irq(&nvmeq->cq_lock);
}
```
关于dbbuf

```c
// 分配空间
NVME_CTRL_OACS_DBBUF_SUPP = 1 << 8

if (dev->ctrl.oacs & NVME_CTRL_OACS_DBBUF_SUPP) {
  result = nvme_dbbuf_dma_alloc(dev);
  if (result) dev_warn(dev->dev, "unable to allocate dma for dbbuf\n");
}

static int nvme_dbbuf_dma_alloc(struct nvme_dev *dev) {
  unsigned int mem_size = nvme_dbbuf_size(dev->db_stride);

  if (dev->dbbuf_dbs) return 0;

  dev->dbbuf_dbs = dma_alloc_coherent(dev->dev, mem_size, &dev->dbbuf_dbs_dma_addr, GFP_KERNEL);
  if (!dev->dbbuf_dbs) return -ENOMEM;
  dev->dbbuf_eis = dma_alloc_coherent(dev->dev, mem_size, &dev->dbbuf_eis_dma_addr, GFP_KERNEL);
  if (!dev->dbbuf_eis) {
    dma_free_coherent(dev->dev, mem_size, dev->dbbuf_dbs, dev->dbbuf_dbs_dma_addr);
    dev->dbbuf_dbs = NULL;
    return -ENOMEM;
  }

  return 0;
}
// 初始化
static void nvme_dbbuf_init(struct nvme_dev *dev, struct nvme_queue *nvmeq, int qid) {
  if (!dev->dbbuf_dbs || !qid) return;  // 若未创建dbbuf或qid为0（admin queue），直接返回

  nvmeq->dbbuf_sq_db = &dev->dbbuf_dbs[sq_idx(qid, dev->db_stride)];
  nvmeq->dbbuf_cq_db = &dev->dbbuf_dbs[cq_idx(qid, dev->db_stride)];
  nvmeq->dbbuf_sq_ei = &dev->dbbuf_eis[sq_idx(qid, dev->db_stride)];
  nvmeq->dbbuf_cq_ei = &dev->dbbuf_eis[cq_idx(qid, dev->db_stride)];
}
```
![](https://img-blog.csdnimg.cn/4137d833e46f4f1ebb9fdc94d547f909.png)
本文并不分析 Doorbell Buffer Config command的部分，当作不支持该命令


#### 终点

## 其他
### 请求超时相关代码

```c
// tagset赋值过程
1493  		dev->admin_tagset.ops = &nvme_mq_admin_ops;
1494  		dev->admin_tagset.nr_hw_queues = 1;
1495  
1496  		dev->admin_tagset.queue_depth = NVME_AQ_MQ_TAG_DEPTH;
1497  		dev->admin_tagset.timeout = ADMIN_TIMEOUT;
1498  		dev->admin_tagset.numa_node = dev_to_node(dev->dev);
1499  		dev->admin_tagset.cmd_size = nvme_pci_cmd_size(dev, false);
1500  		dev->admin_tagset.flags = BLK_MQ_F_NO_SCHED;
1501  		dev->admin_tagset.driver_data = dev;


2035  		dev->tagset.ops = &nvme_mq_ops;
2036  		dev->tagset.nr_hw_queues = dev->online_queues - 1;
2037  		dev->tagset.timeout = NVME_IO_TIMEOUT;
2038  		dev->tagset.numa_node = dev_to_node(dev->dev);
2039  		dev->tagset.queue_depth = min_t(int, dev->q_depth, BLK_MQ_MAX_DEPTH) - 1;
2041  		dev->tagset.cmd_size = nvme_pci_cmd_size(dev, false);
2046  		dev->tagset.flags = BLK_MQ_F_SHOULD_MERGE;
2047  		dev->tagset.driver_data = dev;

// timeout 相关变量
40  unsigned int admin_timeout = 60;
41  module_param(admin_timeout, uint, 0644);
42  MODULE_PARM_DESC(admin_timeout, "timeout in seconds for admin commands");
43  EXPORT_SYMBOL_GPL(admin_timeout);
44  
45  unsigned int nvme_io_timeout = 30;
46  module_param_named(io_timeout, nvme_io_timeout, uint, 0644);
47  MODULE_PARM_DESC(io_timeout, "timeout in seconds for I/O");
48  EXPORT_SYMBOL_GPL(nvme_io_timeout);

27  extern unsigned int nvme_io_timeout;
28  #define NVME_IO_TIMEOUT	(nvme_io_timeout * HZ)
29  
30  extern unsigned int admin_timeout;
31  #define ADMIN_TIMEOUT	(admin_timeout * HZ)

// 超时函数
enum blk_eh_timer_return {
	BLK_EH_DONE,		/* drivers has completed the command */
	BLK_EH_RESET_TIMER,	/* reset timer and try again */
};
typedef enum blk_eh_timer_return (timeout_fn)(struct request *, bool);

struct blk_mq_ops {
	/*
	 * Queue request
	 */
	queue_rq_fn		*queue_rq;

	/*
	 * Called on request timeout
	 */
	timeout_fn		*timeout;

	/*
	 * Called to poll for completion of a specific tag.
	 */
	poll_fn			*poll;

	softirq_done_fn		*complete;
};

// 超时函数的赋值与调用
1457  static const struct blk_mq_ops nvme_mq_admin_ops = {
1458  	.queue_rq	= nvme_queue_rq,
1459  	.complete	= nvme_pci_complete_rq,
1460  	.init_hctx	= nvme_admin_init_hctx,
1461  	.exit_hctx      = nvme_admin_exit_hctx,
1462  	.init_request	= nvme_init_request,
1463  	.timeout	= nvme_timeout,
1464  };
1465  
1466  static const struct blk_mq_ops nvme_mq_ops = {
1467  	.queue_rq	= nvme_queue_rq,
1468  	.complete	= nvme_pci_complete_rq,
1469  	.init_hctx	= nvme_init_hctx,
1470  	.init_request	= nvme_init_request,
1471  	.map_queues	= nvme_pci_map_queues,
1472  	.timeout	= nvme_timeout,
1473  	.poll		= nvme_poll,
1474  };

1128  static enum blk_eh_timer_return nvme_timeout(struct request *req, bool reserved)
1129  {
1130  	struct nvme_iod *iod = blk_mq_rq_to_pdu(req);
1131  	struct nvme_queue *nvmeq = iod->nvmeq;
1132  	struct nvme_dev *dev = nvmeq->dev;
1133  	struct request *abort_req;
1134  	struct nvme_command cmd;
1135  	bool shutdown = false;
1136  	u32 csts = readl(dev->bar + NVME_REG_CSTS);
1137  
1138  	/* If PCI error recovery process is happening, we cannot reset or
1139  	 * the recovery mechanism will surely fail.
1140  	 */
1141  	mb();
1142  	if (pci_channel_offline(to_pci_dev(dev->dev)))
1143  		return BLK_EH_RESET_TIMER;
1144  
1145  	/*
1146  	 * Reset immediately if the controller is failed
1147  	 */
1148  	if (nvme_should_reset(dev, csts)) {
1149  		nvme_warn_reset(dev, csts);
1150  		nvme_dev_disable(dev, false);
1151  		nvme_reset_ctrl(&dev->ctrl);
1152  		return BLK_EH_DONE;
1153  	}
1154  
1155  	/*
1156  	 * Did we miss an interrupt?
1157  	 */
1158  	if (__nvme_poll(nvmeq, req->tag)) {
1159  		dev_warn(dev->ctrl.device,
1160  			 "I/O %d QID %d timeout, completion polled\n",
1161  			 req->tag, nvmeq->qid);
1162  		return BLK_EH_DONE;
1163  	}
// 省略大部分代码
1234  }

// 若未设置超时时间，则赋值为默认值30s
blk_mq_init_queue
	blk_mq_init_allocated_queue
			INIT_WORK(&q->timeout_work, blk_mq_timeout_work);  // 初始化工作项
			blk_queue_rq_timeout(q, set->timeout ? set->timeout : 30 * HZ);	  // 设置请求超时时间


// 检查请求是否超时并调用相应超时函数
blk_mq_timeout_work
	blk_mq_check_expired
		blk_mq_rq_timed_out  
		 
static void blk_mq_rq_timed_out(struct request *req, bool reserved)
{
	req->rq_flags |= RQF_TIMED_OUT;
	if (req->q->mq_ops->timeout) {
		enum blk_eh_timer_return ret;

		ret = req->q->mq_ops->timeout(req, reserved);
		if (ret == BLK_EH_DONE)
			return;
		WARN_ON_ONCE(ret != BLK_EH_RESET_TIMER);
	}

	blk_add_timer(req);
}
```


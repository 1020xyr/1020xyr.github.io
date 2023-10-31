---
title: NVMe驱动学习记录-2
date: 2022-05-12 16:34:08
tags: 学习 linux 驱动开发
categories: 
- [内核驱动开发记录]
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
---
<meta name="referrer" content="no-referrer" />


# 参考

源码地址：[https://mirrors.tuna.tsinghua.edu.cn/kernel/v4.x/linux-4.19.90.tar.gz](https://mirrors.tuna.tsinghua.edu.cn/kernel/v4.x/linux-4.19.90.tar.gz)    

> linux-4.19.90\drivers\nvme\host

源码阅读环境：[Windows 搭建 opengrok|极客教程 (geek-docs.com)](https://geek-docs.com/personal/obama/windows-setup-opengrok.html)

书籍：[《LINUX设备驱动程序》](https://github.com/1020xyr/books/blob/main/LINUX%E8%AE%BE%E5%A4%87%E9%A9%B1%E5%8A%A8%E7%A8%8B%E5%BA%8F(%E7%AC%AC3%E7%89%88).pdf)

初始化参考链接：[linux里的nvme驱动代码分析（加载初始化） ](https://blog.csdn.net/panzhenjie/article/details/51581063) nvme_reset_work()函数后的代码大致相同

IO入口点：[NVMe的Linux内核驱动分析](https://zhuanlan.zhihu.com/p/72234187)

块设备层相关数据结构：[Block multi-queue 架构解析（一）数据结构](https://blog.csdn.net/qq_32740107/article/details/106302376?spm=1001.2014.3001.5501)

块设备层文档：[Block Device Drivers](https://linux-kernel-labs.github.io/refs/heads/master/labs/block_device_drivers.html#block-device-drivers)

[linux内核源码分析 - nvme设备的初始化](https://www.cnblogs.com/tolimit/p/8779876.html)



函数查询：[identifier - Linux source code (v5.14.9) - Bootlin](https://elixir.bootlin.com/linux/latest/ident)

![preview](https://img-blog.csdnimg.cn/img_convert/4ecd7c7deba418d2d5ceba1203f15d13.png)

其他博客

[手把手教Linux驱动](https://blog.csdn.net/daocaokafei/article/details/108071589)

[linux驱动开发](https://www.cnblogs.com/xiaojiang1025/category/918665.html?page=2)

[nvme kernel driver 阅读笔记](https://www.dazhuanlan.com/karenchan/topics/1006006)

[nvme协议详解](https://www.zhihu.com/column/c_1338070478725480449)

# 源代码

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

## 不了解的函数/概念

```c
一个模块mod1中定义一个函数func1；在另外一个模块mod2中定义一个函数func2，func2调用func1。
在模块mod1中，EXPORT_SYMBOL(func1);
在模块mod2中，extern int func1();
就可以在mod2中调用func1了。
```



[workqueue](https://www.cnblogs.com/vedic/p/11069249.html)

workqueue是对内核线程封装的用于处理各种工作项的一种处理方法， 由于处理对象是用链表拼接一个个工作项， 依次取出来处理， 然后从链表删除，就像一个队列排好队依次处理一样， 所以也称工作队列

所谓封装可以简单理解一个中转站， 一边指向“合适”的内核线程， 一边接受你丢过来的工作项， 用结构体 workqueue_srtuct表示， 而所谓工作项也是个结构体 --  work_struct， 里面有个成员指针， 指向你最终要实现的函数

```c
struct workqueue_struct *workqueue_test;

struct work_struct work_test;

void work_test_func(struct work_struct *work)
{
    printk("%s()\n", __func__);

    //mdelay(1000);
    //queue_work(workqueue_test, &work_test);
}


static int test_init(void)
{
    printk("Hello,world!\n");

    /* 1. 自己创建一个workqueue， 中间参数为0，默认配置 */
    workqueue_test = alloc_workqueue("workqueue_test", 0, 0);

    /* 2. 初始化一个工作项，并添加自己实现的函数 */
    INIT_WORK(&work_test, work_test_func);

    /* 3. 将自己的工作项添加到指定的工作队列去， 同时唤醒相应线程处理 */
    queue_work(workqueue_test, &work_test);
    
    return 0;
}
```

> alloc_chrdev_region

alloc_chrdev_region是让内核分配给我们一个尚未使用的主设备号，不是由我们自己指定的，该函数的四个参数意义如下：

dev :alloc_chrdev_region函数向内核申请下来的设备号

baseminor :次设备号的起始

count: 申请次设备号的个数

name :执行 cat /proc/devices显示的名称



> class_create

内核中定义了struct class结构体，一个struct class 结构体类型变量对应一个类，内核同时提供了 class_create () 函数 ，可以用它来创建一个类，这个类存放于sysfs下面，一旦创建了这个类，再调用device_create () 函数 在/dev目录下创建相应的设备节点（/sys/class/类名/设备名）



[struct device](https://www.cnblogs.com/Cqlismy/p/11507216.html)

Linux内核中的设备驱动模型，是建立在sysfs设备文件系统和kobject上的，由总线（bus）、设备（device）、驱动（driver）和类（class）所组成的关系结构，在底层，Linux系统中的每个设备都有一个device结构体的实例

dev_to_node：返回struct device中的numa_node变量，即所属的内存节点

```c
struct device {
#ifdef CONFIG_NUMA
	int		numa_node;	/* NUMA node this device is close to */
#endif
}

static inline int dev_to_node(struct device *dev)
{
	return dev->numa_node;
}
```

kzalloc_node：从特定的内存节点分配零内存

```c
/**
 * kzalloc_node - allocate zeroed memory from a particular memory node.
 * @size: how many bytes of memory are required.
 * @flags: the type of memory to allocate (see kmalloc).
 * @node: memory node from which to allocate
 */
static inline void *kzalloc_node(size_t size, gfp_t flags, int node)
{
	return kmalloc_node(size, flags | __GFP_ZERO, node);
}
```

[kcalloc_node](https://developer.aliyun.com/article/596648)

驱动中的队列，通过函数kcalloc_node创建，可以看到队列数量是和系统中所拥有的cpu数量有关。

```c
dev->queues = kcalloc_node(num_possible_cpus() + 1,sizeof(struct nvme_queue), GFP_KERNEL, node);
```

Queue有的概念，那就是队列深度,表示其能够放多少个成员。在NVMe中，这个队列深度是由NVMe SSD决定的，存储在NVMe设备的BAR空间里。

队列用来存放NVMe Command，NVMe Command是主机与SSD控制器交流的基本单元，应用的I/O请求也要转化成NVMe Command。

不过需要注意的是，就算有很多CPU发送请求，但是块层并不能保证都能处理完，将来可能要绕过IO栈的块层，不然瓶颈就是操作系统本身了。

当前Linux内核提供了blk_queue_make_request函数，调用这个函数注册自定义的队列处理方法，可以绕过io调度和io队列，从而缩短io延时。Block层收到上层发送的IO请求，就会选择该方法处理



[get_device](https://deepinout.com/linux-kernel-api/device-driver-and-device-management/linux-kernel-api-get_device.html)

```c
struct device *get_device(struct device *dev)
```

get_device输入参数说明   
函数get_device()的输入参数是struct device结构体类型的指针，代表增加计数的逻辑设备
get_device返回参数说明
函数get_device()的返回结果是struct device结构体类型的变量，返回的结果与传入的参数代表的是同一个变量，只是此时变量的引用计数器的值增大了1。



> pci_set_drvdata

pci_set_drvdata() 为pci_dev设置私有数据指针,把设备指针地址放入PCI设备中的设备指针中，便于后面调用pci_get_drvdata

```c
static inline void pci_set_drvdata(struct pci_dev *pdev, void *data)
{
	dev_set_drvdata(&pdev->dev, data);
}
static inline void dev_set_drvdata(struct device *dev, void *data)
{
	dev->driver_data = data;
}
```





> to_pci_dev

```c
dev->dev = get_device(&pdev->dev);
struct pci_dev *pdev = to_pci_dev(dev->dev);
```

to_pci_dev应该是对container_of宏的封装，根据成员地址获得结构体地址。



[pci_request_mem_regions](https://blog.csdn.net/skyflying2012/article/details/8672011)

pci_request_mem_regions应该是对request_mem_region的封装，

几乎每一种外设都是通过读写设备上的寄存器来进行的，通常包括控制寄存器、状态寄存器和数据寄存器三大类，外设的寄存器通常被连续地编址。根据CPU体系结构的不同，CPU对IO端口的编址方式有两种：


　　（1）I/O映射方式（I/O-mapped）

　　典型地，如X86处理器为外设专门实现了一个单独的地址空间，称为"I/O地址空间"或者"I/O端口空间"，CPU通过专门的I/O指令（如X86的IN和OUT指令）来访问这一空间中的地址单元。

　　（2）内存映射方式（Memory-mapped）

　　RISC指令系统的CPU（如MIPS ARM PowerPC等）通常只实现一个物理地址空间，像这种情况,外设的I/O端口的物理地址就被映射到内存地址空间中，外设I/O端口成为内存的一部分。此时，CPU可以象访问一个内存单元那样访问外设I/O端口，而不需要设立专门的外设I/O指令。


　　但是，这两者在硬件实现上的差异对于软件来说是完全透明的，驱动程序开发人员可以将内存映射方式的I/O端口和外设内存统一看作是"I/O内存"资源。


　　一般来说，在系统运行时，外设的I/O内存资源的物理地址是已知的，由硬件的设计决定。但是CPU通常并没有为这些已知的外设I/O内存资源的物理地址预定义虚拟地址范围，驱动程序并不能直接通过物理地址访问I/O内存资源，而必须将它们映射到核心虚地址空间内（通过页表），然后才能根据映射所得到的核心虚地址范围，通过访内指令访问这些I/O内存资源。Linux在io.h头文件中声明了函数ioremap（），用来将I/O内存资源的物理地址映射到核心虚地址空间。

但要使用I/O内存首先要申请,然后才能映射,使用I/O端口首先要申请,或者叫请求,对于I/O端口的请求意思是让内核知道你要访问这个端口,这样内核知道了以后它就不会再让别人也访问这个端口了.毕竟这个世界僧多粥少啊.申请I/O端口的函数是request_region, 申请I/O内存的函数是request_mem_region， 来自include/linux/ioport.h

说白了，request_mem_region函数并没有做实际性的映射工作，只是告诉内核要使用一块内存地址，声明占有，也方便内核管理这些资源。

重要的还是ioremap函数，ioremap主要是检查传入地址的合法性，建立页表（包括访问权限），完成物理地址到虚拟地址的转换。

```c
void * ioremap(unsigned long phys_addr, unsigned long size, unsigned long flags);

iounmap函数用于取消ioremap（）所做的映射，原型如下：

void iounmap(void * addr);
```

在将I/O内存资源的物理地址映射成核心虚地址后，理论上讲我们就可以像读写RAM那样直接读写I/O内存资源了。为了保证驱动程序的跨平台的可移植性，我们应该使用Linux中特定的函数来访问I/O内存资源，而不应该通过指向核心虚地址的指针来访问。





[pci_resource_start](https://bbs.csdn.net/topics/390998915)

```c
#define pci_resource_start(dev,bar) ((dev)->resource[(bar)].start)
```



在硬件加电初始化时，BIOS固件同统一检查了所有的PCI设备， 并统一为他们分配了一个和其他互不冲突的地址，让他们的驱动程序可以向这些地址映射他们的寄存器，这些地址被BIOS写进了各个设备的配置空间，因为这个 活动是一个PCI的标准的活动，所以自然写到各个设备的配置空间里而不是他们风格各异的控制寄存器空间里。当然只有BIOS可以访问配置空间。当操作系统 初始化时，他为每个PCI设备分配了pci_dev结构，并且把BIOS获得的并写到了配置空间中的地址读出来写到了pci_dev中的resource 字段中。这样以后我们在读这些地址就不需要在访问配置空间了，直接跟pci_dev要就可以了，我们这里的四个函数就是直接从pci_dev读出了相关数 据，代码在include/linux/pci.h中。定义如下：

\#define pci_resource_start(dev,bar) ((dev)->resource[(bar)].start)
\#define pci_resource_end(dev,bar) ((dev)->resource[(bar)].end)

这里需要说明一下，每个PCI设备有0-5一共6个地址空间，我们通常只使用前两个，这里我们把参数1传给了bar就是使用内存映射的地址空间。

如果要更具体，查看pci_dev结构的初始化过程

调用pci_resource_flags函数来判断PCI是内存映射模式，还是IO模式

调用pci_resource_len函数来判断内存空间是否小于设备所需要的内存空间，如果小于，明显出错



[init_completion](https://www.linuxidc.com/Linux/2011-10/44625p3.htm)

首先是struct completion的结构，由一个计数值和一个等待队列组成。

1、unsigned int done;

指示等待的事件是否完成。初始化时为0。如果为0，则表示等待的事件未完成。大于0表示等待的事件已经完成。

2、wait_queue_head_t wait;

存放等待该事件完成的进程队列

completion是类似于信号量的东西，用completion.done来表示资源是否可用，获取不到的线程会阻塞在completion.wait的等待队列上，直到其它线程释放completion



[物理地址、虚拟地址、总线地址](https://blog.csdn.net/renlonggg/article/details/82684407)

所有的地址都可以称为总线地址，因为开发环境下所有的设备都是接在总线上，如AXI总线，APB总线，PCI总线 I2C总线 SPI总线。也就会存在很多种地址空间。

大部分情况下，总线地址=物理地址，为什么呢，物理地址是处理器在该系统总线上发出的地址，因此处理器发出的物理地址完全可以理解为处理器地址空间的总线地址，这肯定是相等的。

大部分程序操作都是处理器作为主设备，根据指令，来发出地址，读写数据。这时总线地址=物理地址

有一种情况下不是处理器做主设备，DMA，DMA controller操作RAM是不需要经过处理器的，这是DMA controller是主设备，但是因为DMA controller也是挂接在系统总线上，也就是处理器的地址空间中。

所以这时DMA controller发出的地址也是物理地址。

**有一种特殊情况下，总线地址与物理地址不同，就是PCI总线。**

因为PCI总线存在地址映射，这是因为PCI控制器内部有桥接电路，桥接电路会将I/O地址映射为不同的物理地址。

可以想象，PCI控制器挂接在处理器的系统总线上，而另一端的PCI总线上外扩了一些PCI设备。

假如某个PCI设备具有DMA能力，要去操作RAM，这时该设备看到的RAM的地址就应该是由系统总线映射到PCI总线上的总线地址。

映射关系由PCI控制器地址窗口来配置，一般是一个偏移量，所以这时映射到PCI总线上的RAM的总线地址就不是RAM在处理器系统地址空间上的物理地址（也可以称为系统总线地址）了。

因此总线地址  ！=  物理地址



[dma_pool_create](https://blog.csdn.net/zqixiao_09/article/details/51089088)

 许多驱动程序需要又多又小的一致映射内存区域给DMA描述子或I/O缓存buffer，这使用DMA池比用dma_alloc_coherent分配的一页或多页内存区域好，DMA池用函数dma_pool_create创建，用函数dma_pool_alloc从DMA池中分配一块一致内存，用函数dmp_pool_free放内存回到DMA池中，使用函数dma_pool_destory释放DMA池的资源

```c
struct dma_pool {	/* the pool */
	struct list_head	page_list;//页链表
	spinlock_t		lock;
	size_t			blocks_per_page;　//每页的块数
	size_t			size;     //DMA池里的一致内存块的大小
	struct device		*dev; //将做DMA的设备
	size_t			allocation; //分配的没有跨越边界的块数，是size的整数倍
	char			name [32];　//池的名字
	wait_queue_head_t	waitq;  //等待队列
	struct list_head	pools;
};

struct dma_pool *dma_pool_create (const char *name, struct device *dev,
	　　　　　　　　　　size_t size, size_t align, size_t allocation)
```



 函数**dma_pool_create**给DMA创建一个一致内存块池，其参数name是DMA池的名字，用于诊断用，参数dev是将做DMA的设备，参数size是DMA池里的块的大小，参数align是块的对齐要求，是2的幂，参数allocation返回没有跨越边界的块数（或0）

[WARN_ON_ONCE](https://blog.csdn.net/xiaohua0877/article/details/78515472)

```c
而WARN_ON则是调用dump_stack，打印堆栈信息，不会OOPS

#define WARN_ON(condition) do { 

    if (unlikely((condition)!=0)) { 

        printk("Badness in %s at %s:%d/n", __FUNCTION__, __FILE__,__LINE__); 

        dump_stack(); 

    } 

} while (0)

```

[mempool_create_node](https://blog.csdn.net/sinat_22338935/article/details/118719738#:~:text=mempool_,it_node%EF%BC%9A)

内存池(Memery Pool)技术是在真正使用内存之前，先申请分配一定数量的、大小相等(一般情况下)的内存块留作备用。当有新的内存需求时，就从内存池中分出一部分内存块，若内存块不够再继续申请新的内存。这样做的一个显著优点是尽量避免了内存碎片，使得内存分配效率得到提升。 不仅在用户态应用程序中被广泛使用，同时在Linux内核也被广泛使用，在内核中有不少地方内存分配不允许失败。作为一个在这些情况下确保分配的方式，内核开发者创建了一个已知为内存池(或者是 "mempool" )的抽象，内核中内存池真实地只是相当于后备缓存，它尽力一直保持一个空闲内存列表给紧急时使用，而在通常情况下有内存需求时还是从公共的内存中直接分配，这样的做法虽然有点霸占内存的嫌疑，但是可以从根本上保证关键应用在内存紧张时申请内存仍然能够成功。

```c
typedef struct mempool_s {
	spinlock_t lock;//防止多处理器并发而引入的锁
	int min_nr;	//elements数组中的成员数量
	int curr_nr;//当前elements数组中空闲的成员数量
	void **elements;//用来存放内存成员的二维数组，等于elements[min_nr][内存对象的长度]

	//内存池与内核缓冲区结合使用的指针(这个指针专门用来指向这种内存对象对应的缓存区的指针)
	void *pool_data;
	mempool_alloc_t *alloc;//内存分配函数
	mempool_free_t *free;//内存释放函数
	wait_queue_head_t wait;//任务等待队列
} mempool_t;
mempool_t *mempool_create(int min_nr, mempool_alloc_t *alloc_fn,
				mempool_free_t *free_fn, void *pool_data)
{
	return mempool_create_node(min_nr,alloc_fn,free_fn, pool_data,
				   GFP_KERNEL, NUMA_NO_NODE);
}
EXPORT_SYMBOL(mempool_create);

/******************
创建一个内存池对象
参数：
min_nr ： 	为内存池分配的最小内存成员数量
alloc_fn ： 用户自定义内存分配函数(可以使用系统定义函数)
free_fn :	用户自定义内存释放函数(可以使用系统定义函数)
pool.data ：根据用户自定义内存分配函数所提供的可选私有数据，一般是缓存区指针
gfp_mask ： 内存分配掩码
node_id ： 	内存节点的id
******************/
mempool_t *mempool_create_node(int min_nr, mempool_alloc_t *alloc_fn,
			       mempool_free_t *free_fn, void *pool_data,
			       gfp_t gfp_mask, int node_id)
{
	mempool_t *pool;

	//为内存池对象分配内存
	pool = kzalloc_node(sizeof(*pool), gfp_mask, node_id);
	if (!pool)
		return NULL;

	//初始化内存池
	if (mempool_init_node(pool, min_nr, alloc_fn, free_fn, pool_data,
			      gfp_mask, node_id)) {
		kfree(pool);
		return NULL;
	}

	return pool;//返回内存池结构体
}
EXPORT_SYMBOL(mempool_create_node);
```



[alloc_page](https://www.cnblogs.com/linhaostudy/p/10161229.html)

```c
#define alloc_page(gfp_mask) alloc_pages(gfp_mask, 0)
```

[ida_simple_get](https://biscuitos.github.io/blog/IDA_ida_simple_get/#:~:text=ida_simple_get%28%29%20%E5%87%BD%E6%95%B0%E7%94%A8%E4%BA%8E%E8%8E%B7%E5%BE%97%E4%B8%80%E4%B8%AA%E6%9C%AA%E4%BD%BF%E7%94%A8%E7%9A%84%20ID%E3%80%82%20%E6%8C%87%E5%AE%9A%E8%B5%B7%E5%A7%8B%20ID%EF%BC%9B%E5%8F%82%E6%95%B0,end%20%E6%8C%87%E5%AE%9A%E7%BB%93%E6%9D%9F%20ID%EF%BC%9B%E5%8F%82%E6%95%B0%20gfp%20%E6%8C%87%E5%90%91%E5%86%85%E5%AD%98%E5%88%86%E9%85%8D%E6%97%B6%E7%9A%84%E6%A0%87%E5%BF%97%E3%80%82%20%E5%87%BD%E6%95%B0)

```c
#define ida_simple_get(ida, start, end, gfp)    \
                        ida_alloc_range(ida, start, (end) - 1, gfp)
```

ida_simple_get() 函数用于获得一个未使用的 ID。ida 参数对应 IDA；参数 start 指定起始 ID；参数 end 指定结束 ID，end为0应该就是最大值；参数 gfp 指向内存分配时的标志。函数 最终调用 ida_alloc_range() 函数进行分配。

[Linux内核device结构体分析](https://www.cnblogs.com/Cqlismy/p/11507216.html#:~:text=device_initialize%20%28%29%E5%87%BD%E6%95%B0%E6%98%AF%E8%AE%BE%E5%A4%87%E5%9C%A8sysfs%E4%B8%AD%E6%B3%A8%E5%86%8C%E7%9A%84%E7%AC%AC%E4%B8%80%E4%B8%AA%E9%98%B6%E6%AE%B5%EF%BC%8C%E7%94%A8%E4%BA%8E%E5%B0%86struct,device%E7%BB%93%E6%9E%84%E4%BD%93%E8%BF%9B%E8%A1%8C%E5%88%9D%E5%A7%8B%E5%8C%96%EF%BC%8C%E4%B8%BB%E8%A6%81%E6%98%AF%E5%AF%B9%E7%BB%93%E6%9E%84%E4%BD%93%E5%86%85%E7%9A%84%E4%B8%80%E4%BA%9B%E6%88%90%E5%91%98%E8%BF%9B%E8%A1%8C%E5%88%9D%E5%A7%8B%E5%8C%96%EF%BC%8C%E7%BB%93%E6%9E%84%E4%BD%93%E5%86%85%E5%B5%8C%E7%9A%84kobject%E4%B8%8B%E7%9A%84kset%E9%85%8D%E7%BD%AE%E4%B8%BAdevices_kset%EF%BC%8C%E8%B0%83%E7%94%A8kobject_init%20%28%29%E5%87%BD%E6%95%B0%E8%AE%BE%E7%BD%AEdevice_ktype%E5%92%8Csysfs_ops%E7%BB%93%E6%9E%84%E4%B8%AD%E7%9A%84%E4%B8%A4%E4%B8%AA%E5%87%BD%E6%95%B0%E5%92%8Cdevice_release%20%28%29%E5%87%BD%E6%95%B0%EF%BC%8C%E5%8F%A6%E5%A4%96%E8%BF%98%E6%9C%89%E4%B8%80%E4%BA%9B%E7%89%B9%E5%AE%9A%E8%B5%84%E6%BA%90%E9%9C%80%E8%A6%81%E7%9A%84%E6%88%90%E5%91%98%E7%9A%84%E5%88%9D%E5%A7%8B%E5%8C%96%E3%80%82)

device_initialize()函数是设备在sysfs中注册的第一个阶段，用于将struct device结构体进行初始化，主要是对结构体内的一些成员进行初始化，结构体内嵌的kobject下的kset配置为devices_kset，调用kobject_init()函数设置device_ktype和sysfs_ops结构中的两个函数和device_release()函数，另外还有一些特定资源需要的成员的初始化。



```c
Linux 内核的MKDEV 宏定义

定义位置：<linux/cdev.h>

#define MKDEV(major,minor) (((major) << MINORBITS) | (minor))

宏作用： 获取设备在设备表中的位置

major 主设备号

minor 次设备号

执行成功后返回dev_t类型的设备编号
```

device_add()会在/sys目录对应设备目录下创建uevent属性节点，应用层的udev则会根据uevent来创建/dev目录下的设备节点，cdev_add()注册字符设备。

字符设备的设备号已经在nvme_core模块初始化时申请

```c
result = alloc_chrdev_region(&nvme_chr_devt, 0, NVME_MINORS, "nvme");
3778  	if (result < 0)
```

nvme模块初始化负责创建字符设备

正常关机：

1. Host停止提交新的I/O命令，但允许未完成的命令继续完成；
2. Host删除所有I/O SQ，删除所有SQ队列后，所有未完成的命令将被撤销；
3. Host删除所有I/O CQ；
4. Host将CC.SHN置01b，表示正常关机；关机程序完成时，将CSTS.SHST置10b。



[pci_enable_device_mem](https://blog.csdn.net/bryanwang_3099/article/details/106794149)

PCI/PCIE的BAR有两种类型，memory和IO。pci_enable_device_mem()只初始化memory类型的BAR，pci_enable_device()同时初始化memory和IO类型的BAR。如果要驱动的PCI/PCIE设备包含IO空间，那么必须使用pci_enable_device()

 pci_set_master：

调用pci_set_master(pdev)函数，设置设备具有获得总线的能力，即调用这个函数，使设备具备申请使用PCI总线的能力

[dma_set_mask_and_coherent](https://cloud.tencent.com/developer/article/1628161#:~:text=%E5%85%B6%E4%B8%AD%E7%9A%84%E5%87%BD%E6%95%B0%20dma_set_mask_and_coherent%20%28%29%20%E7%94%A8%E4%BA%8E%E5%AF%B9%20dma_mask%20%E5%92%8C,coherent_dma_mask%20%E8%B5%8B%E5%80%BC%E3%80%82%20dma_mask%20%E8%A1%A8%E7%A4%BA%E7%9A%84%E6%98%AF%E8%AF%A5%E8%AE%BE%E5%A4%87%E9%80%9A%E8%BF%87DMA%E6%96%B9%E5%BC%8F%E5%8F%AF%E5%AF%BB%E5%9D%80%E7%9A%84%E7%89%A9%E7%90%86%E5%9C%B0%E5%9D%80%E8%8C%83%E5%9B%B4%EF%BC%8C%20coherent_dma_mask%20%E8%A1%A8%E7%A4%BA%E6%89%80%E6%9C%89%E8%AE%BE%E5%A4%87%E9%80%9A%E8%BF%87DMA%E6%96%B9%E5%BC%8F%E5%8F%AF%E5%AF%BB%E5%9D%80%E7%9A%84%E5%85%AC%E5%85%B1%E7%9A%84%E7%89%A9%E7%90%86%E5%9C%B0%E5%9D%80%E8%8C%83%E5%9B%B4%EF%BC%8C%20%E5%9B%A0%E4%B8%BA%E4%B8%8D%E6%98%AF%E6%89%80%E6%9C%89%E7%9A%84%E7%A1%AC%E4%BB%B6%E8%AE%BE%E5%A4%87%E9%83%BD%E8%83%BD%E5%A4%9F%E6%94%AF%E6%8C%8164bit%E7%9A%84%E5%9C%B0%E5%9D%80%E5%AE%BD%E5%BA%A6%E3%80%82)

函数`dma_set_mask_and_coherent()`用于对`dma_mask`和`coherent_dma_mask`赋值。

`dma_mask`表示的是该设备通过DMA方式可寻址的物理地址范围，`coherent_dma_mask`表示所有设备通过DMA方式可寻址的公共的物理地址范围，

因为不是所有的硬件设备都能够支持64bit的地址宽度。

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

rc==0表示该设备的`dma_mask`赋值成功，所以可以接着对`coherent_dma_mask`赋同样的值。

控制寄存器：

![https://img-blog.csdn.net/20160604114927706](https://img-blog.csdn.net/20160604114927706)

[MSI/MSI-x中断](https://blog.csdn.net/yhb1047818384/article/details/106676560)

传统中断在系统初始化扫描PCI bus tree时就已自动为设备分配好中断号, 但是如果设备需要使用MSI，驱动需要进行一些额外的配置。
当前linux内核提供pci_alloc_irq_vectors来进行MSI/MSI-X capablity的初始化配置以及中断号分配。

```c
int pci_alloc_irq_vectors(struct pci_dev *dev, unsigned int min_vecs,
                unsigned int max_vecs, unsigned int flags);

函数的返回值为该PCI设备分配的中断向量个数。
min_vecs是设备对中断向量数目的最小要求，如果小于该值，会返回错误。
max_vecs是期望分配的中断向量最大个数。
flags用于区分设备和驱动能够使用的中断类型

#define PCI_IRQ_LEGACY		(1 << 0) /* Allow legacy interrupts */
#define PCI_IRQ_MSI		(1 << 1) /* Allow MSI interrupts */
#define PCI_IRQ_MSIX		(1 << 2) /* Allow MSI-X interrupts */
#define PCI_IRQ_ALL_TYPES   (PCI_IRQ_LEGACY | PCI_IRQ_MSI | PCI_IRQ_MSIX)
```

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

[CMB](https://blog.csdn.net/TV8MbnO2Y2RfU/article/details/78103780)

 但是如果CPU将整条指令而不是指针直接写到SSD端的DRAM的话，并不耗费太多资源，此时能够节省一次PCIE往返及一次SSD控制器内部的中断处理。于是，人们就想将SSD控制器上的一小段DRAM空间映射到host物理地址空间从而可以让驱动直接写指令进去，甚至写一些数据进去也是可以的。这块被映射到host物理地址空间的DRAM空间便被称为CMB了


[ioremap_wc](https://blog.csdn.net/student456852/article/details/116868447)

ioremap_wc用来映射memory type为**normal memory**的设备，同时不使用cache

[sysfs API总结](https://blog.csdn.net/qb_2008/article/details/6846412)

sysfs_add_file_to_group()将一个属性attr加入kobj目录下已存在的的属性集合group。

[PCI驱动使用函数](https://blog.csdn.net/qiao_zz/article/details/53287749)

```c
int pci_enable_pcie_error_reporting(struct pci_dev *dev);
/*
pci_enable_pcie_error_reporting enables the device to send error messages to root port when an error is detected. Note that devices don’t enable the error reporting by default, so device drivers need call this function to enable it.
*/


The pci_save_state() and pci_restore_state() functions can be used by a device driver to save and restore standard PCI config registers.  The pci_save_state() function must be invoked while the device has valid state before pci_restore_state() can be used.  If the device is not in the fully-powered state (PCI_POWERSTATE_D0) when pci_restore_state() is  invoked, then the device will be transitioned to PCI_POWERSTATE_D0 before any config registers are restored.
```

[readl](https://www.cnblogs.com/lialong1st/p/7756675.html)

byte word long

readb readw readl：从虚拟地址读取1 2 4字节数据

```c
unsigned int readl(unsigned int addr);
void writel(unsigned int data, unsigned int addr);
```



```c
result = nvme_alloc_queue(dev, 0, NVME_AQ_DEPTH); //为admin queue申请空间
```

[dma_zalloc_coherent](https://www.cnblogs.com/sky-heaven/p/9579742.html)

dma_alloc_coherent() -- 获取物理页，并将该物理页的总线地址保存于dma_handle，返回该物理页的虚拟地址

DMA映射建立了一个新的结构类型---------dma_addr_t来表示总线地址。dma_addr_t类型的变量对驱动程序是不透明的；唯一允许的操作是将它们传递给DMA支持例程以及设备本身。作为一个总线地址，如果CPU直接使用了dma_addr_t，将会导致发生不可预期的后果！

一致性DMA映射存在与驱动程序的生命周期中，它的缓冲区必须可同时被CPU和外围设备访问！因此一致性映射必须保存在一致性缓存中。建立和使用一致性映射的开销是很大的！

```c
void * dma_alloc_coherent(struct device *dev,    size_t size, dma_addr_t  *dma_handle, gfp_t gfp)
```



```c
static const struct nvme_ctrl_ops nvme_pci_ctrl_ops = {
	.name			= "pcie",
	.module			= THIS_MODULE,
	.flags			= NVME_F_METADATA_SUPPORTED,
	.reg_read32		= nvme_pci_reg_read32,
	.reg_write32		= nvme_pci_reg_write32,
	.reg_read64		= nvme_pci_reg_read64,
	.free_ctrl		= nvme_pci_free_ctrl,
	.submit_async_event	= nvme_pci_submit_async_event,
	.get_address		= nvme_pci_get_address,
};
ctrl->ops->reg_write32等价于nvme_pci_reg_write32
```



```c
blk_mq_alloc_tag_set: Alloc a tag set to be associated with one or more request queues
struct request_queue *blk_mq_init_queue(struct blk_mq_tag_set *set)
{
	return blk_mq_init_queue_data(set, NULL);
}
static struct request_queue *blk_mq_init_queue_data(struct blk_mq_tag_set *set,
		void *queuedata)
{
	struct request_queue *q;
	int ret;

	q = blk_alloc_queue(set->numa_node);
	if (!q)
		return ERR_PTR(-ENOMEM);
	q->queuedata = queuedata;
	ret = blk_mq_init_allocated_queue(set, q);
	if (ret) {
		blk_cleanup_queue(q);
		return ERR_PTR(ret);
	}
	return q;
}
int blk_mq_init_allocated_queue(struct blk_mq_tag_set *set,
		struct request_queue *q)
{
	/* mark the queue as mq asap */
	q->mq_ops = set->ops;

	q->poll_cb = blk_stat_alloc_callback(blk_mq_poll_stats_fn,
					     blk_mq_poll_stats_bkt,
					     BLK_MQ_POLL_STATS_BKTS, q);
	if (!q->poll_cb)
		goto err_exit;

	if (blk_mq_alloc_ctxs(q))
		goto err_poll;

	/* init q->mq_kobj and sw queues' kobjects */
	blk_mq_sysfs_init(q);

	INIT_LIST_HEAD(&q->unused_hctx_list);
	spin_lock_init(&q->unused_hctx_lock);

	blk_mq_realloc_hw_ctxs(set, q);
	if (!q->nr_hw_queues)
		goto err_hctxs;

	INIT_WORK(&q->timeout_work, blk_mq_timeout_work);
	blk_queue_rq_timeout(q, set->timeout ? set->timeout : 30 * HZ);

	q->tag_set = set;

	q->queue_flags |= QUEUE_FLAG_MQ_DEFAULT;
	if (set->nr_maps > HCTX_TYPE_POLL &&
	    set->map[HCTX_TYPE_POLL].nr_queues)
		blk_queue_flag_set(QUEUE_FLAG_POLL, q);

	q->sg_reserved_size = INT_MAX;

	INIT_DELAYED_WORK(&q->requeue_work, blk_mq_requeue_work);
	INIT_LIST_HEAD(&q->requeue_list);
	spin_lock_init(&q->requeue_lock);

	q->nr_requests = set->queue_depth;

	/*
	 * Default to classic polling
	 */
	q->poll_nsec = BLK_MQ_POLL_CLASSIC;

	blk_mq_init_cpu_queues(q, set->nr_hw_queues);
	blk_mq_add_queue_tag_set(set, q);
	blk_mq_map_swqueue(q);
	return 0;

err_hctxs:
	kfree(q->queue_hw_ctx);
	q->nr_hw_queues = 0;
	blk_mq_sysfs_deinit(q);
err_poll:
	blk_stat_free_callback(q->poll_cb);
	q->poll_cb = NULL;
err_exit:
	q->mq_ops = NULL;
	return -ENOMEM;
}
// q->mq_ops = set->ops; 请求队列继承tag_set的操作符集合
```



```c
cpu_to_le32
le32_to_cpu  cpu<--->小端32位数（little endian）
cpu_to_be32 
be32_to_cpu  cpu<--->大端32位数（big endian）
```



# 变量

字符设备操作函数

```c
static const struct file_operations nvme_dev_fops = {
	.owner		= THIS_MODULE,
	.open		= nvme_dev_open,
	.unlocked_ioctl	= nvme_dev_ioctl,
	.compat_ioctl	= nvme_dev_ioctl,
};
```

块设备操作函数

```c
static const struct block_device_operations nvme_fops = {
	.owner		= THIS_MODULE,
	.ioctl		= nvme_ioctl,
	.compat_ioctl	= nvme_ioctl,
	.open		= nvme_open,
	.release	= nvme_release,
	.getgeo		= nvme_getgeo,
	.revalidate_disk= nvme_revalidate_disk,
	.pr_ops		= &nvme_pr_ops,
};
```

请求队列操作函数

```c
static const struct blk_mq_ops nvme_mq_admin_ops = {
	.queue_rq	= nvme_queue_rq,
	.complete	= nvme_pci_complete_rq,
	.init_hctx	= nvme_admin_init_hctx,
	.exit_hctx      = nvme_admin_exit_hctx,
	.init_request	= nvme_init_request,
	.timeout	= nvme_timeout,
};

static const struct blk_mq_ops nvme_mq_ops = {
	.queue_rq	= nvme_queue_rq,
	.complete	= nvme_pci_complete_rq,
	.init_hctx	= nvme_init_hctx,
	.init_request	= nvme_init_request,
	.map_queues	= nvme_pci_map_queues,
	.timeout	= nvme_timeout,
	.poll		= nvme_poll,
};
```

struct pci_driver

```c
static struct pci_driver nvme_driver = {
	.name		= "nvme",
	.id_table	= nvme_id_table,
	.probe		= nvme_probe,
	.remove		= nvme_remove,
	.shutdown	= nvme_shutdown,
	.driver		= {
		.pm	= &nvme_dev_pm_ops,
	},
	.sriov_configure = pci_sriov_configure_simple,
	.err_handler	= &nvme_err_handler,
};
```

id_tables

```c
static const struct pci_device_id nvme_id_table[] = {
	{ PCI_VDEVICE(INTEL, 0x0953),
		.driver_data = NVME_QUIRK_STRIPE_SIZE |
				NVME_QUIRK_DEALLOCATE_ZEROES, },
	{ PCI_VDEVICE(INTEL, 0x0a53),
		.driver_data = NVME_QUIRK_STRIPE_SIZE |
				NVME_QUIRK_DEALLOCATE_ZEROES, },
	{ PCI_VDEVICE(INTEL, 0x0a54),
		.driver_data = NVME_QUIRK_STRIPE_SIZE |
				NVME_QUIRK_DEALLOCATE_ZEROES, },
	{ PCI_VDEVICE(INTEL, 0x0a55),
		.driver_data = NVME_QUIRK_STRIPE_SIZE |
				NVME_QUIRK_DEALLOCATE_ZEROES, },
	{ PCI_VDEVICE(INTEL, 0xf1a5),	/* Intel 600P/P3100 */
		.driver_data = NVME_QUIRK_NO_DEEPEST_PS |
				NVME_QUIRK_MEDIUM_PRIO_SQ },
	{ PCI_VDEVICE(INTEL, 0x5845),	/* Qemu emulated controller */
		.driver_data = NVME_QUIRK_IDENTIFY_CNS, },
	{ PCI_DEVICE(0x1bb1, 0x0100),   /* Seagate Nytro Flash Storage */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x1c58, 0x0003),	/* HGST adapter */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x1c58, 0x0023),	/* WDC SN200 adapter */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x1c5f, 0x0540),	/* Memblaze Pblaze4 adapter */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x144d, 0xa821),   /* Samsung PM1725 */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x144d, 0xa822),   /* Samsung PM1725a */
		.driver_data = NVME_QUIRK_DELAY_BEFORE_CHK_RDY, },
	{ PCI_DEVICE(0x1d1d, 0x1f1f),	/* LighNVM qemu device */
		.driver_data = NVME_QUIRK_LIGHTNVM, },
	{ PCI_DEVICE(0x1d1d, 0x2807),	/* CNEX WL */
		.driver_data = NVME_QUIRK_LIGHTNVM, },
	{ PCI_DEVICE(0x1d1d, 0x2601),	/* CNEX Granby */
		.driver_data = NVME_QUIRK_LIGHTNVM, },
	{ PCI_DEVICE_CLASS(PCI_CLASS_STORAGE_EXPRESS, 0xffffff) },
	{ PCI_DEVICE(PCI_VENDOR_ID_APPLE, 0x2001) },
	{ PCI_DEVICE(PCI_VENDOR_ID_APPLE, 0x2003) },
	{ 0, }
};
```

nvme_pci_ctrl_ops

```c
static const struct nvme_ctrl_ops nvme_pci_ctrl_ops = {
	.name			= "pcie",
	.module			= THIS_MODULE,
	.flags			= NVME_F_METADATA_SUPPORTED,
	.reg_read32		= nvme_pci_reg_read32,
	.reg_write32		= nvme_pci_reg_write32,
	.reg_read64		= nvme_pci_reg_read64,
	.free_ctrl		= nvme_pci_free_ctrl,
	.submit_async_event	= nvme_pci_submit_async_event,
	.get_address		= nvme_pci_get_address,
};
```



# 函数

请求队列处理函数

```c
/*
 * NOTE: ns is NULL when called on the admin queue.
 */
static blk_status_t nvme_queue_rq(struct blk_mq_hw_ctx *hctx,
			 const struct blk_mq_queue_data *bd)
{
	struct nvme_ns *ns = hctx->queue->queuedata;
	struct nvme_queue *nvmeq = hctx->driver_data;
	struct nvme_dev *dev = nvmeq->dev;
	struct request *req = bd->rq;
	struct nvme_command cmnd;
	blk_status_t ret;

	/*
	 * We should not need to do this, but we're still using this to
	 * ensure we can drain requests on a dying queue.
	 */
	if (unlikely(nvmeq->cq_vector < 0))
		return BLK_STS_IOERR;

	ret = nvme_setup_cmd(ns, req, &cmnd);
	if (ret)
		return ret;

	ret = nvme_init_iod(req, dev);
	if (ret)
		goto out_free_cmd;

	if (blk_rq_nr_phys_segments(req)) {
		ret = nvme_map_data(dev, req, &cmnd);
		if (ret)
			goto out_cleanup_iod;
	}

	blk_mq_start_request(req);
	nvme_submit_cmd(nvmeq, &cmnd);
	return BLK_STS_OK;
out_cleanup_iod:
	nvme_free_iod(dev, req);
out_free_cmd:
	nvme_cleanup_cmd(req);
	return ret;
}



void nvme_complete_rq(struct request *req)
{
	blk_status_t status = nvme_error_status(req);

	trace_nvme_complete_rq(req);

	if (unlikely(status != BLK_STS_OK && nvme_req_needs_retry(req))) {
		if ((req->cmd_flags & REQ_NVME_MPATH) &&
		    blk_path_error(status)) {
			nvme_failover_req(req);
			return;
		}

		if (!blk_queue_dying(req->q)) {
			nvme_req(req)->retries++;
			blk_mq_requeue_request(req, true);
			return;
		}
	}
	blk_mq_end_request(req, status);
}
EXPORT_SYMBOL_GPL(nvme_complete_rq);
```

中断处理函数

```c
static irqreturn_t nvme_irq(int irq, void *data)
{
	struct nvme_queue *nvmeq = data;
	irqreturn_t ret = IRQ_NONE;
	u16 start, end;

	spin_lock(&nvmeq->cq_lock);
	if (nvmeq->cq_head != nvmeq->last_cq_head)
		ret = IRQ_HANDLED;
	nvme_process_cq(nvmeq, &start, &end, -1);
	nvmeq->last_cq_head = nvmeq->cq_head;
	spin_unlock(&nvmeq->cq_lock);

	if (start != end) {
		nvme_complete_cqes(nvmeq, start, end);
		return IRQ_HANDLED;
	}

	return ret;
}
```



blk_mq_rq_from_pdu与blk_mq_rq_to_pdu

```c
/**
 * blk_mq_rq_from_pdu - cast a PDU to a request
 * @pdu: the PDU (Protocol Data Unit) to be casted
 *
 * Return: request
 *
 * Driver command data is immediately after the request. So subtract request
 * size to get back to the original request.
 */
static inline struct request *blk_mq_rq_from_pdu(void *pdu)
{
	return pdu - sizeof(struct request);
}

/**
 * blk_mq_rq_to_pdu - cast a request to a PDU
 * @rq: the request to be casted
 *
 * Return: pointer to the PDU
 *
 * Driver command data is immediately after the request. So add request to get
 * the PDU.
 */
static inline void *blk_mq_rq_to_pdu(struct request *rq)
{
	return rq + 1;
}
```



# 结构体

**pci_device_id**

```c
struct pci_device_id {
	__u32 vendor, device;		/* 厂商和设备ID，Vendor and device ID or PCI_ANY_ID*/
	__u32 subvendor, subdevice;	/* 子系统和设备ID，Subsystem ID's or PCI_ANY_ID */
	__u32 class, class_mask;	/* 类、子类、prog-if三元组，(class,subclass,prog-if) triplet */
	kernel_ulong_t driver_data;	/* 驱动私有数据，Data private to the driver */
};

```



**pci_dev**

每种类的PCI设备都可以用结构类型pci_dev来描述。更为准确地说，应该是每一个PCI功能，即PCI逻辑设备都唯一地对应有一个pci_dev设备描述符。该数据结构的定义如下（include/linux/pci.h）：

```c
struct pci_dev {
struct list_head global_list;

/* 全局链表元素global_list：每一个pci_dev结构都通过该成员连接到全局pci设备链表pci_devices中*/
struct list_head bus_list;

 /* 总线设备链表元素bus_list：每一个pci_dev结构除了链接到全局设备链表中外，还会通过这个成员连接到其所属PCI总线的设备链表中。每一条PCI总线都维护一条它自己的设备链表视图，以便描述所有连接在该PCI总线上的设备，其表头由PCI总线的pci_bus结构中的 devices成员所描述t*/
struct pci_bus *bus;

/* 总线指针bus：指向这个PCI设备所在的PCI总线的pci_bus结构。因此，对于桥设备而言，bus指针将指向桥设备的主总线（primary bus），也即指向桥设备所在的PCI总线*/
struct pci_bus *subordinate;

/* 指针subordinate：指向这个PCI设备所桥接的下级总线。这个指针成员仅对桥设备才有意义，而对于一般的非桥PCI设备而言，该指针成员总是为NULL*/
void *sysdata;

/* 无类型指针sysdata：指向一片特定于系统的扩展数据*/
struct proc_dir_entry *procent;

/* 指针procent：指向该PCI设备在／proc文件系统中对应的目录项*/
unsigned int devfn;

/* devfn：这个PCI设备的设备功能号，也成为PCI逻辑设备号（0－255）。其中bit[7:3]是物理设备号（取值范围0－31），bit[2:0]是功能号（取值范围0－7）。 */
unsigned short vendor;


/* vendor：这是一个16无符号整数，表示PCI设备的厂商ID*/
unsigned short device;


/*device：这是一个16无符号整数，表示PCI设备的设备ID */
unsigned short subsystem_vendor;

/* subsystem_vendor：这是一个16无符号整数，表示PCI设备的子系统厂商ID*/
unsigned short subsystem_device;

/* subsystem_device：这是一个16无符号整数，表示PCI设备的子系统设备ID。*/
unsigned int class;

/* class：32位的无符号整数，表示该PCI设备的类别，其中，bit［7：0］为编程接口，bit［15：8］为子类别代码，bit ［23：16］为基类别代码，bit［31：24］无意义。显然，class成员的低3字节刚好对应与PCI配置空间中的类代码*/
u8 hdr_type;

/* hdr_type：8位符号整数，表示PCI配置空间头部的类型。其中，bit［7］＝1表示这是一个多功能设备，bit［7］＝0表示这是一个单功能设备。Bit［6：0］则表示PCI配置空间头部的布局类型，值00h表示这是一个一般PCI设备的配置空间头部，值01h表示这是一个PCI-to-PCI桥的配置空间头部，值02h表示CardBus桥的配置空间头部*/
u8 rom_base_reg;

/* rom_base_reg：8位无符号整数，表示PCI配置空间中的ROM基地址寄存器在PCI配置空间中的位置。ROM基地址寄存器在不同类型的PCI配置空间头部的位置是不一样的，对于type 0的配置空间布局，ROM基地址寄存器的起始位置是30h，而对于PCI-to-PCI桥所用的type 1配置空间布局，ROM基地址寄存器的起始位置是38h*/
struct pci_driver *driver;

/* 指针driver：指向这个PCI设备所对应的驱动程序定义的pci_driver结构。每一个pci设备驱动程序都必须定义它自己的pci_driver结构来描述它自己。*/
u64 dma_mask;

/*dma_mask：用于DMA的总线地址掩码，一般来说，这个成员的值是0xffffffff。数据类型dma_addr_t定义在include/asm/types.h中，在x86平台上，dma_addr_t类型就是u32类型*/

pci_power_t  current_state;

 /* 当前操作状态 */
 struct device dev;

/* 通用的设备接口*/
unsigned short vendor_compatible[DEVICE_COUNT_COMPATIBLE];
unsigned short device_compatible[DEVICE_COUNT_COMPATIBLE];
/*定义这个PCI设备与哪些设备相兼容!/
unsigned int irq;

/* 无符号的整数irq：表示这个PCI设备通过哪根IRQ输入线产生中断，一般为0－15之间的某个值 */
struct resource resource[DEVICE_COUNT_RESOURCE];

/*表示该设备可能用到的资源，包括：I/O断口区域、设备内存地址区域以及扩展ROM地址区域。*/
int cfg_size;

/* 配置空间的大小 */

unsigned int transparent:1;

/* 透明 PCI 桥 */
unsigned int multifunction:1;

/* 多功能设备*/

unsigned int is_enabled:1;

/* pci_enable_device已经被调用*/
unsigned int is_busmaster:1;

 /* 设备是主设备*/
unsigned int no_msi:1;

 /* 设备不使用msi*/
unsigned int block_ucfg_access:1;

/* 配置空间访问形式用块的形式 */
u32 saved_config_space[16];

/* 在挂起时保存配置空间*/
struct bin_attribute *rom_attr;

/* sysfs ROM入口的属性描述*/
int rom_attr_enabled;

/* 能显示rom 属性*/
struct bin_attribute *res_attr[DEVICE_COUNT_RESOURCE];

 /* 资源的sysfs文件*/
};
```

**nvme_dev**

内核使用一个nvme_dev结构体来描述一个nvme设备, 一个nvme设备对应一个nvme_dev

```c
/*
 * Represents an NVM Express device.  Each nvme_dev is a PCI function.
 */
struct nvme_dev {
	struct nvme_queue *queues;
	struct blk_mq_tag_set tagset;
	struct blk_mq_tag_set admin_tagset;
	u32 __iomem *dbs;
	struct device *dev;
	struct dma_pool *prp_page_pool;
	struct dma_pool *prp_small_pool;
	unsigned online_queues;
	unsigned max_qid;
	unsigned int num_vecs;
	int q_depth;
	u32 db_stride;
	void __iomem *bar;
	unsigned long bar_mapped_size;
	struct work_struct remove_work;
	struct mutex shutdown_lock;
	bool subsystem;
	void __iomem *cmb;
	pci_bus_addr_t cmb_bus_addr;
	u64 cmb_size;
	u32 cmbsz;
	u32 cmbloc;
	struct nvme_ctrl ctrl;
	struct completion ioq_wait;

	mempool_t *iod_mempool;

	/* shadow doorbell buffer support: */
	u32 *dbbuf_dbs;
	dma_addr_t dbbuf_dbs_dma_addr;
	u32 *dbbuf_eis;
	dma_addr_t dbbuf_eis_dma_addr;

	/* host memory buffer support: */
	u64 host_mem_size;
	u32 nr_host_mem_descs;
	dma_addr_t host_mem_descs_dma;
	struct nvme_host_mem_buf_desc *host_mem_descs;
	void **host_mem_desc_bufs;
};
```



**nvme_ctrl_ops**

```c
struct nvme_ctrl_ops {
	const char *name;
	struct module *module;
	unsigned int flags;
#define NVME_F_FABRICS			(1 << 0)
#define NVME_F_METADATA_SUPPORTED	(1 << 1)
	int (*reg_read32)(struct nvme_ctrl *ctrl, u32 off, u32 *val);
	int (*reg_write32)(struct nvme_ctrl *ctrl, u32 off, u32 val);
	int (*reg_read64)(struct nvme_ctrl *ctrl, u32 off, u64 *val);
	void (*free_ctrl)(struct nvme_ctrl *ctrl);
	void (*submit_async_event)(struct nvme_ctrl *ctrl);
	void (*delete_ctrl)(struct nvme_ctrl *ctrl);
	int (*get_address)(struct nvme_ctrl *ctrl, char *buf, int size);
	void (*stop_ctrl)(struct nvme_ctrl *ctrl);
};
```

**enum nvme_ctrl_state**

```c
enum nvme_ctrl_state {
	NVME_CTRL_NEW,
	NVME_CTRL_LIVE,
	NVME_CTRL_ADMIN_ONLY,    /* Only admin queue live */
	NVME_CTRL_RESETTING,
	NVME_CTRL_CONNECTING,
	NVME_CTRL_DELETING,
	NVME_CTRL_DEAD,
};
```

**struct blk_mq_tag_set**

```c
struct blk_mq_tag_set {
	/*
	 * map[] holds ctx -> hctx mappings, one map exists for each type
	 * that the driver wishes to support. There are no restrictions
	 * on maps being of the same size, and it's perfectly legal to
	 * share maps between types.
	 */
	struct blk_mq_queue_map	map[HCTX_MAX_TYPES];        //软硬件队列映射表
	unsigned int		nr_maps;	/* nr entries in map[] */    //映射表数量
	const struct blk_mq_ops	*ops;        //驱动实现的操作集合，会被request_queue继承
	unsigned int		nr_hw_queues;	/* nr hw queues across maps */    //硬件队列数量
	unsigned int		queue_depth;	/* max hw supported */       //硬件队列深度
    ...
	struct blk_mq_tags	**tags;           //为每个硬件队列分配一个rq集合
 
    struct mutex		tag_list_lock;
    struct list_head	tag_list;        //使用该tag_set的request_queue 链表
};
```

**struct request_queue**

```c
struct request_queue {
	struct request		*last_merge;
	struct elevator_queue	*elevator;

	struct percpu_ref	q_usage_counter;

	struct blk_queue_stats	*stats;
	struct rq_qos		*rq_qos;

	const struct blk_mq_ops	*mq_ops;

	/* sw queues */
	struct blk_mq_ctx __percpu	*queue_ctx;

	unsigned int		queue_depth;

	/* hw dispatch queues */
	struct blk_mq_hw_ctx	**queue_hw_ctx;
	unsigned int		nr_hw_queues;

	struct backing_dev_info	*backing_dev_info;

	/*
	 * The queue owner gets to use this for whatever they like.
	 * ll_rw_blk doesn't touch it.
	 */
	void			*queuedata;

	/*
	 * various queue flags, see QUEUE_* below
	 */
	unsigned long		queue_flags;
	/*
	 * Number of contexts that have called blk_set_pm_only(). If this
	 * counter is above zero then only RQF_PM requests are processed.
	 */
	atomic_t		pm_only;

	/*
	 * ida allocated id for this queue.  Used to index queues from
	 * ioctx.
	 */
	int			id;

	spinlock_t		queue_lock;

	/*
	 * queue kobject
	 */
	struct kobject kobj;

	/*
	 * mq queue kobject
	 */
	struct kobject *mq_kobj;

#ifdef  CONFIG_BLK_DEV_INTEGRITY
	struct blk_integrity integrity;
#endif	/* CONFIG_BLK_DEV_INTEGRITY */

#ifdef CONFIG_PM
	struct device		*dev;
	enum rpm_status		rpm_status;
#endif

	/*
	 * queue settings
	 */
	unsigned long		nr_requests;	/* Max # of requests */

	unsigned int		dma_pad_mask;
	unsigned int		dma_alignment;

#ifdef CONFIG_BLK_INLINE_ENCRYPTION
	/* Inline crypto capabilities */
	struct blk_keyslot_manager *ksm;
#endif

	unsigned int		rq_timeout;
	int			poll_nsec;

	struct blk_stat_callback	*poll_cb;
	struct blk_rq_stat	poll_stat[BLK_MQ_POLL_STATS_BKTS];

	struct timer_list	timeout;
	struct work_struct	timeout_work;

	atomic_t		nr_active_requests_shared_sbitmap;

	struct sbitmap_queue	sched_bitmap_tags;
	struct sbitmap_queue	sched_breserved_tags;

	struct list_head	icq_list;
#ifdef CONFIG_BLK_CGROUP
	DECLARE_BITMAP		(blkcg_pols, BLKCG_MAX_POLS);
	struct blkcg_gq		*root_blkg;
	struct list_head	blkg_list;
#endif

	struct queue_limits	limits;

	unsigned int		required_elevator_features;

#ifdef CONFIG_BLK_DEV_ZONED
	/*
	 * Zoned block device information for request dispatch control.
	 * nr_zones is the total number of zones of the device. This is always
	 * 0 for regular block devices. conv_zones_bitmap is a bitmap of nr_zones
	 * bits which indicates if a zone is conventional (bit set) or
	 * sequential (bit clear). seq_zones_wlock is a bitmap of nr_zones
	 * bits which indicates if a zone is write locked, that is, if a write
	 * request targeting the zone was dispatched. All three fields are
	 * initialized by the low level device driver (e.g. scsi/sd.c).
	 * Stacking drivers (device mappers) may or may not initialize
	 * these fields.
	 *
	 * Reads of this information must be protected with blk_queue_enter() /
	 * blk_queue_exit(). Modifying this information is only allowed while
	 * no requests are being processed. See also blk_mq_freeze_queue() and
	 * blk_mq_unfreeze_queue().
	 */
	unsigned int		nr_zones;
	unsigned long		*conv_zones_bitmap;
	unsigned long		*seq_zones_wlock;
	unsigned int		max_open_zones;
	unsigned int		max_active_zones;
#endif /* CONFIG_BLK_DEV_ZONED */

	/*
	 * sg stuff
	 */
	unsigned int		sg_timeout;
	unsigned int		sg_reserved_size;
	int			node;
	struct mutex		debugfs_mutex;
#ifdef CONFIG_BLK_DEV_IO_TRACE
	struct blk_trace __rcu	*blk_trace;
#endif
	/*
	 * for flush operations
	 */
	struct blk_flush_queue	*fq;

	struct list_head	requeue_list;
	spinlock_t		requeue_lock;
	struct delayed_work	requeue_work;

	struct mutex		sysfs_lock;
	struct mutex		sysfs_dir_lock;

	/*
	 * for reusing dead hctx instance in case of updating
	 * nr_hw_queues
	 */
	struct list_head	unused_hctx_list;
	spinlock_t		unused_hctx_lock;

	int			mq_freeze_depth;

#if defined(CONFIG_BLK_DEV_BSG)
	struct bsg_class_device bsg_dev;
#endif

#ifdef CONFIG_BLK_DEV_THROTTLING
	/* Throttle data */
	struct throtl_data *td;
#endif
	struct rcu_head		rcu_head;
	wait_queue_head_t	mq_freeze_wq;
	/*
	 * Protect concurrent access to q_usage_counter by
	 * percpu_ref_kill() and percpu_ref_reinit().
	 */
	struct mutex		mq_freeze_lock;

	struct blk_mq_tag_set	*tag_set;
	struct list_head	tag_set_list;
	struct bio_set		bio_split;

	struct dentry		*debugfs_dir;

#ifdef CONFIG_BLK_DEBUG_FS
	struct dentry		*sched_debugfs_dir;
	struct dentry		*rqos_debugfs_dir;
#endif

	bool			mq_sysfs_init_done;

	size_t			cmd_size;

#define BLK_MAX_WRITE_HINTS	5
	u64			write_hints[BLK_MAX_WRITE_HINTS];
};
```

**struct blk_mq_ops**

```c
struct blk_mq_ops {
	/**
	 * @queue_rq: Queue a new request from block IO.
	 */
	blk_status_t (*queue_rq)(struct blk_mq_hw_ctx *,
				 const struct blk_mq_queue_data *);

	/**
	 * @commit_rqs: If a driver uses bd->last to judge when to submit
	 * requests to hardware, it must define this function. In case of errors
	 * that make us stop issuing further requests, this hook serves the
	 * purpose of kicking the hardware (which the last request otherwise
	 * would have done).
	 */
	void (*commit_rqs)(struct blk_mq_hw_ctx *);

	/**
	 * @get_budget: Reserve budget before queue request, once .queue_rq is
	 * run, it is driver's responsibility to release the
	 * reserved budget. Also we have to handle failure case
	 * of .get_budget for avoiding I/O deadlock.
	 */
	int (*get_budget)(struct request_queue *);

	/**
	 * @put_budget: Release the reserved budget.
	 */
	void (*put_budget)(struct request_queue *, int);

	/**
	 * @set_rq_budget_token: store rq's budget token
	 */
	void (*set_rq_budget_token)(struct request *, int);
	/**
	 * @get_rq_budget_token: retrieve rq's budget token
	 */
	int (*get_rq_budget_token)(struct request *);

	/**
	 * @timeout: Called on request timeout.
	 */
	enum blk_eh_timer_return (*timeout)(struct request *, bool);

	/**
	 * @poll: Called to poll for completion of a specific tag.
	 */
	int (*poll)(struct blk_mq_hw_ctx *);

	/**
	 * @complete: Mark the request as complete.
	 */
	void (*complete)(struct request *);

	/**
	 * @init_hctx: Called when the block layer side of a hardware queue has
	 * been set up, allowing the driver to allocate/init matching
	 * structures.
	 */
	int (*init_hctx)(struct blk_mq_hw_ctx *, void *, unsigned int);
	/**
	 * @exit_hctx: Ditto for exit/teardown.
	 */
	void (*exit_hctx)(struct blk_mq_hw_ctx *, unsigned int);

	/**
	 * @init_request: Called for every command allocated by the block layer
	 * to allow the driver to set up driver specific data.
	 *
	 * Tag greater than or equal to queue_depth is for setting up
	 * flush request.
	 */
	int (*init_request)(struct blk_mq_tag_set *set, struct request *,
			    unsigned int, unsigned int);
	/**
	 * @exit_request: Ditto for exit/teardown.
	 */
	void (*exit_request)(struct blk_mq_tag_set *set, struct request *,
			     unsigned int);

	/**
	 * @initialize_rq_fn: Called from inside blk_get_request().
	 */
	void (*initialize_rq_fn)(struct request *rq);

	/**
	 * @cleanup_rq: Called before freeing one request which isn't completed
	 * yet, and usually for freeing the driver private data.
	 */
	void (*cleanup_rq)(struct request *);

	/**
	 * @busy: If set, returns whether or not this queue currently is busy.
	 */
	bool (*busy)(struct request_queue *);

	/**
	 * @map_queues: This allows drivers specify their own queue mapping by
	 * overriding the setup-time function that builds the mq_map.
	 */
	int (*map_queues)(struct blk_mq_tag_set *set);

#ifdef CONFIG_BLK_DEBUG_FS
	/**
	 * @show_rq: Used by the debugfs implementation to show driver-specific
	 * information about a request.
	 */
	void (*show_rq)(struct seq_file *m, struct request *rq);
#endif
};

```

**struct request**

```c
struct request {
	struct request_queue *q;
	struct blk_mq_ctx *mq_ctx;
	struct blk_mq_hw_ctx *mq_hctx;

	unsigned int cmd_flags;		/* op and common flags */
	req_flags_t rq_flags;

	int tag;
	int internal_tag;

	/* the following two fields are internal, NEVER access directly */
	unsigned int __data_len;	/* total data len */
	sector_t __sector;		/* sector cursor */

	struct bio *bio;
	struct bio *biotail;

	struct list_head queuelist;

	/*
	 * The hash is used inside the scheduler, and killed once the
	 * request reaches the dispatch list. The ipi_list is only used
	 * to queue the request for softirq completion, which is long
	 * after the request has been unhashed (and even removed from
	 * the dispatch list).
	 */
	union {
		struct hlist_node hash;	/* merge hash */
		struct llist_node ipi_list;
	};

	/*
	 * The rb_node is only used inside the io scheduler, requests
	 * are pruned when moved to the dispatch queue. So let the
	 * completion_data share space with the rb_node.
	 */
	union {
		struct rb_node rb_node;	/* sort/lookup */
		struct bio_vec special_vec;
		void *completion_data;
		int error_count; /* for legacy drivers, don't use */
	};

	/*
	 * Three pointers are available for the IO schedulers, if they need
	 * more they have to dynamically allocate it.  Flush requests are
	 * never put on the IO scheduler. So let the flush fields share
	 * space with the elevator data.
	 */
	union {
		struct {
			struct io_cq		*icq;
			void			*priv[2];
		} elv;

		struct {
			unsigned int		seq;
			struct list_head	list;
			rq_end_io_fn		*saved_end_io;
		} flush;
	};

	struct gendisk *rq_disk;
	struct block_device *part;
#ifdef CONFIG_BLK_RQ_ALLOC_TIME
	/* Time that the first bio started allocating this request. */
	u64 alloc_time_ns;
#endif
	/* Time that this request was allocated for this IO. */
	u64 start_time_ns;
	/* Time that I/O was submitted to the device. */
	u64 io_start_time_ns;

#ifdef CONFIG_BLK_WBT
	unsigned short wbt_flags;
#endif
	/*
	 * rq sectors used for blk stats. It has the same value
	 * with blk_rq_sectors(rq), except that it never be zeroed
	 * by completion.
	 */
	unsigned short stats_sectors;

	/*
	 * Number of scatter-gather DMA addr+len pairs after
	 * physical address coalescing is performed.
	 */
	unsigned short nr_phys_segments;

#if defined(CONFIG_BLK_DEV_INTEGRITY)
	unsigned short nr_integrity_segments;
#endif

#ifdef CONFIG_BLK_INLINE_ENCRYPTION
	struct bio_crypt_ctx *crypt_ctx;
	struct blk_ksm_keyslot *crypt_keyslot;
#endif

	unsigned short write_hint;
	unsigned short ioprio;

	enum mq_rq_state state;
	refcount_t ref;

	unsigned int timeout;
	unsigned long deadline;

	union {
		struct __call_single_data csd;
		u64 fifo_time;
	};

	/*
	 * completion callback.
	 */
	rq_end_io_fn *end_io;
	void *end_io_data;
};
```


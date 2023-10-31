---
title: NVMe驱动学习记录-1
date: 2022-05-12 16:30:45
tags: nvme驱动 学习记录
categories: 
- [内核驱动开发记录]
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
---
<meta name="referrer" content="no-referrer" />


# 初始化

## nvme-core模块

1. 创建工作队列
2. 分配设备号
3. 创建class类型的对象

## 解释

> 工作队列

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

> 自动创建设备节点

```c
//设备号 : 主设备号(12bit) | 次设备号(20bit)
dev_num   = MKDEV(MAJOR_NUM, 0);
//静态注册设备号
ret   = register_chrdev_region(dev_num,ndevices,"dev_fifo");
if(ret < 0){
    //静态注册失败，进行动态注册设备号
    ret   =alloc_chrdev_region(&dev_num,0,ndevices,"dev_fifo");
    if(ret < 0){
        printk("Fail to register_chrdev_region\n");
        goto   err_register_chrdev_region;
    }
}
//创建设备类
cls   = class_create(THIS_MODULE, "dev_fifo");
if(IS_ERR(cls)){
    ret   = PTR_ERR(cls);
    goto   err_class_create;
}
printk("ndevices :   %d\n",ndevices);
for(n = 0;n < ndevices;n   ++)
{
    //初始化字符设备
    cdev_init(&gcd[n].cdev,&fifo_operations);
    //添加设备到操作系统
    ret   = cdev_add(&gcd[n].cdev,dev_num + n,1);
    if (ret < 0)
    {
        goto   err_cdev_add;
    }
    //导出设备信息到用户空间(/sys/class/类名/设备名)
    device   = device_create(cls,NULL,dev_num +n,NULL,"dev_fifo%d",n);
    if(IS_ERR(device)){
        ret   = PTR_ERR(device);
        printk("Fail to device_create\n");
        goto   err_device_create;    
    }
}
printk("Register   dev_fito to system,ok!\n");
return   0;
```



## nvme模块

> 注册pci_driver结构体，如果id_table与设备匹配，则执行nvme_probe函数

1. 为struct nvme_dev结构体申请空间
2. 将*I/O*端口的物理地址通过页表映射到核心虚地址空间内
3. 创建DMA池
4. 创建内存池
5. 填充struct nvme_ctrl结构体
6. 创建字符设备
7. 将控制器状态改成NVME_CTRL_RESETTING
8. 使能设备上的BAR
9. MSI中断号分配
10. 映射CMB（controller memory buffer）
11. 重新映射设备BAR
12. 通过NVME_REG_CC寄存器disable设备
13. 为CQ申请DMA缓冲区并映射
14. 如果CMB不支持SQ，申请DMA缓冲区
15. 填充struct nvme_queue结构体
16. 通过NVME_REG_CC寄存器enable设备
17. 初始化admin queue
18. 设置中断处理函数（nvme_irq_check或者nvme_irq）
19. 填充dev->admin_tagset并创建队列，并进行初始化
20. 将控制器状态改成NVME_CTRL_CONNECTING
21. 发送identify命令给nvme设备
22. 初始化子系统
23. 通过set feature命令配置自主电源状态转换功能APST ，时间戳
24. 发送directive send， directive Receive命令给nvme设备
25. 通过set feature命令设置io queue的数量
26. 再次申请中断号，注册中断函数？？？
27. 申请队列空间
28. 发送命令，创建IO队列（create io completion queue命令与create io submission queue命令）
29. 填充dev->tagset
30. 发送identify命令给nvme设备  cns = NVME_ID_CNS_CTRL
31. 发送identify命令给nvme设备   cns = NVME_ID_CNS_NS_ACTIVE_LIST
32. 填充struct nvme_ns *ns
33. 发送identify命令给nvme设备   cns = NVME_ID_CNS_NS
34. 创建块设备

##  解释

> 内存节点node

Node是内存管理最顶层的结构，在NUMA架构下，CPU平均划分为多个Node，每个Node有自己的内存控制器及内存插槽。CPU访问自己Node上的内存时速度快，而访问其他CPU所关联Node的内存的速度比较慢。而UMA则被当做只有一个Node的NUMA系统。

```c
dev_to_node(struct device dev)	//返回struct device中的numa_node成员(NUMA node this device is close to)  
```

[内存管理之内存节点Node、Zone、Page](https://blog.csdn.net/u010039418/article/details/109632502)



> IO映射

几乎每一种外设都是通过读写设备上的寄存器来进行的，通常包括控制寄存器、状态寄存器和数据寄存器三大类，外设的寄存器通常被连续地编址。根据CPU体系结构的不同，CPU对IO端口的编址方式有两种：


　　（1）I/O映射方式（I/O-mapped）

　　典型地，如X86处理器为外设专门实现了一个单独的地址空间，称为"I/O地址空间"或者"I/O端口空间"，CPU通过专门的I/O指令（如X86的IN和OUT指令）来访问这一空间中的地址单元。

　　（2）内存映射方式（Memory-mapped）

　　RISC指令系统的CPU（如MIPS ARM PowerPC等）通常只实现一个物理地址空间，像这种情况,外设的I/O端口的物理地址就被映射到内存地址空间中，外设I/O端口成为内存的一部分。此时，CPU可以象访问一个内存单元那样访问外设I/O端口，而不需要设立专门的外设I/O指令。


　　但是，这两者在硬件实现上的差异对于软件来说是完全透明的，驱动程序开发人员可以将内存映射方式的I/O端口和外设内存统一看作是"I/O内存"资源。


　　一般来说，在系统运行时，外设的I/O内存资源的物理地址是已知的，由硬件的设计决定。但是CPU通常并没有为这些已知的外设I/O内存资源的物理地址预定义虚拟地址范围，驱动程序并不能直接通过物理地址访问I/O内存资源，而必须将它们映射到核心虚地址空间内（通过页表），然后才能根据映射所得到的核心虚地址范围，通过访内指令访问这些I/O内存资源。Linux在io.h头文件中声明了函数ioremap（），用来将I/O内存资源的物理地址映射到核心虚地址空间。

 但要使用I/O内存首先要申请,然后才能映射,使用I/O端口首先要申请,或者叫请求,对于I/O端口的请求意思是让内核知道你要访问这个端口,这样内核知道了以后它就不会再让别人也访问这个端口了.毕竟这个世界僧多粥少啊.申请I/O端口的函数是request_region, 申请I/O内存的函数是request_mem_region， 来自include/linux/ioport.h
 
其实说白了，request_mem_region函数并没有做实际性的映射工作，只是告诉内核要使用一块内存地址，声明占有，也方便内核管理这些资源。

重要的还是ioremap函数，ioremap主要是检查传入地址的合法性，建立页表（包括访问权限），完成物理地址到虚拟地址的转换。

[内核request_mem_region 和 ioremap的理解](https://blog.csdn.net/skyflying2012/article/details/8672011)



> DMA池

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

[Linux 下的DMA浅析](https://blog.csdn.net/zqixiao_09/article/details/51089088)



> 内存池

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

[linux内存管理（十五）-内存池](https://blog.csdn.net/sinat_22338935/article/details/118719738#:~:text=mempool_,it_node%EF%BC%9A)



> cdev_device_add函数

```c
 * cdev_device_add() - add a char device and it's corresponding
 *	struct device, linkink
 * @dev: the device structure
 * @cdev: the cdev structure
 *
 * cdev_device_add() adds the char device represented by @cdev to the system,
 * just as cdev_add does. It then adds @dev to the system using device_add
 * The dev_t for the char device will be taken from the struct device which
 * needs to be initialized first. This helper function correctly takes a
 * reference to the parent device so the parent will not get released until
 * all references to the cdev are released.
 *
 * This helper uses dev->devt for the device number. If it is not set
 * it will not add the cdev and it will be equivalent to device_add.
 *
 * This function should be used whenever the struct cdev and the
 * struct device are members of the same structure whose lifetime is
 * managed by the struct device.
 *
 * NOTE: Callers must assume that userspace was able to open the cdev and
 * can call cdev fops callbacks at any time, even if this function fails.
 */
int cdev_device_add(struct cdev *cdev, struct device *dev)
{
	int rc = 0;

	if (dev->devt) {
		cdev_set_parent(cdev, &dev->kobj);

		rc = cdev_add(cdev, dev->devt, 1);
		if (rc)
			return rc;
	}

	rc = device_add(dev);
	if (rc)
		cdev_del(cdev);

	return rc;
}
//device_create()是device_register()的封装，而device_register()则是device_add()的封装
struct device *device_create(struct class *class, struct device *parent,
                 dev_t devt, void *drvdata, const char *fmt, ...)
{
    ......
    dev = device_create_vargs(class, parent, devt, drvdata, fmt, vargs);
    ......
    return dev;
}
struct device *device_create_vargs(struct class *class, struct device *parent,
                   dev_t devt, void *drvdata, const char *fmt,
                   va_list args)
{
    ......

    dev->devt = devt;
    dev->class = class;
    dev->parent = parent;
    dev->release = device_create_release;
    dev_set_drvdata(dev, drvdata);
    ......
    retval = device_register(dev);
    ......
}
int device_register(struct device *dev)
{
    device_initialize(dev);
    return device_add(dev);
}
```

[device_create()、device_register()、deivce_add()区别](https://blog.csdn.net/zifehng/article/details/73844845)



> CMB

 但是如果CPU将整条指令而不是指针直接写到SSD端的DRAM的话，并不耗费太多资源，此时能够节省一次PCIE往返及一次SSD控制器内部的中断处理。于是，人们就想将SSD控制器上的一小段DRAM空间映射到host物理地址空间从而可以让驱动直接写指令进去，甚至写一些数据进去也是可以的。这块被映射到host物理地址空间的DRAM空间便被称为CMB了。CMB的主要作用是把SQ/CQ存储的位置从host memory搬到device memory来提升性能，改善延时



> 通用DMA层与一致性DMA映射

```c
void * dma_alloc_coherent(struct device *dev,    size_t size, dma_addr_t  *dma_handle, gfp_t gfp)
```

dma_alloc_coherent() -- 获取物理页，并将该物理页的总线地址保存于dma_handle，返回该物理页的虚拟地址

DMA映射建立了一个新的结构类型---------dma_addr_t来表示总线地址。dma_addr_t类型的变量对驱动程序是不透明的；唯一允许的操作是将它们传递给DMA支持例程以及设备本身。作为一个总线地址，如果CPU直接使用了dma_addr_t，将会导致发生不可预期的后果！

一致性DMA映射存在与驱动程序的生命周期中，它的缓冲区必须可同时被CPU和外围设备访问！因此一致性映射必须保存在一致性缓存中。建立和使用一致性映射的开销是很大的！

[DMA内存申请--dma_alloc_coherent 及 寄存器与内存](https://www.cnblogs.com/sky-heaven/p/9579742.html)

见《LINUX设备驱动程序(第3版)》第十五章



> struct blk_mq_tag_set结构体

描述一个块设备硬件相关的数据结构，包含硬件队列的数量，队列深度，分配给每个硬件队列的rq管理集合，还包含了软件队列与硬件队列的映射表。blk_mq_tag_set可以被多个request_queue共享，其中也包含了共享tag_set的request_queue链表

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



> A block device driver can accept a request before the previous one is completed. As a consequence, the upper layers need a way to know when a request is completed. For this, a "tag" is added to each request upon submission and sent back using a completion notification after the request is completed.
>
> The tags are part of a tag set (`struct blk_mq_tag_set`), which is unique to a device. The tag set structure is allocated and initialized before the request queues and also stores some of the queues properties.

```c
//示例
#include <linux/fs.h>
#include <linux/genhd.h>
#include <linux/blkdev.h>

static struct my_block_dev {
    //...
    struct blk_mq_tag_set tag_set;
    struct request_queue *queue;
    //...
} dev;

static blk_status_t my_block_request(struct blk_mq_hw_ctx *hctx,
                                     const struct blk_mq_queue_data *bd)
//...

static struct blk_mq_ops my_queue_ops = {
   .queue_rq = my_block_request,
};

static int create_block_device(struct my_block_dev *dev)
{
    /* Initialize tag set. */
    dev->tag_set.ops = &my_queue_ops;
    dev->tag_set.nr_hw_queues = 1;
    dev->tag_set.queue_depth = 128;
    dev->tag_set.numa_node = NUMA_NO_NODE;
    dev->tag_set.cmd_size = 0;
    dev->tag_set.flags = BLK_MQ_F_SHOULD_MERGE;
    err = blk_mq_alloc_tag_set(&dev->tag_set);
    if (err) {
        goto out_err;
    }

    /* Allocate queue. */
    dev->queue = blk_mq_init_queue(&dev->tag_set);
    if (IS_ERR(dev->queue)) {
        goto out_blk_init;
    }

    blk_queue_logical_block_size(dev->queue, KERNEL_SECTOR_SIZE);

     /* Assign private data to queue structure. */
    dev->queue->queuedata = dev;
    //...

out_blk_init:
    blk_mq_free_tag_set(&dev->tag_set);
out_err:
    return -ENOMEM;
}
```










---
title: BAR空间测试代码
date: 2022-04-18 10:21:53
tags: pcie
categories: 内核驱动开发记录
---
<meta name="referrer" content="no-referrer" />



魔改nvme驱动pci.c代码
### verison1
```cpp
#include "xlinux.h"

static int xlinux_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
  printk(KERN_INFO "Hello, xlinux!\n");
  printk(KERN_INFO "id ven:%x dev:%x\n", id->vendor, id->device);

  int node;
  int result = -ENOMEM;
  struct xlinux_dev *dev;

  node = dev_to_node(&pdev->dev);  // 获取device的numa_node成员
  if (node == NUMA_NO_NODE) set_dev_node(&pdev->dev, first_memory_node);

  dev = kzalloc_node(sizeof(*dev), GFP_KERNEL, node);  // 从特定的内存节点分配全零内存
  if (!dev) return -ENOMEM;

  if (pci_enable_device_mem(pdev)) return result;  // 初始化设备内存空间

  pci_set_master(pdev);	// 使设备具备申请使用PCI总线的能力

  int size = pci_resource_len(pdev, 0);
  dev->bar = ioremap(pci_resource_start(pdev, 0), size);  // 进行地址映射 bar为void __iomem *类型变量

  printk(KERN_INFO "read test1: %d\n", readl(dev->bar + 1000));
  writel(666, dev->bar + 1000);
  printk(KERN_INFO "read test2: %d\n", readl(dev->bar + 1000));

  return 0;
}

static void xlinux_remove(struct pci_dev *pdev) { printk(KERN_INFO "Godbye, xlinux!\n"); }

static const struct pci_device_id xlinux_id_table[] = {
    {.vendor = 0x10ee, .device = 0x7024, .subvendor = PCI_ANY_ID, .subdevice = PCI_ANY_ID, 0, 0},
    {
        0,
    }};

MODULE_DEVICE_TABLE(pci, xlinux_id_table);

static struct pci_driver xlinux_driver = {
    .name = "xlinux",
    .id_table = xlinux_id_table,
    .probe = xlinux_probe,
    .remove = xlinux_remove,
};

static int __init xlinux_init(void) {
  printk(KERN_INFO "init, xlinux!\n");
  return pci_register_driver(&xlinux_driver);
}

static void __exit xlinux_exit(void) { pci_unregister_driver(&xlinux_driver); }

MODULE_LICENSE("GPL");
MODULE_VERSION("1.0");
// MODULE_INFO(intree, "Y");
module_init(xlinux_init);
module_exit(xlinux_exit);

```
![](https://img-blog.csdnimg.cn/2228b932a03a490f8d32cba5638177b3.png)
### version2
在remove函数中需把probe函数申请的一系列资源全部释放，例如注销定时器，注销设备，释放内存，取消内存映射，减小设备引用计数等。
```cpp
#include "xlinux.h"

static int xlinux_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
  printk(KERN_INFO "Hello,device!\n");
  printk(KERN_INFO "id ven:%x dev:%x\n", id->vendor, id->device);

  int node;
  int result = -ENOMEM;

  node = dev_to_node(&pdev->dev);  // 获取device的numa_node成员
  if (node == NUMA_NO_NODE) set_dev_node(&pdev->dev, first_memory_node);
  struct xlinux_dev *xlinux_dev = kzalloc_node(sizeof(*xlinux_dev), GFP_KERNEL, node);  // 从特定的内存节点分配全零内存
  if (!xlinux_dev) return -ENOMEM;

  pci_set_drvdata(pdev, xlinux_dev);               //  把设备指针地址放入PCI设备中的设备指针中，便于后面调用pci_get_drvdata
  if (pci_enable_device_mem(pdev)) return result;  // 初始化设备内存空间

  pci_set_master(pdev);  // 使设备具备申请使用PCI总线的能力

  int size = pci_resource_len(pdev, 0);
  phys_addr_t phy_addr = pci_resource_start(pdev, 0);
  unsigned long flag = pci_resource_flags(pdev, 0);
  xlinux_dev->bar = ioremap(phy_addr, size);  // 进行地址映射

  printk(KERN_INFO "****BAR INFO****\n");
  printk(KERN_INFO "BAR0 start:0x%llx\n", phy_addr);
  printk(KERN_INFO "BAR0 size:%d\n", size);
  printk(KERN_INFO "BAR0 flag:0x%lx\n", flag);
  printk(KERN_INFO "virt add:0x%p\n", xlinux_dev->bar);

  printk(KERN_INFO "read test1: %d\n", readl(xlinux_dev->bar + 2000));
  writel(666, xlinux_dev->bar + 2000);
  printk(KERN_INFO "read test2: %d\n", readl(xlinux_dev->bar + 2000));

  return 0;
}

static void xlinux_remove(struct pci_dev *pdev) {
  printk(KERN_INFO "Godbye, device!\n");
  struct xlinux_dev *xlinux_dev = pci_get_drvdata(pdev);  //从私有数据指针中取出设备指针
  iounmap(xlinux_dev->bar);                               //取消映射
  kfree(xlinux_dev);                                      // 释放申请的内存
}

static const struct pci_device_id xlinux_id_table[] = {{.vendor = 0x10ee, .device = 0x7024, .subvendor = PCI_ANY_ID, .subdevice = PCI_ANY_ID, 0, 0},
                                                       {
                                                           0,
                                                       }};

MODULE_DEVICE_TABLE(pci, xlinux_id_table);

static struct pci_driver xlinux_driver = {
    .name = "xlinux",
    .id_table = xlinux_id_table,
    .probe = xlinux_probe,
    .remove = xlinux_remove,
};

static int __init xlinux_init(void) {
  printk(KERN_INFO "init xlinux driver!\n");
  return pci_register_driver(&xlinux_driver);
}

static void __exit xlinux_exit(void) {
  printk(KERN_INFO "exit xlinux driver!\n");
  pci_unregister_driver(&xlinux_driver);
}

MODULE_LICENSE("GPL");
MODULE_VERSION("1.0");
// MODULE_INFO(intree, "Y");
module_init(xlinux_init);
module_exit(xlinux_exit);

```
![](https://img-blog.csdnimg.cn/5df8a410a80840b5bd7a640bbd9d6579.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_12,color_FFFFFF,t_70,g_se,x_16)

### 附录
参考博客
[PCIe实践之路：Linux访问PCIe空间](https://blog.csdn.net/abcamus/article/details/77825129)
[内核request_mem_region 和 ioremap的理解](https://blog.csdn.net/skyflying2012/article/details/8672011)
[Linux内核device结构体分析](https://www.cnblogs.com/Cqlismy/p/11507216.html)

结构体
**struct xlinux_dev**
```c
struct xlinux_dev {
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
  void **host_mem_desc_bufs;
};
```

**struct pci_device_id** 
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

static inline void *pci_get_drvdata(struct pci_dev *pdev)
{
	return dev_get_drvdata(&pdev->dev);
}
static inline void *dev_get_drvdata(const struct device *dev)
{
	return dev->driver_data;
}
```
**struct device**
Linux内核中的设备驱动模型，是建立在sysfs设备文件系统和kobject上的，由总线（bus）、设备（device）、驱动（driver）和类（class）所组成的关系结构，在底层，Linux系统中的每个设备都有一个device结构体的实例
```c
struct device {
	struct kobject kobj;
	struct device		*parent;

	struct device_private	*p;

	const char		*init_name; /* initial name of the device */
	const struct device_type *type;

	struct bus_type	*bus;		/* type of bus device is on */
	struct device_driver *driver;	/* which driver has allocated this
					   device */
	void		*platform_data;	/* Platform specific data, device
					   core doesn't touch it */
	void		*driver_data;	/* Driver data, set and get with
					   dev_set_drvdata/dev_get_drvdata */
#ifdef CONFIG_PROVE_LOCKING
	struct mutex		lockdep_mutex;
#endif
	struct mutex		mutex;	/* mutex to synchronize calls to
					 * its driver.
					 */

	struct dev_links_info	links;
	struct dev_pm_info	power;
	struct dev_pm_domain	*pm_domain;

#ifdef CONFIG_ENERGY_MODEL
	struct em_perf_domain	*em_pd;
#endif

#ifdef CONFIG_GENERIC_MSI_IRQ_DOMAIN
	struct irq_domain	*msi_domain;
#endif
#ifdef CONFIG_PINCTRL
	struct dev_pin_info	*pins;
#endif
#ifdef CONFIG_GENERIC_MSI_IRQ
	struct list_head	msi_list;
#endif
#ifdef CONFIG_DMA_OPS
	const struct dma_map_ops *dma_ops;
#endif
	u64		*dma_mask;	/* dma mask (if dma'able device) */
	u64		coherent_dma_mask;/* Like dma_mask, but for
					     alloc_coherent mappings as
					     not all hardware supports
					     64 bit addresses for consistent
					     allocations such descriptors. */
	u64		bus_dma_limit;	/* upstream dma constraint */
	const struct bus_dma_region *dma_range_map;

	struct device_dma_parameters *dma_parms;

	struct list_head	dma_pools;	/* dma pools (if dma'ble) */

#ifdef CONFIG_DMA_DECLARE_COHERENT
	struct dma_coherent_mem	*dma_mem; /* internal for coherent mem
					     override */
#endif
#ifdef CONFIG_DMA_CMA
	struct cma *cma_area;		/* contiguous memory area for dma
					   allocations */
#endif
	/* arch specific additions */
	struct dev_archdata	archdata;

	struct device_node	*of_node; /* associated device tree node */
	struct fwnode_handle	*fwnode; /* firmware device node */

#ifdef CONFIG_NUMA
	int		numa_node;	/* NUMA node this device is close to */
#endif
	dev_t			devt;	/* dev_t, creates the sysfs "dev" */
	u32			id;	/* device instance */

	spinlock_t		devres_lock;
	struct list_head	devres_head;

	struct class		*class;
	const struct attribute_group **groups;	/* optional groups */

	void	(*release)(struct device *dev);
	struct iommu_group	*iommu_group;
	struct dev_iommu	*iommu;

	bool			offline_disabled:1;
	bool			offline:1;
	bool			of_node_reused:1;
	bool			state_synced:1;
#if defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_DEVICE) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU_ALL)
	bool			dma_coherent:1;
#endif
#ifdef CONFIG_DMA_OPS_BYPASS
	bool			dma_ops_bypass : 1;
#endif
};

```


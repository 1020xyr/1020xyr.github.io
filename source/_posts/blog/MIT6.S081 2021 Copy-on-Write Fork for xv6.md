---
title: MIT6.S081 2021 Copy-on-Write Fork for xv6
date: 2022-05-24 10:44:14
tags: 6.081 COW
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


## 简要介绍
>There is a saying in computer systems that any systems problem can be solved with a level of indirection.
任何系统问题都能通过一个中间层解决

 - 修改uvmcopy() 函数，将父进程物理页映射子进程，而不是分配新的物理页。清除父进程与子进程页表项的PTE_W项
 - 修改usertrap() 函数，识别页错误，当cow页发生页错误时，分配新的物理页，并将PTE_W位置位
 - 确保物理页只有在没有进程引用时才释放——使用引用计数
 - 以同样的方式修改copyout() 函数


使用[risc-v手册](http://riscvbook.com/chinese/RISC-V-Reader-Chinese-v2p1.pdf)，全局搜索scause，找到寄存器状态定义
![](https://img-blog.csdnimg.cn/767349db4fc647da9ce79305fad961e9.png)
可以看出scause=15时为写入页错误
![](https://img-blog.csdnimg.cn/c094abfe8bdb4df5a95c1845e24aeb9c.png)
由上图可知，出错时的虚拟地址保存在stval寄存器中（前缀为risc-v的权限模式，m为机器模式，s为监管者模式，详见第十章 RV32/64 特权架构）
![](https://img-blog.csdnimg.cn/98df020abd55433c84b22c4df7924c16.png)
RSW位为8,9位，选择第8位当做cow标志位

 - 对于引用计数，开始以为需要申请页来放置引用计数，可又不知道要申请多少页，如果使用页的管理与访问太麻烦了，没想到可以直接用数组。
   
  - 当虚拟地址对应的物理页引用次数为1时，不需要申请新的物理页，修改权限即可
   
   - 为了不改变只读的页的权限，在uvmcopy函数中只对可写的页进行cow位的置换
## debug
在实验的时候，我一直考虑锁的粒度和死锁的问题，最开始我使用的一个物理页一个锁，不知道为啥遇到了莫名其妙的内核读错误，后就改成了所有物理页引用计数使用一个锁，但还是遇到许多的问题，以下简要记录一下debug的记录。

> 当写完大体代码后，我发现了一个问题，中断函数与copyout函数都使用了相同的锁，如果撞在一起，发生死锁怎么办？

阅读acquire函数后成发现这里实现的实际上是spin_lock_irq而不是spin_lock，每当请求锁时都会关中断。不过后面想想这两个函数好像撞不到一起，即使不关中断也无所谓。

```c
void
acquire(struct spinlock *lk)
{
  push_off(); // disable interrupts to avoid deadlock.
  if(holding(lk))
    panic("acquire");
  while(__sync_lock_test_and_set(&lk->locked, 1) != 0)
    ;
  __sync_synchronize();
  lk->cpu = mycpu();
}
```
[linux内核 spin_lock和spin_lock_irq的区别及注意点](https://blog.csdn.net/frank_zyp/article/details/90233098)

由于遇到一些难以理解的问题。我打算使用gdb进行调试，参照博客[MIT 6S081 qemu-gdb debug调试新手指南!!!!](https://zhuanlan.zhihu.com/p/354794701)，但好像ecall断点有点麻烦，我也没调试出啥东西。最后还是回归到老本行printf语句。

**对于这个实验，我写的最哈人的bug就是以下这两行语句**
```c
 uvmunmap(pagetable, va, 1, 1);  // 取消映射
 flags = (*pte | PTE_W) & ~PTE_COW; // 修改标志位信息
```
这有两个错误，第一个错误是在 uvmunmap函数后使用\*pte，因为uvmunmap函数中将\*pte设成了0。
第二个错误是我为了省事，没使用PTE_FLAGS宏获取标志位信息，这个才引发了连锁反应。我明明申请了新的物理页，并且和虚拟地址对应起来。但walkaddr的结果有时候还是旧物理页的地址。我写了一堆printf函数也没发现是啥问题，最后才发现是flag的问题。在mappages函数中
```c
*pte = PA2PTE(pa) | perm | PTE_V;
```
直接与flag进行或操作，导致映射的物理地址也发生了变化。我觉得这种实现也不太合理。。。

修改完之后cowtest测试就全过了，但usertests就G了。

**usertests测试**
才知道可以make qemu后再运行usertests，以前都直接make grade看结果，主要是之前也没怎么debug。
对每个出错的测试使用经典的printf语句，分析出错的原因。

第一个问题就是使用无符号整数作为返回值，导致返回值一直大于0，主要是我想将返回值既表示操作成功与否的标志，又当做虚拟地址对应的物理地址。
```c
uint64 address_translation_wiht_cow_page(uint64 va, pagetable_t pagetable) // 存在cow页时的虚拟地址转换

typedef unsigned long uint64;
返回-1时为最大正数
```

另外一个问题是实现时复制uvmcopy函数代码，使用了panic函数，一直没出结果，实际上只需要返回-1即可
```c
void
panic(char *s)
{
  pr.locking = 0;
  printf("panic: ");
  printf(s);
  printf("\n");
  panicked = 1; // freeze uart output from other CPUs
  for(;;)
    ;
}

```

## 代码参考

```c
// defs.h
void acquire_rc_lock();
void release_rc_lock();
void set_ref_cnt(uint64 pa, int cnt);
int get_ref_cnt(uint64 pa);
int inc_ref_cnt(uint64 pa);
int dec_ref_cnt(uint64 pa);
int address_translation_wiht_cow_page(uint64 va, pagetable_t pagetable);

// riscv.h
#define PTE_COW (1L << 8) // cow bit

// kalloc.c
#include "types.h"
#include "param.h"
#include "memlayout.h"
#include "spinlock.h"
#include "riscv.h"
#include "defs.h"

void freerange(void *pa_start, void *pa_end);

extern char end[]; // first address after kernel.
                   // defined by kernel.ld.

struct run
{
    struct run *next;
};

struct
{
    struct spinlock lock;
    struct run *freelist;
} kmem;

#define RC_SIZE PHYSTOP / PGSIZE + 1
struct
{
    struct spinlock lock; // 物理页引用计数相关锁
    int cnt[RC_SIZE];     // 记录物理页的引用计数
} rc;

void kinit()
{
    initlock(&kmem.lock, "kmem");
    initlock(&rc.lock, "rc"); // 初始化引用计数锁
    freerange(end, (void *)PHYSTOP);
}

void freerange(void *pa_start, void *pa_end)
{
    char *p;
    p = (char *)PGROUNDUP((uint64)pa_start);
    for (; p + PGSIZE <= (char *)pa_end; p += PGSIZE)
    {
        set_ref_cnt((uint64)p, 1); // 设置物理页的引用计数为1，配合之后的kree函数
        kfree(p);
    }
}


void kfree(void *pa)
{
    struct run *r;

    if (((uint64)pa % PGSIZE) != 0 || (char *)pa < end || (uint64)pa >= PHYSTOP)
        panic("kfree");
    int cnt = dec_ref_cnt((uint64)pa); // 减小物理页引用计数
    if (cnt > 0)                       // 仍有进程引用该页，直接返回
    {
        return;
    }
    // Fill with junk to catch dangling refs.
    memset(pa, 1, PGSIZE);

    r = (struct run *)pa;

    acquire(&kmem.lock);
    r->next = kmem.freelist;
    kmem.freelist = r;
    release(&kmem.lock);
}

void *kalloc(void)
{
    struct run *r;

    acquire(&kmem.lock);
    r = kmem.freelist;
    if (r)
        kmem.freelist = r->next;
    release(&kmem.lock);

    if (r)
        memset((char *)r, 5, PGSIZE); // fill with junk

    if (r)
        set_ref_cnt((uint64)r, 1); // 将引用计数设置为1
    return (void *)r;
}

void acquire_rc_lock() // 请求物理页引用计数锁
{
    acquire(&rc.lock);
}

void release_rc_lock() // 释放物理页引用计数锁
{
    release(&rc.lock);
}

void set_ref_cnt(uint64 pa, int cnt) // 设置物理页引用计数
{
    uint64 pfn = pa / PGSIZE;
    rc.cnt[pfn] = cnt;
}

int get_ref_cnt(uint64 pa) // 获取物理页引用计数
{
    uint64 pfn = pa / PGSIZE;
    return rc.cnt[pfn];
}

int inc_ref_cnt(uint64 pa) // 增加物理页引用计数
{
    uint64 pfn = pa / PGSIZE;
    rc.cnt[pfn]++;
    return rc.cnt[pfn];
}

int dec_ref_cnt(uint64 pa) // 减小物理页引用计数
{
    uint64 pfn = pa / PGSIZE;
    rc.cnt[pfn]--;
    return rc.cnt[pfn];
}

// vm.c
int uvmcopy(pagetable_t old, pagetable_t new, uint64 sz)
{
    pte_t *pte;
    uint64 pa, i;
    uint flags;

    acquire_rc_lock(); // 请求引用计数锁
    for (i = 0; i < sz; i += PGSIZE)
    {
        if ((pte = walk(old, i, 0)) == 0)
            panic("uvmcopy: pte should exist");
        if ((*pte & PTE_V) == 0)
            panic("uvmcopy: page not present");
        pa = PTE2PA(*pte);
        if (*pte & PTE_W) // 若该页可写，将cow位置位并将w位清零
        {
            *pte |= PTE_COW;
            *pte &= ~PTE_W;
        }
        flags = PTE_FLAGS(*pte);
        if (mappages(new, i, PGSIZE, pa, flags) != 0) // 子进程映射到相同的物理页上
        {
            goto err;
        }
        inc_ref_cnt(pa); // 增加物理页引用计数
    }
    release_rc_lock(); // 释放引用计数锁
    return 0;

err:
    uvmunmap(new, 0, i / PGSIZE, 1); // 取消映射并调用kree函数
    release_rc_lock();               // 释放引用计数锁
    return -1;
}
int copyout(pagetable_t pagetable, uint64 dstva, char *src, uint64 len)
{
    uint64 n, va0, pa0;
    int res;
    while (len > 0)
    {
        va0 = PGROUNDDOWN(dstva);
        res = address_translation_wiht_cow_page(va0, pagetable); // cow页处理
        if (res < 0)
            return -1;
        pa0 = walkaddr(pagetable, va0);
        if (pa0 == 0)
        {
            return -1;
        }
        n = PGSIZE - (dstva - va0);
        if (n > len)
            n = len;
        memmove((void *)(pa0 + (dstva - va0)), src, n);

        len -= n;
        src += n;
        dstva = va0 + PGSIZE;
    }
    return 0;
}
int address_translation_wiht_cow_page(uint64 va, pagetable_t pagetable) // 存在cow页时的虚拟地址转换
{
    pte_t *pte;
    uint64 pa;
    uint flags;
    void *mem;

    if (va >= MAXVA) // 非法访问高位地址
    {
        return -1;
    }
    va = PGROUNDDOWN(va); // 将页偏移地址设为0
    if ((pte = walk(pagetable, va, 0)) == 0)
    {
        // panic("uvmcopy: pte should exist");
        printf("address_translation_wiht_cow_page: pte should exist\n");
        return -1;
    }

    if ((*pte & PTE_V) == 0)
    {
        //   panic("uvmcopy: page not present");
        printf("address_translation_wiht_cow_page: page not present\n");
        return -1;
    }

    if (*pte & PTE_W) // 不是cow页
    {
        return 0;
    }

    if (!(*pte & PTE_COW))
    {
        printf("cow bit isn't set\n");
        return -1;
    }
    pa = PTE2PA(*pte);
    if (pa > PHYSTOP)
    {
        printf("phy addr error\n");
        return -1;
    }
    
    acquire_rc_lock();             // 请求引用计数锁
    int ref_cnt = get_ref_cnt(pa); // 获取当前物理页引用计数
    if (ref_cnt == 1)              // 只有一个进程引用，直接修改权限
    {
        *pte |= PTE_W;
        *pte &= ~PTE_COW;
    }
    else
    {
        mem = kalloc(); // 申请新的物理页
        if (mem == 0)
        {
            printf("alloc memory failed\n");
            release_rc_lock();
            return -1;
        }
        memmove(mem, (void *)pa, PGSIZE); // 复制旧物理页内容
        // flags = (*pte | PTE_W) & ~PTE_COW;
        flags = (PTE_FLAGS(*pte) | PTE_W) & ~PTE_COW;                 // 获取旧物理页标志位信息并置换cow与w位
        uvmunmap(pagetable, va, 1, 1);                                // 取消对旧物理页的映射并调用kree函数
        if (mappages(pagetable, va, PGSIZE, (uint64)mem, flags) != 0) // 将虚拟地址映射到新物理页
        {
            release_rc_lock();
            return -1;
        }
    }
    release_rc_lock();
    return 0;
}

// trap.c
   else if (r_scause() == 15)
    {
        uint64 va = r_stval();                                         // 出错的虚拟地址
        int res = address_translation_wiht_cow_page(va, p->pagetable); // 进行地址转换
        if (res < 0)
        {
            p->killed = 1;
        }
    }
```

**测试通过截图**
修改grade-lab-cow的usertests timeout为1000
![](https://img-blog.csdnimg.cn/49e2a346caef41028aa0ef6402844377.png)

待补充：细粒度加锁代码
一直遇到以下错误
![](https://img-blog.csdnimg.cn/f0d22024a800498d9ac5163e78838379.png)

参考博客：
[MIT 6.s081 xv6-lab6-cow](https://zhuanlan.zhihu.com/p/429821940)

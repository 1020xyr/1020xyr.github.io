---
title: MIT6.S081 2021 networking
date: 2022-05-16 08:52:59
tags: MIT6.S081 network
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />



## console驱动与时钟中断
16550芯片相关介绍：[16550芯片课程介绍](https://www.docin.com/p-616662404.html)
由于不是学硬件的，一直没太搞懂这几个东西的交互关系是啥，我的理解是如下图所示。
![](https://img-blog.csdnimg.cn/5ae1fbaab0084d30b1f1c3fbb5a5fc27.png)
如果不看display这一边，那这个驱动是非常好懂的，正好和开头的介绍吻合，驱动存在两个上下文：内核进程上下文和中断上下文。分别对应consolewrite consoleread和uartintr三个函数。但我一直没看懂的是为啥uartintr函数有时候会调用两次WriteReg(THR, c);（ consputc，uartstart），不过我就当没有WriteReg来理解了，毕竟不是主要内容，简单看一下就成。

关于机器模式的介绍在[RISC-V手册](http://riscvbook.com/chinese/RISC-V-Reader-Chinese-v2p1.pdf)第十章 RV32/64 特权架构

## 网卡驱动背景
[Linux 网络子系统](https://cloud.tencent.com/developer/article/1883049)
>总结
send发包过程
1、网卡驱动创建tx descriptor ring（一致性DMA内存），将tx descriptor ring的总线地址写入网卡寄存器TDBA
2、协议栈通过dev_queue_xmit()将sk_buff下送网卡驱动
3、网卡驱动将sk_buff放入tx descriptor ring，更新TDT
4、DMA感知到TDT的改变后，找到tx descriptor ring中下一个将要使用的descriptor
5、DMA通过PCI总线将descriptor的数据缓存区复制到Tx FIFO
6、复制完后，通过MAC芯片将数据包发送出去
7、发送完后，网卡更新TDH，启动硬中断通知CPU释放数据缓存区中的数据包
recv收包过程
1、网卡驱动创建rx descriptor ring（一致性DMA内存），将rx descriptor ring的总线地址写入网卡寄存器RDBA
2、网卡驱动为每个descriptor分配sk_buff和数据缓存区，流式DMA映射数据缓存区，将数据缓存区的总线地址保存到descriptor
3、网卡接收数据包，将数据包写入Rx FIFO
4、DMA找到rx descriptor ring中下一个将要使用的descriptor
5、整个数据包写入Rx FIFO后，DMA通过PCI总线将Rx FIFO中的数据包复制到descriptor的数据缓存区
6、复制完后，网卡启动硬中断通知CPU数据缓存区中已经有新的数据包了，CPU执行硬中断函数：
NAPI（以e1000网卡为例）：e1000_intr() -> __napi_schedule() -> __raise_softirq_irqoff(NET_RX_SOFTIRQ)
非NAPI（以dm9000网卡为例）：dm9000_interrupt() -> dm9000_rx() -> netif_rx() -> napi_schedule() -> __napi_schedule() -> __raise_softirq_irqoff(NET_RX_SOFTIRQ)
7、ksoftirqd执行软中断函数net_rx_action()：
NAPI（以e1000网卡为例）：net_rx_action() -> e1000_clean() -> e1000_clean_rx_irq() -> e1000_receive_skb() -> netif_receive_skb()
非NAPI（以dm9000网卡为例）：net_rx_action() -> process_backlog() -> netif_receive_skb()
8、网卡驱动通过netif_receive_skb()将sk_buff上送协议栈

[网卡驱动的收发包流程](http://blog.chinaunix.net/uid-23204078-id-5752362.html)
>数据发送流程：根据skb赋值好发送描述符，然后告诉硬件进行发包
>数据接收流程：根据接收描述符的内容构造skb，拷贝数据，然后调用napi_gro_receive发给上层协议栈。

## 网卡驱动代码
>Your job is to complete e1000_transmit() and e1000_recv(), both in kernel/e1000.c, so that the driver can transmit and receive packets. You are done when make grade says your solution passes all the tests.

我本来打算先根据hints写出基本的代码，然后再看e1000的说明书，没想到根据hints写完之后就通过了全部测试，我都没打开过说明书，没想到花了一堆时间看xv6 book，驱动代码，网卡知识，最后半小时通过实验。不过这个实验的测试可谓是漏洞百出，我开始写的代码有很多都是错的，不过以下代码也很有可能是错的

```c
int e1000_transmit(struct mbuf *m) {
  // printf("e1000_transmit function start!\n");
  acquire(&e1000_lock);		// 获取自旋锁
  int tx_index = regs[E1000_TDT];
  if (!(tx_ring[tx_index].status & E1000_TXD_STAT_DD)) {
    printf("the E1000 hasn't finished the corresponding previous transmission request!\n");
    release(&e1000_lock);
    return -1;
  }
  if (tx_mbufs[tx_index] != 0) {
    mbuffree(tx_mbufs[tx_index]);
  }
  tx_mbufs[tx_index] = m;		// 保存mbuf指针，留待之后释放
  tx_ring[tx_index].addr = (uint64)m->head;
  tx_ring[tx_index].length = m->len;
  tx_ring[tx_index].cmd |= E1000_TXD_CMD_EOP | E1000_TXD_CMD_RS;
  regs[E1000_TDT] = (regs[E1000_TDT] + 1) % TX_RING_SIZE;
  release(&e1000_lock);	
  return 0;
}
static void e1000_recv(void) {
  // printf("e1000_recv function start!\n");
  int rx_index = (regs[E1000_RDT] + 1) % RX_RING_SIZE;
  while (rx_ring[rx_index].status & E1000_RXD_STAT_DD) {
    rx_mbufs[rx_index]->len = rx_ring[rx_index].length;
    net_rx(rx_mbufs[rx_index]);  // mbuf指针由net_rx释放
    rx_mbufs[rx_index] = mbufalloc(0);
    if (!rx_mbufs[rx_index]) panic("e1000");
    rx_ring[rx_index].addr = (uint64)rx_mbufs[rx_index]->head;
    rx_ring[rx_index].status = 0;
    rx_index = (rx_index + 1) % RX_RING_SIZE;
  }
  regs[E1000_RDT] = (rx_index - 1) % RX_RING_SIZE;
}
```
![](https://img-blog.csdnimg.cn/37efa05aa2c9416ab822e9db210824bd.png)
我开始写的那份代码，tx_ring[tx_index].cmd只设置了E1000_TXD_CMD_EOP（对着头文件猜的），理解错了return -1 so that the caller knows to free the mbuf.意思，以为都是caller释放mbuff空间，index有时候也忘了对长度取模。这样都过了全部测试，可见这测试有点水。

<mark>不过我仍然没太搞清楚的是为什么e1000_recv函数中不需要加锁？如果中断被另一个相同的中断打断呢？还是说在哪个地方禁止相同中断了。</mark>
ans：
>linux中的中断处理程序是无需重入的。当一个给定的中断处理程序正在执行时，相应的中断线在所有处理器上都会被屏蔽掉， 以防止在同一中断线上接收另一个新的中断。 通常情况下，所有其他的中断都是打开的，所以这些不同中断线上的其他中断都能被处理 ，但当前中断线总是被禁止的。由此可以看出，同一个中断处理程序绝对不会被同时调用以处理嵌套的中断。这极大的简化了中断处理程序的编写。

[linux 中断嵌套整理](http://blog.chinaunix.net/uid-28111044-id-3398997.html)

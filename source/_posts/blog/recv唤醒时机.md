---
title: recv唤醒时机
tags: tcp 系统调用
index_img: https://img-blog.csdnimg.cn/b2c2368fca144bccb35fc56cedb56989.jpeg
categories: 踩坑日记
---

<meta name="referrer" content="no-referrer" />



### 问题引出

#### 初始程序

首先从一个简单需求开始：编写C程序测试tcp收发包是否出错

服务端程序：将所有收到数据原封不动转发回去

客户端程序：发送一定数据后介绍返回数据并进行校验，看前后数据是否一致

代码实现如下：

```c
// server.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <netinet/tcp.h>
#include <netdb.h>
#include <errno.h>

int main(int argc, const char *argv[]) {
  int server_sockfd;               // 服务端套接字
  int client_sockfd;               // 客户端套接字
  struct sockaddr_in my_add;       // 服务器网络地址结构体
  struct sockaddr_in remote_addr;  // 客户端网络地址结构体
  socklen_t sin_size;
  memset(&my_add, 0, sizeof(my_add));   // 数据初始化--清零
  my_add.sin_family = AF_INET;          // 设置为IP通信
  my_add.sin_addr.s_addr = INADDR_ANY;  // 服务器IP地址--允许连接到所有本地地址上
  my_add.sin_port = htons(8000);        // 服务器端口号

  // 创建服务器端套接字--IPV4协议 ，面向连接通信，TCP协议
  if ((server_sockfd = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
    perror("socket");
    return 1;
  }

  // 将套接字绑定到服务器的网络地址上
  if (bind(server_sockfd, (struct sockaddr *)&my_add, sizeof(struct sockaddr)) < 0) {
    perror("bind");
    return 1;
  }

  // 监听连接请求--监听队列长度为5
  listen(server_sockfd, 5);
  sin_size = sizeof(struct sockaddr_in);

  // 等待客户端连接请求到达
  if ((client_sockfd = accept(server_sockfd, (struct sockaddr *)&remote_addr, &sin_size)) < 0) {
    perror("accept");
    return 1;
  }

  printf("accept client %s\n", inet_ntoa(remote_addr.sin_addr));
  char buf[1 << 20];
  int recv_cnt;
  int send_cnt;
  int send_sum = 0;
  int recv_sum = 0;

  // 接受客户端的数据并将其发送给客户端--recv返回接收到的字节数，send返回发送的字节数
  while ((recv_cnt = recv(client_sockfd, buf, 1 << 20, 0)) > 0) {
    send_cnt = send(client_sockfd, buf, recv_cnt, 0);
    if (send_cnt < 0) {
      perror("write");
      break;
    } else {
      send_sum += send_cnt;
      recv_sum += recv_cnt;
      printf("recv cnt:%d send cnt:%d\n", recv_cnt, send_cnt);
    }
  }
  printf("send sum:%d recv sum:%d\n", send_sum, recv_sum);

  close(client_sockfd);
  close(server_sockfd);

  return 0;
}
```

```c
// client.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <netinet/tcp.h>
#include <netdb.h>

int main(int argc, const char *argv[]) {
  int client_sockfd;
  struct sockaddr_in remota_addr;                // 服务器端网络地址结构体
  memset(&remota_addr, 0, sizeof(remota_addr));  // 数据初始化--清零
  remota_addr.sin_family = AF_INET;              // 设置为IPV4通信
  remota_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
  remota_addr.sin_port = htons(8000);  // 服务器端口号

  // 创建客户端套接字--Ipv4协议，面向连接通信，TCP协议
  // 成功，返回0 ，失败返回-1
  if ((client_sockfd = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
    perror("socket");
    return 1;
  }

  // 将套接字绑定到服务器的网络地址上
  if (connect(client_sockfd, (struct sockaddr *)&remota_addr, sizeof(struct sockaddr)) < 0) {
    perror("connect");
    return 1;
  }

  printf("connect to server\n");

  char send_buf[1 << 20];
  char recv_buf[1 << 20];
  int test_size = (1 << 19);
  int test_times = 10;
  int send_cnt;
  int recv_cnt;
  int send_sum = 0;
  int recv_sum = 0;

  srand(time(NULL));
  for (int i = 0; i < test_times; i++) {
    memset(send_buf, 0, sizeof(send_buf));
    memset(recv_buf, 0, sizeof(recv_buf));
    for (int j = 0; j < test_size; j++) {
      send_buf[j] = rand() % 255;
    }
    send_cnt = send(client_sockfd, send_buf, test_size, 0);
    if (send_cnt < 0) {
      perror("send failed");
      break;
    } else {
      send_sum += send_cnt;
      printf("send cnt:%d\n", send_cnt);
    }
    recv_cnt = recv(client_sockfd, recv_buf, test_size, 0);
    if (recv_cnt < 0) {
      perror("recv failed");
      break;
    } else {
      recv_sum += recv_cnt;
      printf("recv cnt:%d\n", recv_cnt);
    }

    int cmp_res = memcmp(send_buf, recv_buf, test_size);
    if (cmp_res != 0) {
      printf("[%d] data inconsistency\n", i);
    } else {
      printf("[%d] data consistency\n", i);
    }
  }
  printf("send sum:%d recv sum:%d\n", send_sum, recv_sum);
  close(client_sockfd);
  return 0;
}

```

```makefile
all: server client
LIBS = -lpthread 
server: server.c
	gcc -g -W -Wall -pthread $(LIBS) -o $@ $<

client: client.c
	gcc -W -Wall -o $@ $<
clean:
	rm server client
```



输出截图：

![](https://img-blog.csdnimg.cn/ba030cbb123e478f84af8b05b990844d.png)



首先观察客户端的输出，send cnt的结果都是512k，recv cnt前几次都是64k相近的数字，而后也变成了512k，发送与接收数据全部不一致，总共发送了5242880字节，但只接收了3866570字节。

然后观察服务端的输出，虽然客户端每次都发送512k，但服务端接收的则不一定为512k，总的发送字节数与接收字节均为5242880字节。



#### 解决总字节数不一致问题

以上代码中存在一些问题，首先解决客户端发送字节总数与接收字节总数不一致的问题，在client代码末尾尝试接收数据。

```c
// client.c
  printf("send sum:%d recv sum:%d\n", send_sum, recv_sum);
  // 添加以下代码段
  while (recv_sum < send_sum && (recv_cnt = recv(client_sockfd, recv_buf, 1 << 20, 0)) > 0) {
    recv_sum += recv_cnt;
    printf("recv cnt:%d recv sum:%d\n", recv_cnt, recv_sum);
  }
  close(client_sockfd);
```



输出截图：

![](https://img-blog.csdnimg.cn/4b8c25da56104ad085d16086617ad0d7.png)



可以看出实际上客户端是可以接收全部的5242880字节数据的，只是接收过程中出现了一些“错位”。

#### 解决数据不一致问题

接下来解决数据不一致的问题，想必大家已经意识到出现数据不一致的原因是**客户端没有及时接收全部数据**，例如服务端发过来512k，客户端第一次只收了64k，而后的448k留待下一次recv系统调用，但下一次客户端预期的数据是下一个512k，由此引起级联的数据不一致问题，这也是为什么之后即使接收了512k数据仍然不一致的原因。解决方法也比较简单：**每次接收全部的512k数据**。

简单修改client代码

```c
// client.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <netinet/tcp.h>
#include <netdb.h>

int main(int argc, const char *argv[]) {
  int client_sockfd;
  struct sockaddr_in remota_addr;                // 服务器端网络地址结构体
  memset(&remota_addr, 0, sizeof(remota_addr));  // 数据初始化--清零
  remota_addr.sin_family = AF_INET;              // 设置为IPV4通信
  remota_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
  remota_addr.sin_port = htons(8000);  // 服务器端口号

  // 创建客户端套接字--Ipv4协议，面向连接通信，TCP协议
  // 成功，返回0 ，失败返回-1
  if ((client_sockfd = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
    perror("socket");
    return 1;
  }

  // 将套接字绑定到服务器的网络地址上
  if (connect(client_sockfd, (struct sockaddr *)&remota_addr, sizeof(struct sockaddr)) < 0) {
    perror("connect");
    return 1;
  }

  printf("connect to server\n");

  char send_buf[1 << 20];
  char recv_buf[1 << 20];
  int test_size = (1 << 19);
  int test_times = 10;
  int send_cnt;
  int recv_cnt;
  int send_sum = 0;
  int recv_sum = 0;

  srand(time(NULL));
  for (int i = 0; i < test_times; i++) {
    memset(send_buf, 0, sizeof(send_buf));
    memset(recv_buf, 0, sizeof(recv_buf));
    for (int j = 0; j < test_size; j++) {
      send_buf[j] = rand() % 255;
    }
    send_cnt = send(client_sockfd, send_buf, test_size, 0);
    if (send_cnt < 0) {
      perror("send failed");
      break;
    } else {
      send_sum += send_cnt;
      printf("send cnt:%d ", send_cnt);
    }
    recv_cnt = recv(client_sockfd, recv_buf, test_size, 0);
    if (recv_cnt < 0) {
      perror("recv failed");
      break;
    } else {
      recv_sum += recv_cnt;
      printf("recv cnt:%d\n", recv_cnt);
    }
    // 接收全部的512K字节
    while (recv_cnt != test_size) {
      int curr_cnt = recv(client_sockfd, recv_buf + recv_cnt, test_size - recv_cnt, 0);
      if (curr_cnt < 0) {
        perror("recv failed");
        break;
      }
      recv_cnt += curr_cnt;
      recv_sum += curr_cnt;
      printf("curr cnt:%d  recv cnt:%d\n", curr_cnt, recv_cnt);
    }
    int cmp_res = memcmp(send_buf, recv_buf, test_size);
    if (cmp_res != 0) {
      printf("[%d] data inconsistency\n", i);
    } else {
      printf("[%d] data consistency\n", i);
    }
  }
  printf("send sum:%d recv sum:%d\n", send_sum, recv_sum);
  while (recv_sum < send_sum && (recv_cnt = recv(client_sockfd, recv_buf, 1 << 20, 0)) > 0) {
    recv_sum += recv_cnt;
    printf("recv cnt:%d recv sum:%d\n", recv_cnt, recv_sum);
  }
  close(client_sockfd);
  return 0;
}

```

输出截图：

![](https://img-blog.csdnimg.cn/78566451f5584540bc542e0a2941c1f8.png)



经过以上修改，发送与接收的数据不一致问题解决了，可以看出客户端有时候需要调用多次recv函数才能收完全部的数据，并且客户端recv cnt与服务端send cnt并不是完全对应的



### 问题分析

初始程序中预设实际上合乎情理，客户端向服务端发送一个TCP报文，即使报文过大，在IP层被拆分，但当所有报文到达对端时，都可以通过报文长度-标识字段-分片偏移字段重组，所以在传输层看来应该隐藏了拆分的细节。但这个预设存在两个问题：①IP报文的最大长度为65535字节（报文头部总长度字段16位）②TCP是面向字节流而不是面向报文的。





**相关博客：**

![](https://img-blog.csdnimg.cn/f3750c35ed4c4a2fac453849fd2be406.png)

![](https://img-blog.csdnimg.cn/29c3c68f96c441d6b36230fafc8b955b.png)

![](https://img-blog.csdnimg.cn/4ad235a3ebc44d558701d786d8b9eeb3.png)

[如何理解传输层的TCP面向字节流，UDP面向报文？二者是以是否会分段（mss）来定义？](https://www.zhihu.com/question/341865775)

![](https://img-blog.csdnimg.cn/14b92fcf42d94352b916c48d1116eed6.png)

![](https://img-blog.csdnimg.cn/7a94cce249b64fbb95c53aca49c210f4.png)

在以上测试程序中，采用了第一种方法，数据包长度为定长的512k

[怎么解决TCP网络传输「粘包」问题？](https://zhuanlan.zhihu.com/p/387256713)

![](https://img-blog.csdnimg.cn/3ebd2da792fa460ca839f686e4359c7a.png)

[动图图解！既然IP层会分片，为什么TCP层也还要分段？](https://juejin.cn/post/6961578444774146078)

![](https://img-blog.csdnimg.cn/94416cd704164cf3a33d35f16f99f6bd.png)

[连 TCP 这几个参数都不懂，回去等通知吧！（三）](https://learnku.com/articles/46249)



### 问题研究

由以上讨论可以引出许多问题

1. TCP分段在何时发生，与发送缓冲区大小的关系
2. TCP分段时报文长度是否需要保留在某个地方，还是直接丢弃，分段完后是否需要类似IP分片的重组操作（我倾向于没有，毕竟是面向字节流而不是面向报文）
3. 为什么大部分时候client第一次收到的数据长度都是65482，它是由哪些参数决定的
4. recv系统调用唤醒时机



我对第四个问题更加感兴趣一点，假设client持续收到来自server的数据包，有许多可选的实现方式：

①第一个数据包到来就立即唤醒recv系统调用阻塞线程，效率太低，每次只收mss大小的数据

②持续等待直到填满用户缓冲区，效率也比较低且存在不确定性。client并不知道server要发多少数据过来，recv函数中的n不知道该设置成多少，，假如说recv参数设置为64k，那么即使到达了64k-1的数据也不唤醒，有点不切实际



所以现存实现一定是两者的折中，在到达数据包大小（0，n]时唤醒recv线程，倾向于填满用户缓冲区但不应该是强制填满。



为了找到问题的答案，首先在[《Linux内核源代码情景分析》](https://github.com/yuebaii/books/blob/master/Linux%E5%86%85%E6%A0%B8%E6%BA%90%E4%BB%A3%E7%A0%81%E6%83%85%E6%99%AF%E5%88%86%E6%9E%90.pdf)书中找相关代码段的分析

**7.7 报文的接收与发送**

![](https://img-blog.csdnimg.cn/79633d64707446559028af44a63c5784.png)

![](https://img-blog.csdnimg.cn/2a890485ec8d4dc1a272e536226df00f.png)

**可以通过设置MSG_WAITALL标志强制填满用户缓冲区**

书中分析的代码是unix本地socket通信，不过tcp的处理流程类似，代码地址如下：[linux/v5.19.17/source/net/ipv4/tcp.c](https://elixir.bootlin.com/linux/v5.19.17/source/net/ipv4/tcp.c#L2324)

完整代码贴在后面，在此复制相关代码

```c
static int tcp_recvmsg_locked(struct sock *sk, struct msghdr *msg, size_t len, int flags, struct scm_timestamping_internal *tss, int *cmsg_flags) {
  struct tcp_sock *tp = tcp_sk(sk);
  int copied = 0;
  u32 peek_seq;
  u32 *seq;
  unsigned long used;
  int err;
  int target; /* Read at least this many bytes */
  long timeo;
  struct sk_buff *skb, *last;
  u32 urg_hole = 0;

  err = -ENOTCONN;
  target = sock_rcvlowat(sk, flags & MSG_WAITALL, len); 	// 书中的target

  do {
    u32 offset;

    /* Next get a buffer. */

    last = skb_peek_tail(&sk->sk_receive_queue);
    skb_queue_walk(&sk->sk_receive_queue, skb) {
      last = skb;
      offset = *seq - TCP_SKB_CB(skb)->seq;
      if (offset < skb->len) goto found_ok_skb;
      if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN) goto found_fin_ok;
    }

    /* Well, if we have backlog, try to process it now yet. */

    if (copied >= target && !READ_ONCE(sk->sk_backlog.tail)) break;

    if (copied >= target) {
      /* Do not sleep, just process backlog. */
      __sk_flush_backlog(sk);
    } else {  // 未达到target，睡眠
      /* Clean up the receive buffer for full frames taken by the user,
       * then send an ACK if necessary.  COPIED is the number of bytes
       * tcp_recvmsg has given to the user so far, it speeds up the
       * calculation of whether or not we must ACK for the sake of
       * a window update.
       */
      tcp_cleanup_rbuf(sk, copied);
      /**
       * sk_wait_data - wait for data to arrive at sk_receive_queue
       * @sk:    sock to wait on
       * @timeo: for how long
       * @skb:   last skb seen on sk_receive_queue
       *
       * Now socket state including sk->sk_err is changed only under lock,
       * hence we may omit checks after joining wait queue.
       * We check receive queue before schedule() only as optimization;
       * it is very likely that release_sock() added new data.
       */
      sk_wait_data(sk, &timeo, last);
    }
    continue;

  found_ok_skb:
    /* Ok so how much can we use? */
    used = skb->len - offset;
    if (len < used) used = len;

    if (!(flags & MSG_TRUNC)) {
      err = skb_copy_datagram_msg(skb, offset, msg, used);
    }

    WRITE_ONCE(*seq, *seq + used);
    copied += used;
    len -= used;

    tcp_rcv_space_adjust(sk);

  skip_copy:
    if (used + offset < skb->len) continue;

    if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN) goto found_fin_ok;
    if (!(flags & MSG_PEEK)) tcp_eat_recv_skb(sk, skb);
    continue;

  found_fin_ok:
    /* Process the FIN. */
    WRITE_ONCE(*seq, *seq + 1);
    if (!(flags & MSG_PEEK)) tcp_eat_recv_skb(sk, skb);
    break;
  } while (len > 0);

  /* According to UNIX98, msg_name/msg_namelen are ignored
   * on connected socket. I was just happy when found this 8) --ANK
   */

  /* Clean up data we have read: This will do ACK frames. */
  tcp_cleanup_rbuf(sk, copied);
  return copied;

out:
  return err;

recv_urg:
  err = tcp_recv_urg(sk, msg, len, flags);
  goto out;

recv_sndq:
  err = tcp_peek_sndq(sk, msg, len);
  goto out;
}
```



sk->sk_rcvlowat参数设置

[杂谈：一个有意思的TCP选项SO_RCVLOWAT](https://zhuanlan.zhihu.com/p/548094696)



基本原理已经弄明白了，懒得继续看了。。。

### 完整代码

#### tcp_recvmsg

```c

int tcp_recvmsg(struct sock *sk, struct msghdr *msg, size_t len, int flags,
		int *addr_len)
{
	int cmsg_flags = 0, ret;
	struct scm_timestamping_internal tss;

	if (unlikely(flags & MSG_ERRQUEUE))
		return inet_recv_error(sk, msg, len, addr_len);

	if (sk_can_busy_loop(sk) &&
	    skb_queue_empty_lockless(&sk->sk_receive_queue) &&
	    sk->sk_state == TCP_ESTABLISHED)
		sk_busy_loop(sk, flags & MSG_DONTWAIT);

	lock_sock(sk);
	ret = tcp_recvmsg_locked(sk, msg, len, flags, &tss, &cmsg_flags);
	release_sock(sk);

	if ((cmsg_flags || msg->msg_get_inq) && ret >= 0) {
		if (cmsg_flags & TCP_CMSG_TS)
			tcp_recv_timestamp(msg, sk, &tss);
		if (msg->msg_get_inq) {
			msg->msg_inq = tcp_inq_hint(sk);
			if (cmsg_flags & TCP_CMSG_INQ)
				put_cmsg(msg, SOL_TCP, TCP_CM_INQ,
					 sizeof(msg->msg_inq), &msg->msg_inq);
		}
	}
	return ret;
}
EXPORT_SYMBOL(tcp_recvmsg);
```



```c
/*
 *	This routine copies from a sock struct into the user buffer.
 *
 *	Technical note: in 2.3 we work on _locked_ socket, so that
 *	tricks with *seq access order and skb->users are not required.
 *	Probably, code can be easily improved even more.
 */

static int tcp_recvmsg_locked(struct sock *sk, struct msghdr *msg, size_t len,
			      int flags, struct scm_timestamping_internal *tss,
			      int *cmsg_flags)
{
	struct tcp_sock *tp = tcp_sk(sk);
	int copied = 0;
	u32 peek_seq;
	u32 *seq;
	unsigned long used;
	int err;
	int target;		/* Read at least this many bytes */
	long timeo;
	struct sk_buff *skb, *last;
	u32 urg_hole = 0;

	err = -ENOTCONN;
	if (sk->sk_state == TCP_LISTEN)
		goto out;

	if (tp->recvmsg_inq) {
		*cmsg_flags = TCP_CMSG_INQ;
		msg->msg_get_inq = 1;
	}
	timeo = sock_rcvtimeo(sk, flags & MSG_DONTWAIT);

	/* Urgent data needs to be handled specially. */
	if (flags & MSG_OOB)
		goto recv_urg;

	if (unlikely(tp->repair)) {
		err = -EPERM;
		if (!(flags & MSG_PEEK))
			goto out;

		if (tp->repair_queue == TCP_SEND_QUEUE)
			goto recv_sndq;

		err = -EINVAL;
		if (tp->repair_queue == TCP_NO_QUEUE)
			goto out;

		/* 'common' recv queue MSG_PEEK-ing */
	}

	seq = &tp->copied_seq;
	if (flags & MSG_PEEK) {
		peek_seq = tp->copied_seq;
		seq = &peek_seq;
	}

	target = sock_rcvlowat(sk, flags & MSG_WAITALL, len);

	do {
		u32 offset;

		/* Are we at urgent data? Stop if we have read anything or have SIGURG pending. */
		if (unlikely(tp->urg_data) && tp->urg_seq == *seq) {
			if (copied)
				break;
			if (signal_pending(current)) {
				copied = timeo ? sock_intr_errno(timeo) : -EAGAIN;
				break;
			}
		}

		/* Next get a buffer. */

		last = skb_peek_tail(&sk->sk_receive_queue);
		skb_queue_walk(&sk->sk_receive_queue, skb) {
			last = skb;
			/* Now that we have two receive queues this
			 * shouldn't happen.
			 */
			if (WARN(before(*seq, TCP_SKB_CB(skb)->seq),
				 "TCP recvmsg seq # bug: copied %X, seq %X, rcvnxt %X, fl %X\n",
				 *seq, TCP_SKB_CB(skb)->seq, tp->rcv_nxt,
				 flags))
				break;

			offset = *seq - TCP_SKB_CB(skb)->seq;
			if (unlikely(TCP_SKB_CB(skb)->tcp_flags & TCPHDR_SYN)) {
				pr_err_once("%s: found a SYN, please report !\n", __func__);
				offset--;
			}
			if (offset < skb->len)
				goto found_ok_skb;
			if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN)
				goto found_fin_ok;
			WARN(!(flags & MSG_PEEK),
			     "TCP recvmsg seq # bug 2: copied %X, seq %X, rcvnxt %X, fl %X\n",
			     *seq, TCP_SKB_CB(skb)->seq, tp->rcv_nxt, flags);
		}

		/* Well, if we have backlog, try to process it now yet. */

		if (copied >= target && !READ_ONCE(sk->sk_backlog.tail))
			break;

		if (copied) {
			if (!timeo ||
			    sk->sk_err ||
			    sk->sk_state == TCP_CLOSE ||
			    (sk->sk_shutdown & RCV_SHUTDOWN) ||
			    signal_pending(current))
				break;
		} else {
			if (sock_flag(sk, SOCK_DONE))
				break;

			if (sk->sk_err) {
				copied = sock_error(sk);
				break;
			}

			if (sk->sk_shutdown & RCV_SHUTDOWN)
				break;

			if (sk->sk_state == TCP_CLOSE) {
				/* This occurs when user tries to read
				 * from never connected socket.
				 */
				copied = -ENOTCONN;
				break;
			}

			if (!timeo) {
				copied = -EAGAIN;
				break;
			}

			if (signal_pending(current)) {
				copied = sock_intr_errno(timeo);
				break;
			}
		}

		if (copied >= target) {
			/* Do not sleep, just process backlog. */
			__sk_flush_backlog(sk);
		} else {
			tcp_cleanup_rbuf(sk, copied);
			sk_wait_data(sk, &timeo, last);
		}

		if ((flags & MSG_PEEK) &&
		    (peek_seq - copied - urg_hole != tp->copied_seq)) {
			net_dbg_ratelimited("TCP(%s:%d): Application bug, race in MSG_PEEK\n",
					    current->comm,
					    task_pid_nr(current));
			peek_seq = tp->copied_seq;
		}
		continue;

found_ok_skb:
		/* Ok so how much can we use? */
		used = skb->len - offset;
		if (len < used)
			used = len;

		/* Do we have urgent data here? */
		if (unlikely(tp->urg_data)) {
			u32 urg_offset = tp->urg_seq - *seq;
			if (urg_offset < used) {
				if (!urg_offset) {
					if (!sock_flag(sk, SOCK_URGINLINE)) {
						WRITE_ONCE(*seq, *seq + 1);
						urg_hole++;
						offset++;
						used--;
						if (!used)
							goto skip_copy;
					}
				} else
					used = urg_offset;
			}
		}

		if (!(flags & MSG_TRUNC)) {
			err = skb_copy_datagram_msg(skb, offset, msg, used);
			if (err) {
				/* Exception. Bailout! */
				if (!copied)
					copied = -EFAULT;
				break;
			}
		}

		WRITE_ONCE(*seq, *seq + used);
		copied += used;
		len -= used;

		tcp_rcv_space_adjust(sk);

skip_copy:
		if (unlikely(tp->urg_data) && after(tp->copied_seq, tp->urg_seq)) {
			WRITE_ONCE(tp->urg_data, 0);
			tcp_fast_path_check(sk);
		}

		if (TCP_SKB_CB(skb)->has_rxtstamp) {
			tcp_update_recv_tstamps(skb, tss);
			*cmsg_flags |= TCP_CMSG_TS;
		}

		if (used + offset < skb->len)
			continue;

		if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN)
			goto found_fin_ok;
		if (!(flags & MSG_PEEK))
			tcp_eat_recv_skb(sk, skb);
		continue;

found_fin_ok:
		/* Process the FIN. */
		WRITE_ONCE(*seq, *seq + 1);
		if (!(flags & MSG_PEEK))
			tcp_eat_recv_skb(sk, skb);
		break;
	} while (len > 0);

	/* According to UNIX98, msg_name/msg_namelen are ignored
	 * on connected socket. I was just happy when found this 8) --ANK
	 */

	/* Clean up data we have read: This will do ACK frames. */
	tcp_cleanup_rbuf(sk, copied);
	return copied;

out:
	return err;

recv_urg:
	err = tcp_recv_urg(sk, msg, len, flags);
	goto out;

recv_sndq:
	err = tcp_peek_sndq(sk, msg, len);
	goto out;
}
```



```c
static inline int sock_rcvlowat(const struct sock *sk, int waitall, int len)
{
	int v = waitall ? len : min_t(int, READ_ONCE(sk->sk_rcvlowat), len);

	return v ?: 1;
}

/* Make sure sk_rcvbuf is big enough to satisfy SO_RCVLOWAT hint */
int tcp_set_rcvlowat(struct sock *sk, int val)
{
	int cap;

	if (sk->sk_userlocks & SOCK_RCVBUF_LOCK)
		cap = sk->sk_rcvbuf >> 1;
	else
		cap = READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_rmem[2]) >> 1;
	val = min(val, cap);
	WRITE_ONCE(sk->sk_rcvlowat, val ? : 1);

	/* Check if we need to signal EPOLLIN right now */
	tcp_data_ready(sk);

	if (sk->sk_userlocks & SOCK_RCVBUF_LOCK)
		return 0;

	val <<= 1;
	if (val > sk->sk_rcvbuf) {
		WRITE_ONCE(sk->sk_rcvbuf, val);
		tcp_sk(sk)->window_clamp = tcp_win_from_space(sk, val);
	}
	return 0;
}
EXPORT_SYMBOL(tcp_set_rcvlowat);
```



#### FLAGS

```c
/* Bits in the FLAGS argument to `send', `recv', et al.  */
enum
  {
    MSG_OOB		= 0x01,	/* Process out-of-band data.  */
#define MSG_OOB		MSG_OOB
    MSG_PEEK		= 0x02,	/* Peek at incoming messages.  */
#define MSG_PEEK	MSG_PEEK
    MSG_DONTROUTE	= 0x04,	/* Don't use local routing.  */
#define MSG_DONTROUTE	MSG_DONTROUTE
#ifdef __USE_GNU
    /* DECnet uses a different name.  */
    MSG_TRYHARD		= MSG_DONTROUTE,
# define MSG_TRYHARD	MSG_DONTROUTE
#endif
    MSG_CTRUNC		= 0x08,	/* Control data lost before delivery.  */
#define MSG_CTRUNC	MSG_CTRUNC
    MSG_PROXY		= 0x10,	/* Supply or ask second address.  */
#define MSG_PROXY	MSG_PROXY
    MSG_TRUNC		= 0x20,
#define MSG_TRUNC	MSG_TRUNC
    MSG_DONTWAIT	= 0x40, /* Nonblocking IO.  */
#define MSG_DONTWAIT	MSG_DONTWAIT
    MSG_EOR		= 0x80, /* End of record.  */
#define MSG_EOR		MSG_EOR
    MSG_WAITALL		= 0x100, /* Wait for a full request.  */
#define MSG_WAITALL	MSG_WAITALL
    MSG_FIN		= 0x200,
#define MSG_FIN		MSG_FIN
    MSG_SYN		= 0x400,
#define MSG_SYN		MSG_SYN
    MSG_CONFIRM		= 0x800, /* Confirm path validity.  */
#define MSG_CONFIRM	MSG_CONFIRM
    MSG_RST		= 0x1000,
#define MSG_RST		MSG_RST
    MSG_ERRQUEUE	= 0x2000, /* Fetch message from error queue.  */
#define MSG_ERRQUEUE	MSG_ERRQUEUE
    MSG_NOSIGNAL	= 0x4000, /* Do not generate SIGPIPE.  */
#define MSG_NOSIGNAL	MSG_NOSIGNAL
    MSG_MORE		= 0x8000,  /* Sender will send more.  */
#define MSG_MORE	MSG_MORE
    MSG_WAITFORONE	= 0x10000, /* Wait for at least one packet to return.*/
#define MSG_WAITFORONE	MSG_WAITFORONE
    MSG_BATCH		= 0x40000, /* sendmmsg: more messages coming.  */
#define MSG_BATCH	MSG_BATCH
    MSG_ZEROCOPY	= 0x4000000, /* Use user data in kernel path.  */
#define MSG_ZEROCOPY	MSG_ZEROCOPY
    MSG_FASTOPEN	= 0x20000000, /* Send data in TCP SYN.  */
#define MSG_FASTOPEN	MSG_FASTOPEN

    MSG_CMSG_CLOEXEC	= 0x40000000	/* Set close_on_exit for file
					   descriptor received through
					   SCM_RIGHTS.  */
#define MSG_CMSG_CLOEXEC MSG_CMSG_CLOEXEC
  };
```



### UDP demo

简单udp收发demo，粘贴在此，便于以后复制

```c++
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <stdlib.h>
#include <string.h>
#include <vector>
#include <thread>

using namespace std;
int main(int argc, char *argv[]) {
  int server_sock_fd;
  struct sockaddr_in server_addr, client_addr;
  char recv_buf[(1 << 16)];
  int nbytes = 0;
  socklen_t len = 0;

  /* 创建Server Socket */
  server_sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
  if (server_sock_fd < 0) {
    printf("服务端Socket创建失败");
    return -1;
  }
  printf("服务端Socket创建成功\n");

  /* 绑定ip和端口 */
  bzero(&server_addr, sizeof(server_addr));
  server_addr.sin_family = AF_INET;
  server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
  server_addr.sin_port = htons(8081);  // 指定端口号
  bind(server_sock_fd, (struct sockaddr *)&server_addr, sizeof(server_addr));

  printf("服务端Socket绑定成功\n");

  auto recv_func = [&](int id) {
    int index = 0;
    while (1) {
      /* 接收UDP客户端的数据 */
      len = sizeof(client_addr);
      nbytes = recvfrom(server_sock_fd, recv_buf, 1 << 16, 0, (struct sockaddr *)&client_addr, &len);
      index++;
      printf("thread-%d %dth recv %s:%d %d bytes:%s.\n", id, index, inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port), nbytes, recv_buf);
    }
  };
  vector<thread> threads;
  for (int i = 0; i < 5; i++) {
    threads.emplace_back(recv_func, i);
  }
  for (int i = 0; i < 5; i++) {
    threads[i].join();
  }
  return 0;
}

```

```c++
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <stdlib.h>
#include <string.h>
#include <vector>
#include <thread>

using namespace std;

int main(int argc, char *argv[]) {
  struct sockaddr_in server_addr;

  int nbytes = 0;
  socklen_t len = 0;

  /* 绑定ip和端口 */
  bzero(&server_addr, sizeof(server_addr));
  server_addr.sin_family = AF_INET;
  server_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
  server_addr.sin_port = htons(8081);  // 指定端口号
  len = sizeof(server_addr);
  auto send_func = [&](int id) {
    char recv_buf[(1 << 16)];
    int test_size = 1 << 10;
    int sock_fd;
    /* 创建Socket */
    sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock_fd < 0) {
      printf("客户端Socket创建失败");
      return -1;
    }
    for (int i = 0; i < 10; i++) {
      nbytes = sendto(sock_fd, recv_buf, test_size, 0, (struct sockaddr *)(&server_addr), len);
      printf("thread-%d %dth send %d bytes:%s.\n", id, i, nbytes, recv_buf);
    }
  };

  vector<thread> threads;
  for (int i = 0; i < 10; i++) {
    threads.emplace_back(send_func, i);
  }
  for (int i = 0; i < 10; i++) {
    threads[i].join();
  }
  return 0;

  return 0;
}

```

```makefile
all: server client
LIBS = -lpthread 
server: server.cpp
	g++ -g -W -Wall -pthread $(LIBS) -o $@ $<

client: client.cpp
	g++ -g -W -Wall -pthread $(LIBS) -o $@ $<
clean:
	rm server client
```


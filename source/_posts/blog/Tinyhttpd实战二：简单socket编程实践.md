---
title: Tinyhttpd实战二：简单socket编程实践
date: 2020-02-15 23:36:51
tags: 
categories: 学习记录
---
<meta name="referrer" content="no-referrer" />



```cpp
//client.c
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


int main(int argc, const char * argv[]) {
    // insert code here...
    printf("Hello, World!\n");
    
    int client_sockfd;
    int len;
    struct sockaddr_in remota_addr; //服务器端网络地址结构体
    char buf[BUFSIZ];  //数据传送的缓冲区
    memset(&remota_addr,0,sizeof(remota_addr)); //数据初始化--清零
    remota_addr.sin_family = AF_INET;  //设置为IPV4通信
    remota_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    remota_addr.sin_port = htons(8000); //服务器端口号
    
    //创建客户端套接字--Ipv4协议，面向连接通信，TCP协议
    //成功，返回0 ，失败返回-1
    if ((client_sockfd=socket(PF_INET, SOCK_STREAM, 0))<0) {
        perror("socket");
        return 1;
    }
    
    //将套接字绑定到服务器的网络地址上
    if (connect(client_sockfd, (struct sockaddr *)&remota_addr, sizeof(struct sockaddr))<0) {
        perror("connect");
        return 1;
    }
    
    printf("connect to server\n");
    
    len = recv(client_sockfd, buf, BUFSIZ, 0); //接受服务器端消息
    buf[len]='\0';
    printf("%s\n",buf);  //打印服务器端消息
    
    //循环的发送信息并打印接受消息--recv返回接收到的字节数，send返回发送的字节数
    while (1) {
        printf("Enter string to send:");
        scanf("%s",buf);
        if (!strcmp(buf,"quit")) {
            break;
        }
        
        len=send(client_sockfd,buf,strlen(buf),0);
        len=recv(client_sockfd,buf,BUFSIZ,0);
        buf[len]='\0';
        printf("received:%s\n",buf);
        
    }
    
    close(client_sockfd);
    
    return 0;
}

```

```cpp
//server.c
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

int main(int argc, const char * argv[]) {
    // insert code here...
    printf("Hello, World!\n");
    
    int server_sockfd; //服务端套接字
    int client_sockfd; //客户端套接字
    int len;
    struct sockaddr_in my_add; //服务器网络地址结构体
    struct sockaddr_in remote_addr; //客户端网络地址结构体
    socklen_t sin_size;
    char buf[BUFSIZ]; //数据传送的缓冲区
    memset(&my_add,0,sizeof(my_add)); //数据初始化--清零
    my_add.sin_family = AF_INET; //设置为IP通信
    my_add.sin_addr.s_addr = INADDR_ANY; //服务器IP地址--允许连接到所有本地地址上
    my_add.sin_port = htons(8000); //服务器端口号
    
    //创建服务器端套接字--IPV4协议 ，面向连接通信，TCP协议
    if((server_sockfd=socket(PF_INET, SOCK_STREAM, 0))<0) {
        perror("socket");
        return 1;
    }
    
    //将套接字绑定到服务器的网络地址上
    if (bind(server_sockfd, (struct sockaddr *)&my_add, sizeof(struct sockaddr))<0) {
        perror("bind");
        return 1;
    }
    
    //监听连接请求--监听队列长度为5
    listen(server_sockfd, 5);
    sin_size = sizeof(struct sockaddr_in);
    
    //等待客户端连接请求到达
    if ((client_sockfd=accept(server_sockfd, (struct sockaddr *)&remote_addr, &sin_size))<0) {
        perror("accept");
        return 1;
    }
    
    printf("accept client %s\n",inet_ntoa(remote_addr.sin_addr));
    len = send(client_sockfd, "welcome to my server", 21, 0); //发送欢迎信息
    
    //接受客户端的数据并将其发送给客户端--recv返回接收到的字节数，send返回发送的字节数
    while ((len=recv(client_sockfd, buf, BUFSIZ, 0))>0) {
        buf[len]='\0';
        printf("receive:%s\n",buf);
        if (send(client_sockfd, buf, len, 0)<0) {
            perror("write");
            return 1;
        }
    }
    
    close(client_sockfd);
    close(server_sockfd);
    
    return 0;
}

```

```cpp
//Makefile
all: server client
LIBS = -lpthread 
server: server.c
	gcc -g -W -Wall -pthread $(LIBS) -o $@ $<

client: client.c
	gcc -W -Wall -o $@ $<
clean:
	rm server client
```
运行截图

客户端
![](https://img-blog.csdnimg.cn/20200215234313514.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
服务端
![](https://img-blog.csdnimg.cn/20200215234328863.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)

---
title: Tinyhttpd实战三：源码解析
date: 2020-02-15 23:21:08
tags: 
categories: 学习记录
---
<meta name="referrer" content="no-referrer" />


### 代码
#### 读代码时的一些建议
1 在代码运行成功后，在虚拟机中浏览器访问该程序，并根据代码流程，尝试各种各样的请求
即在firefox浏览器中，打开web developer中的network选项
![](https://img-blog.csdnimg.cn/20200227175134361.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
查看request 和responsed 内容
![](https://img-blog.csdnimg.cn/20200227175309742.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
点击edit and resend 自己编辑修改request请求并发送
![](https://img-blog.csdnimg.cn/20200227175516653.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
#### 加了一些注释的源代码
```cpp
/* J. David's webserver */
/* This is a simple webserver.
 * Created November 1999 by J. David Blackstone.
 * CSE 4344 (Network concepts), Prof. Zeigler
 * University of Texas at Arlington
 */
/* This program compiles for Sparc Solaris 2.6.
 * To compile for Linux:
 *  1) Comment out the #include <pthread.h> line.
 *  2) Comment out the line that defines the variable newthread.
 *  3) Comment out the two lines that run pthread_create().
 *  4) Uncomment the line that runs accept_request().
 *  5) Remove -lsocket from the Makefile.
 */
#include <stdio.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <ctype.h>
#include <strings.h>
#include <string.h>
#include <sys/stat.h>
#include <pthread.h>
#include <sys/wait.h>
#include <stdlib.h>
#include <stdint.h>

#define ISspace(x) isspace((int)(x))

#define SERVER_STRING "Server: jdbhttpd/0.1.0\r\n"
#define STDIN   0
#define STDOUT  1
#define STDERR  2

void accept_request(void *);
void bad_request(int);
void cat(int, FILE *);
void cannot_execute(int);
void error_die(const char *);
void execute_cgi(int, const char *, const char *, const char *);
int get_line(int, char *, int);
void headers(int, const char *);
void not_found(int);
void serve_file(int, const char *);
int startup(u_short *);
void unimplemented(int);

/**********************************************************************/
/* A request has caused a call to accept() on the server port to
 * return.  Process the request appropriately.
 * Parameters: the socket connected to the client */
/**********************************************************************/
void accept_request(void *arg)
{
    int client = (intptr_t)arg;
    char buf[1024];
    size_t numchars;
    char method[255];
    char url[255];
    char path[512];
    size_t i, j;
    struct stat st;
    int cgi = 0;      /* becomes true if server decides this is a CGI
                       * program */
    char *query_string = NULL;

    numchars = get_line(client, buf, sizeof(buf));
    i = 0; j = 0;
	
	/* 判断输入字符是否为空格/回车/制表符等，  
	 * 如果获取到的字符是空格/回车/制表符等，返回非0值（即真）；否则返回0 */
    while (!ISspace(buf[i]) && (i < sizeof(method) - 1)) 
    {
        method[i] = buf[i];
        i++;
    }
    j=i;
    method[i] = '\0';

	/* 函数说明： strcasecmp()用来比较参数s1 和s2 字符串，比较时会自动忽略大小写的差异。
	 * 返回值：若参数s1 和s2 字符串相同则返回0。s1 长度大于s2 长度则返回大于0 的值，s1 长度若小于s2 长度则返回小于0 的值。*/	
    if (strcasecmp(method, "GET") && strcasecmp(method, "POST"))
	/* 即不是GET方法，也不是POST方法
	 * GET - 从指定的资源请求数据。
	 * POST - 向指定的资源提交要被处理的数据*/
    {
        unimplemented(client);
        return;
    }

    if (strcasecmp(method, "POST") == 0)
        cgi = 1;

    i = 0;

	// 除去空格/回车/制表符等
    while (ISspace(buf[j]) && (j < numchars))
        j++;

	// i表示url长度
    while (!ISspace(buf[j]) && (i < sizeof(url) - 1) && (j < numchars))
    {
        url[i] = buf[j];
        i++; j++;
    }
    url[i] = '\0';

    if (strcasecmp(method, "GET") == 0)
    {
        query_string = url;
        while ((*query_string != '?') && (*query_string != '\0'))
            query_string++;
        if (*query_string == '?')
        {
            cgi = 1;
            *query_string = '\0';
            query_string++;
        }
    }
	/* sprintf()函数用于将格式化的数据写入字符串，其原型为：
     * int sprintf(char *str, char * format [, argument, ...]);
	 * arg：str为要写入的字符串；format为格式化字符串，与printf()函数相同；argument为变量。*/
    sprintf(path, "htdocs%s", url);

	// 补全index.html
    if (path[strlen(path) - 1] == '/')
        strcat(path, "index.html");

	/* 头文件: #include <sys/stat.h>  #include <unistd.h>
     * 定义: int stat(const char *file_name, struct stat *buf);
     * 说明: 通过文件名filename获取文件信息，并保存在buf所指的结构体stat中
     * 返回值: 执行成功则返回0，失败返回-1，错误代码存于errno*/

    if (stat(path, &st) == -1) {
        while ((numchars > 0) && strcmp("\n", buf))  /* read & discard headers */
            numchars = get_line(client, buf, sizeof(buf));

		// 未找到请求文件
        not_found(client);
    }
    else
    {	
		/* st_mode是用特征位来表示文件类型的
		 * S_IFMT      0170000     文件类型的位遮罩
		 * S_IFDIR     0040000     目录
		 * S_IXUSR     00100       文件所有者具可执行权限
		 * S_IXGRP     00010       用户组具可执行权
		 * S_IXOTH     00001       其他用户具可执行权限*/
        if ((st.st_mode & S_IFMT) == S_IFDIR)
            strcat(path, "/index.html");

        if ((st.st_mode & S_IXUSR) ||
                (st.st_mode & S_IXGRP) ||
                (st.st_mode & S_IXOTH)    )
            cgi = 1;
        if (!cgi)
            serve_file(client, path);
        else
            execute_cgi(client, path, method, query_string);
    }

    close(client);
}

/**********************************************************************/
/* Inform the client that a request it has made has a problem.
 * Parameters: client socket */
/**********************************************************************/
void bad_request(int client)
{
    char buf[1024];

    sprintf(buf, "HTTP/1.0 400 BAD REQUEST\r\n");
    send(client, buf, sizeof(buf), 0);
    sprintf(buf, "Content-type: text/html\r\n");
    send(client, buf, sizeof(buf), 0);
    sprintf(buf, "\r\n");
    send(client, buf, sizeof(buf), 0);
    sprintf(buf, "<P>Your browser sent a bad request, ");
    send(client, buf, sizeof(buf), 0);
    sprintf(buf, "such as a POST without a Content-Length.\r\n");
    send(client, buf, sizeof(buf), 0);
}

/**********************************************************************/
/* Put the entire contents of a file out on a socket.  This function
 * is named after the UNIX "cat" command, because it might have been
 * easier just to do something like pipe, fork, and exec("cat").
 * Parameters: the client socket descriptor
 *             FILE pointer for the file to cat */
/**********************************************************************/
void cat(int client, FILE *resource)
{
    char buf[1024];

    fgets(buf, sizeof(buf), resource);
    while (!feof(resource))
    {
        send(client, buf, strlen(buf), 0);
        fgets(buf, sizeof(buf), resource);
    }
}

/**********************************************************************/
/* Inform the client that a CGI script could not be executed.
 * Parameter: the client socket descriptor. */
/**********************************************************************/
void cannot_execute(int client)
{
    char buf[1024];

    sprintf(buf, "HTTP/1.0 500 Internal Server Error\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "Content-type: text/html\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "<P>Error prohibited CGI execution.\r\n");
    send(client, buf, strlen(buf), 0);
}

/**********************************************************************/
/* Print out an error message with perror() (for system errors; based
 * on value of errno, which indicates system call errors) and exit the
 * program indicating an error. */
/**********************************************************************/
void error_die(const char *sc)
{
    perror(sc);
    exit(1);
}

/**********************************************************************/
/* Execute a CGI script.  Will need to set environment variables as
 * appropriate.
 * Parameters: client socket descriptor
 *             path to the CGI script */
/**********************************************************************/
void execute_cgi(int client, const char *path,
        const char *method, const char *query_string)
{
    char buf[1024];
    int cgi_output[2];
    int cgi_input[2];
    pid_t pid;
    int status;
    int i;
    char c;
    int numchars = 1;
    int content_length = -1;

    buf[0] = 'A'; buf[1] = '\0';
    if (strcasecmp(method, "GET") == 0)
        while ((numchars > 0) && strcmp("\n", buf))  /* read & discard headers */
            numchars = get_line(client, buf, sizeof(buf));
    else if (strcasecmp(method, "POST") == 0) /*POST*/
    {
        numchars = get_line(client, buf, sizeof(buf));
        while ((numchars > 0) && strcmp("\n", buf))
        {
            buf[15] = '\0';
            if (strcasecmp(buf, "Content-Length:") == 0)
                content_length = atoi(&(buf[16]));
			// Content-Length用于描述HTTP消息实体的传输长度
            numchars = get_line(client, buf, sizeof(buf));
        }
        if (content_length == -1) {
			// 错误请求
            bad_request(client);
            return;
        }
    }
    else/*HEAD or other*/
    {
    }

	/* pipe（建立管道）：
	 * 头文件 #include<unistd.h>
     * 定义函数： int pipe(int filedes[2]);
     * 函数说明： pipe()会建立管道，并将文件描述词由参数filedes数组返回。
     *            filedes[0]为管道里的读取端
     *            filedes[1]则为管道的写入端。
     * 返回值：  若成功则返回零，否则返回-1，错误原因存于errno中。*/
    if (pipe(cgi_output) < 0) {
        cannot_execute(client);
        return;
    }
    if (pipe(cgi_input) < 0) {
        cannot_execute(client);
        return;
    }

	/* fork()函数的实质是一个系统调用,其作用是创建一个新的进程,
	 * 当一个进程调用它,完成后就出现两个几乎一模一样的进程,
	 * 其中由fork()创建的新进程被称为子进程,而原来的进程称为父进程.
	 * 子进程是父进程的一个拷贝,即子进程从父进程得到了数据段和堆栈的拷贝,
	 * 这些需要分配新的内存;而对于只读的代码段,通常使用共享内存方式进行访问.
	 * 返回值：
　　 * 负数：如果出错，则fork()返回-1,此时没有创建新的进程。最初的进程仍然运行。
　　 * 零：在子进程中，fork()返回0
     * 正数：在父进程中，fork()返回正的子进程的pid */

    if ( (pid = fork()) < 0 ) {
        cannot_execute(client);
        return;
    }
    sprintf(buf, "HTTP/1.0 200 OK\r\n");
    send(client, buf, strlen(buf), 0);
    if (pid == 0)  /* child: CGI script */
    {
        char meth_env[255];
        char query_env[255];
        char length_env[255];

        dup2(cgi_output[1], STDOUT);
        dup2(cgi_input[0], STDIN);
        close(cgi_output[0]);
        close(cgi_input[1]);

		// 关闭cgi_output读取端，关闭cgi_input写入端 即用cgi_output向父进程发送信息 用cgi_input接受父进程的消息
        sprintf(meth_env, "REQUEST_METHOD=%s", method);
		/* 头文件：#include<stdlib.h>
		 * 定义函数：int putenv(const char * string);
		 * 函数说明：putenv()用来改变或增加环境变量的内容. 参数string 的格式为name＝value, 
		 * 如果该环境变量原先存在, 则变量内容会依参数string 改变, 
		 * 否则此参数内容会成为新的环境变量.
         * 返回值：执行成功则返回0, 有错误发生则返回-1. */
        putenv(meth_env);
        if (strcasecmp(method, "GET") == 0) {
            sprintf(query_env, "QUERY_STRING=%s", query_string);
            putenv(query_env);
        }
        else {   /* POST */
            sprintf(length_env, "CONTENT_LENGTH=%d", content_length);
            putenv(length_env);
        }
		/* 头文件：#include <unistd.h>
		 * 定义函数：int execl(const char * path, const char * arg, ...);
         * 函数说明：execl()用来执行参数path 字符串所代表的文件路径, 
		 * 接下来的参数代表执行该文件时传递过去的argv(0), argv[1], ..., 
		 * 最后一个参数必须用空指针(NULL)作结束.
         * 返回值：如果执行成功则函数不会返回, 执行失败则直接返回-1, 失败原因存于errno 中. */
        execl(path, NULL);
        exit(0);
    } else {    /* parent */
        close(cgi_output[1]);
        close(cgi_input[0]);
        if (strcasecmp(method, "POST") == 0)
            for (i = 0; i < content_length; i++) {
                recv(client, &c, 1, 0);
                write(cgi_input[1], &c, 1);
            }
        while (read(cgi_output[0], &c, 1) > 0)
            send(client, &c, 1, 0);

        close(cgi_output[0]);
        close(cgi_input[1]);
        waitpid(pid, &status, 0);  // 等待子进程结束
    }
}

/**********************************************************************/
/* Get a line from a socket, whether the line ends in a newline,
 * carriage return, or a CRLF combination.  Terminates the string read
 * with a null character.  If no newline indicator is found before the
 * end of the buffer, the string is terminated with a null.  If any of
 * the above three line terminators is read, the last character of the
 * string will be a linefeed and the string will be terminated with a
 * null character.
 * Parameters: the socket descriptor
 *             the buffer to save the data in
 *             the size of the buffer
 * Returns: the number of bytes stored (excluding null) */
/**********************************************************************/
/* \n 软回车：
 *     在Windows 中表示换行且回到下一行的最开始位置。相当于Mac OS 里的 \r 的效果。
 *     在Linux、unix 中只表示换行，但不会回到下一行的开始位置。
 *
 * \r 软空格：
 *     在Linux、unix 中表示返回到当行的最开始位置。
 *     在Mac OS 中表示换行且返回到下一行的最开始位置，相当于Windows 里的 \n 的效果。
 *
 * 文件中的换行符号：
 *
 *	linux,unix:   \r\n
 *	windows    :  \n   
 *	Mac OS   ：   \r */

int get_line(int sock, char *buf, int size)
{
    int i = 0;
    char c = '\0';
    int n;

    while ((i < size - 1) && (c != '\n'))
    {
        n = recv(sock, &c, 1, 0);
        /* DEBUG printf("%02X\n", c); */
        if (n > 0)
        {
            if (c == '\r')
            {
                n = recv(sock, &c, 1, MSG_PEEK);
                /* DEBUG printf("%02X\n", c); */
                if ((n > 0) && (c == '\n'))
                    recv(sock, &c, 1, 0);
                else
                    c = '\n';
            }
            buf[i] = c;
            i++;
        }
        else
            c = '\n';
    }
    buf[i] = '\0';

    return(i);
}

/**********************************************************************/
/* Return the informational HTTP headers about a file. */
/* Parameters: the socket to print the headers on
 *             the name of the file */
/**********************************************************************/
void headers(int client, const char *filename)
{
    char buf[1024];
    (void)filename;  /* could use filename to determine file type */

    strcpy(buf, "HTTP/1.0 200 OK\r\n");
    send(client, buf, strlen(buf), 0);
    strcpy(buf, SERVER_STRING);
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "Content-Type: text/html\r\n");
    send(client, buf, strlen(buf), 0);
    strcpy(buf, "\r\n");
    send(client, buf, strlen(buf), 0);
}

/**********************************************************************/
/* Give a client a 404 not found status message. */
/**********************************************************************/
void not_found(int client)
{
    char buf[1024];

    sprintf(buf, "HTTP/1.0 404 NOT FOUND\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, SERVER_STRING);
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "Content-Type: text/html\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "<HTML><TITLE>Not Found</TITLE>\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "<BODY><P>The server could not fulfill\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "your request because the resource specified\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "is unavailable or nonexistent.\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "</BODY></HTML>\r\n");
    send(client, buf, strlen(buf), 0);
}

/**********************************************************************/
/* Send a regular file to the client.  Use headers, and report
 * errors to client if they occur.
 * Parameters: a pointer to a file structure produced from the socket
 *              file descriptor
 *             the name of the file to serve */
/**********************************************************************/
void serve_file(int client, const char *filename)
{
    FILE *resource = NULL;
    int numchars = 1;
    char buf[1024];

    buf[0] = 'A'; buf[1] = '\0';
    while ((numchars > 0) && strcmp("\n", buf))  /* read & discard headers */
        numchars = get_line(client, buf, sizeof(buf));

    resource = fopen(filename, "r");
    if (resource == NULL)
        not_found(client);
    else
    {
        headers(client, filename);
        cat(client, resource);
    }
    fclose(resource);
}

/**********************************************************************/
/* This function starts the process of listening for web connections
 * on a specified port.  If the port is 0, then dynamically allocate a
 * port and modify the original port variable to reflect the actual
 * port.
 * Parameters: pointer to variable containing the port to connect on
 * Returns: the socket */
/**********************************************************************/
int startup(u_short *port)
{
    int httpd = 0;
    int on = 1;
    struct sockaddr_in name;	//服务器网络地址结构体

	//创建服务端套接字--IPV4，TCP协议（面向连接） 返回文件描述符 （网络连接也是一个文件，它也有文件描述符）
    httpd = socket(PF_INET, SOCK_STREAM, 0);
	
    if (httpd == -1)
        error_die("socket");
    memset(&name, 0, sizeof(name));	 //数据初始化--清零
    name.sin_family = AF_INET;		//IPV4协议
    name.sin_port = htons(*port);	//端口号
    name.sin_addr.s_addr = htonl(INADDR_ANY);////服务器IP地址--允许连接到所有本地地址上

	/*
	设置与套接字关联的选项
	SOL_SOCKET:通用套接字选项. SO_REUSERADDR：允许重用本地地址和端口.
	*/
    if ((setsockopt(httpd, SOL_SOCKET, SO_REUSEADDR, &on, sizeof(on))) < 0)  
    {  
        error_die("setsockopt failed");
    }

	//将套接字绑定到服务器的网络地址上
    if (bind(httpd, (struct sockaddr *)&name, sizeof(name)) < 0)
        error_die("bind");

    if (*port == 0)  /* if dynamically allocating a port */
    {
        socklen_t namelen = sizeof(name);
        if (getsockname(httpd, (struct sockaddr *)&name, &namelen) == -1)
            error_die("getsockname");

		//uint16_t        sin_port;     //16位的端口号
        *port = ntohs(name.sin_port);
    }

	// 监听连接请求--监听队列长度为5
    if (listen(httpd, 5) < 0)
        error_die("listen");
    return(httpd);
}

/**********************************************************************/
/* Inform the client that the requested web method has not been
 * implemented.
 * Parameter: the client socket */
/**********************************************************************/
void unimplemented(int client)
{
    char buf[1024];

    sprintf(buf, "HTTP/1.0 501 Method Not Implemented\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, SERVER_STRING);
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "Content-Type: text/html\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "<HTML><HEAD><TITLE>Method Not Implemented\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "</TITLE></HEAD>\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "<BODY><P>HTTP request method not supported.\r\n");
    send(client, buf, strlen(buf), 0);
    sprintf(buf, "</BODY></HTML>\r\n");
    send(client, buf, strlen(buf), 0);
}

/**********************************************************************/

int main(void)
{
    int server_sock = -1;
    u_short port = 4000;
    int client_sock = -1;
    struct sockaddr_in client_name;
    socklen_t  client_name_len = sizeof(client_name);
    pthread_t newthread;
    server_sock = startup(&port);    //建立服务端socket并开始监听
    printf("httpd running on port %d\n", port);

    while (1)
    {
        client_sock = accept(server_sock,
                (struct sockaddr *)&client_name,
                &client_name_len);
        if (client_sock == -1)
            error_die("accept");
        /* accept_request(&client_sock); */
        if (pthread_create(&newthread , NULL, (void *)accept_request, (void *)(intptr_t)client_sock) != 0)
            perror("pthread_create");
    }

    close(server_sock);

    return(0);
}

```

### 代码中几个令人疑惑的地方

#### "将sin_addr设置为INADDR_ANY"的含义是什么？
问：
　　**很多书上都说“将sin_addr设置为INADDR_ANY，则表示所有的IP地址，也即所有的计算机”，这样的解说让人费解。**

答：

　　INADDR_ANY转换过来就是<mark>0.0.0.0</mark>，泛指本机的意思，也就是表示本机的所有IP，因为有些机子不止一块网卡，多网卡的情况下，这个就表示所有网卡ip地址的意思。

　　当服务器的监听地址是INADDR_ANY时，意思不是监听所有的客户端IP。而是<mark>服务器端的IP地址可以随意配置</mark>，这样使得该服务器端程序可以运行在任意计算机上，可使任意计算机作为服务器，便于程序移植。将INADDR_ANY换成127.0.0.1也可以达到同样的目的。这样，当作为服务器的计算机的IP有变动或者网卡数量有增减，服务器端程序都能够正常监听来自客户端的请求。我是这么理解的。

　　比如一台电脑有3块网卡，分别连接三个网络，那么这台电脑就有3个ip地址了，如果某个应用程序需要监听某个端口，那他要监听哪个网卡地址的端口呢？如果绑定某个具体的ip地址，你只能监听你所设置的ip地址所在的网卡的端口，其它两块网卡无法监听端口，如果我需要三个网卡都监听，那就需要绑定3个ip，也就等于需要管理3个套接字进行数据交换，这样岂不是很繁琐？所以出现INADDR_ANY，你只需绑定INADDR_ANY，管理一个套接字就行，不管数据是从哪个网卡过来的，只要是绑定的端口号过来的数据，都可以接收到。
[参考博客](https://www.cnblogs.com/rainbow70626/p/5590669.html)

#### pthread_create()

 原型：int  pthread_create（（pthread_t  *thread, pthread_attr_t  *attr,  void  *（*start_routine）（void  *）,  void  *arg）

   用法：#include  <pthread.h>

   功能：创建线程（实际上就是确定调用该线程函数的入口点），在线程创建以后，就开始**运行相关的线程函数**。

   说明：
   thread：线程标识符；

   attr：线程属性设置；

   start_routine：线程函数的起始地址；

   **arg：传递给start_routine的参数**；

   返回值：成功，返回0；出错，返回-1。
 

```cpp
pthread_create(&newthread , NULL, (void *)accept_request, (void *)(intptr_t)client_sock)
```
故这行代码即为创建一个新的线程完成当前客户端的请求（传入客户端套接字），创建新线程是为了同时为多台客户端进行服务

#### pipe管道 父子进程通信
dup函数：
```cpp
dup2(cgi_output[1], STDOUT);
dup2(cgi_input[0], STDIN);

/* filedes[0]为管道里的读取端
 * filedes[1]则为管道的写入端。*/

```
具体机制有点复杂，建议看该篇博客
[参考博客](https://blog.csdn.net/silent123go/article/details/71108501)
**个人见解**：由于CGI程序中调用的 scanf 和 printf默认为STDIN 和 STDOUT，为了与父进程通信，故使用dup2函数修改
两者重分别定向到了两个管道的读取端和写入端。则此时printf则是向父进程发送消息，scanf是接受父进程的消息（不怎么了解CGI程序，所以不一定正确）

execute_cgi函数中创建了两个管道：
	int cgi_output[2];
    int cgi_input[2];
   
  子进程：
  		关闭cgi_output的读取端和cgi_input的写入端
  		使用dup2函数重定向标准输入输出
  		使CGI程序可以通过管道与父进程交互
  父进程：
  		关闭cgi_output的写入端和cgi_input的读取端

![](https://img-blog.csdnimg.cn/20200219232709552.png)

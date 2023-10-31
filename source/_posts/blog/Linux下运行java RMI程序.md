---
title: Linux下运行java RMI程序
date: 2020-03-20 23:36:52
tags: 
categories: 分布式作业
---
<meta name="referrer" content="no-referrer" />


## 安装java
**下载jdk**
由于Oracle官网下载速度过慢，故在华为镜像站下载jdk [https://repo.huaweicloud.com/java/jdk/](https://repo.huaweicloud.com/java/jdk/)
![](https://img-blog.csdnimg.cn/20200320212047653.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
下载成功后用xftp传至服务器上
将压缩包解压
```java
tar -zxvf /usr/local/jdk-8u181-linux-x64.tar.gz
```
修改配置文件

```java
vim /etc/profile
```
在文件末端加入以下语句

java_home 为解压后的路径，可用pwd命令查看
```java

export JAVA_HOME=/usr/local/java
export PATH=$PATH:$JAVA_HOME/bin
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
export JRE_HOME=$JAVA_HOME/jre

```
重启服务器

```java
reboot
```
测试是否成功
```java
java -version
/*
java version "13" 2019-09-17
Java(TM) SE Runtime Environment (build 13+33)
Java HotSpot(TM) 64-Bit Server VM (build 13+33, mixed mode, sharing)
*/

```
## 运行java程序示例
### 源码
[本地端运行](https://blog.csdn.net/freedom1523646952/article/details/105017259)
[服务器端运行](https://blog.csdn.net/freedom1523646952/article/details/105018025)
### 导入运行
示例程序目录结构
![](https://img-blog.csdnimg.cn/20200321154132924.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)
将Java程序用xftp移动到服务器上，在/server/InterFace目录下 

```java
javac *.java
```
编译接口类中的所有Java文件
在/server/Server目录下

```java
javac -cp /你自己的路径/server *.java
// -cp 导入依赖包的路径 为待导入包的父目录
```
在/server目录下

```java
java Server.MyRMIServer
// 需要加入包名
```

### 问题解决
常用的检测端口命令
服务器（linux）：

```java
start /b rmiregistry
// 后台运行
lsof -i:端口号
// 检测端口是否被占用
kill -s 9  进程号 (linux)
taskkill /pid 进程号 /F （windows）

// 杀死进程 pid为进程号
```
客户端（windows）：

```java
ping ip 
// 检测ip地址是否可达
telnet ip 端口号
// 检测端口是否可达
// 如果可达则会加入telnet页面
// telnet服务需要自行开启
```
##### java.rmi.ConnectException: Connection refused to host: 127.0.0.1
即连接某个局域网的的连接失效

> 这个问题其实是由rmi服务器端程序造成的。 客户端程序向服务端请求一个对象的时候，返回的stub对象里面包含了服务器的hostname，客户端的后续操作根据这个hostname来连接服务器端。要想知道这个hostname具体是什么值可以在服务器端bash中打入指令：hostname -i 如果返回的是127.0.0.1或其他局域网的地址，那么你的客户端肯定会抛如标题的异常了。

ans：

一：适用于Cenos系统

> 先在/etc/hosts里添加一行，然后修改/etc/sysconfig/network文件里面的HOSTNAME

```python
如你的hosts文件原来内容
# Do not remove the following line, or various programs
# that require network functionality will fail.
127.0.0.1               localhost.localdomain localhost

# 机器的实际IP为10.1.60.121，则可以添加以下内容

10.1.60.14       test  localhost

# 然后修改/etc/sysconfig/network文件的HOSTNAME=test，则可以访问成功。
```

二：服务器端程序加入以下代码

```java
System.setProperty("java.rmi.server.hostname","服务器公网IP");
```
或者
服务器程序启动的时候，java命令加一个参数：`-Djava.rmi.server.hostname=服务器公网ip`

**客户端在获取
##### 通过Naming.lookup(...)获取该远程对象的引用后，调用方法时公网IP却拒绝访问
在从注册中心得到远程对象的引用后，客户端与其建立另一个socket通道，若接口实现类通过继承 UnicastRemoteObject 类，则该socket通道端口随机，故由服务器防火墙的缘故，服务器拒绝访问
故通过UnicastRemoteObject.exportObjec指定端口（此时接口实现类不需要继承UnicastRemoteObject 类）

```java
BookSystemInfo engine = new BookSystem();
BookSystemInfo skeleton = ( BookSystemInfo) UnicastRemoteObject.exportObject(engine, 5678);
```
> tip：可以通过Naming.list(...)方法列出所有可用的远程对象。

##### 序列化与反序列化
在远程对象中参数和返回值为基本类型的，默认序列化。若涉及自定义类（例如示例中的Book类），则会涉及到序列化与反序列的问题，对于Book类，必须满足以下条件：

必须实现java.io.Serializable接口；

其中必须有serialVersionUID字段，格式如下：

```java
private static final long serialVersionUID = 428674L;//大小随便，客户端与服务端一致即可
```


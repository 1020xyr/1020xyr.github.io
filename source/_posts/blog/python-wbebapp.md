---
title: python-wbebapp
date: 2019-10-11 23:22:12
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


# 经验
rstrip()  方法用于删除字符串尾部指定的字符，默认字符为所有空字符，包括空格、换行(\n)、制表符(\t)等
 对于writer.drain()的用法,它会阻塞如果writer的buffer已经满了
 例: response = b'<h1>Hello World!</h1>'     b' ' 表示这是一个 bytes 对象

作用：b" "前缀表示：后面字符串是bytes 类型。<br/>
网络编程中，服务器和浏览器只认bytes 类型数据。<br/>
 函数是顺序执行，遇到return语句或者最后一行函数语句就返回。<br/>
 而变成generator的函数，在每次调用next()的时候执行，遇到yield语句返回，再次执行
 时从上次返回的yield语句处继续执行。

	把@asyncio.coroutine替换为async；

	把yield from替换为await。

	Python 标准库 logging 用作记录日志，默认分为六种日志级别（括号为级别对应的数值），
	NOTSET（0）、DEBUG（10）、INFO（20）、WARNING（30）、ERROR（40）、CRITICAL（50）。
# 异步
异步IO模型需要一个消息循环，在消息循环中，主线程不断地重复“读取消息-处理消息”这一过程：
<pre><code>
loop = get_event_loop()
while True:
    event = loop.get_event()
    process_event(event)
</code></pre>
消息模型是如何解决同步IO必须等待IO操作这一问题的呢？
当遇到IO操作时，**代码只负责发出IO请求，不等待IO结果**，然后直接结束本轮消息处理，进入下一轮消息处理过程。当IO操作完成后，将收到一条“IO完成”的消息，处理该消息时就可以直接获取IO操作结果。
普通的函数
子程序，或者称为函数，在所有语言中都是层级调用，比如A调用B，B在执行过程中又调用了C，C执行完毕返回，B执行完毕返回，最后是A执行完毕。

所以子程序调用是**通过栈**实现的，一个线程就是执行一个子程序。
子程序调用总是一个入口，一次返回，调用顺序是明确的。而协程的调用和子程序不同。

协程看上去也是子程序，但执行过程中，在子程序内部可中断，然后转而执行别的子程序，在适当的时候再返回来接着执行。

注意，**在一个子程序中中断，去执行其他子程序，不是函数调用，有点类似CPU的中断**。

**asyncio的编程模型就是一个消息循环。我们从asyncio模块中直接获取一个EventLoop的引用，然后把需要执行的协程扔到EventLoop中执行，就实现了异步IO**。

**python注释为# ''' ''' """ """**
#web开发
	软件开始主要运行在桌面上，而数据库这样的软件运行在服务器端，这种Client/Server模式简称CS架构。   
 
	Browser/Server模式开始流行，简称BS架构。

	在BS架构下，客户端只需要浏览器，应用程序的逻辑和数据都存储在服务器端。浏览器只需要请求服务器，获取Web页面，并把Web页面展示给用户即可。

Common Gateway Interface，简称CGI，用C/C++编写。  
**MVC** Model-View-Controller的模式  
**CSS**是Cascading Style Sheets（层叠样式表）的简称  

<h1>HTML定义了页面的内容，CSS来控制页面元素的样式，而JavaScript负责页面的交互逻辑</h1>

## http协议
当浏览器读取到新浪首页的HTML源码后，它会解析HTML，显示页面，
然后，根据HTML里面的各种链接，再发送HTTP请求给新浪服务器，拿到相应的图片、视频、Flash、JavaScript脚本、CSS等各种资源，
最终显示出一个完整的页面。所以我们在Network下面能看到很多额外的HTTP请求。

	步骤1：浏览器首先向服务器发送HTTP请求，请求包括：

	方法：GET还是POST，GET仅请求资源，POST会附带用户数据；

	路径：/full/url/path；

	域名：由Host头指定：Host: www.sina.com.cn

	以及其他相关的Header；

	，那么请求还包括一个Body，包含用户数据。

	步骤2：服务器向浏览器返回HTTP响应，响应包括：

	响应代码：200表示成功，3xx表示重定向，4xx表示客户端发送的请求有错误，5xx表示服务器端处理时发生了错误；

	响应类型：由Content-Type指定，例如：Content-Type: text/html;charset=utf-8表示响应类型是HTML文本，并且编码是UTF-8，Content-Type: image/jpeg表示响应类型是JPEG格式的图片；

	以及其他相关的Header；

	通常服务器的HTTP响应会携带内容，也就是有一个Body，包含响应的内容，网页的HTML源码就在Body中。

	步骤3：如果浏览器还需要继续向服务器请求其他资源，比如图片，就再次发出HTTP请求，重复步骤1、2。
Web采用的HTTP协议采用了非常简单的请求-响应模式，从而大大简化了开发。当我们编写一个页面时，我们只需要在HTTP响应中把HTML发送出去，不需要考虑如何附带图片、视频等，浏览器如果需要请求图片和视频，它会发送另一个HTTP请求，因此，一个HTTP请求只处理一个资源。

HTTP协议同时具备极强的扩展性，虽然浏览器请求的是http://www.sina.com.cn/的首页，但是新浪在HTML中可以链入其他服务器的资源，比如<img src="http://i1.sinaimg.cn/home/2013/1008/U8455P30DT20131008135420.png">，从而将请求压力分散到各个服务器上，并且，一个站点可以链接到其他站点，无数个站点互相链接起来，就形成了World Wide Web，简称“三达不溜”（WWW）
HTTP GET请求的格式：

	GET /path HTTP/1.1

	Header1: Value1

	Header2: Value2

	Header3: Value3


每个Header一行一个，换行符是\r\n。
HTTP POST请求的格式：

	POST /path HTTP/1.1

	Header1: Value1

	Header2: Value2

	Header3: Value3

	body data goes here...

当遇到连续两个\r\n时，Header部分结束，后面的数据全部是Body。
HTTP响应的格式：

	200 OK

	Header1: Value1
	
	Header2: Value2

	Header3: Value3

	body data goes here...

HTTP响应如果包含body，也是通过\r\n\r\n来分隔的。请再次注意，Body的数据类型由**Content-Type**头来确定，如果是网页，Body就是文本，如果是图片，Body就是图片的二进制数据。
##WSGI 
Web Server Gateway Interface  
一个Web应用的本质就是：

    浏览器发送一个HTTP请求；

    服务器收到请求，生成一个HTML文档；

    服务器把HTML文档作为HTTP响应的Body发送给浏览器；

    浏览器收到HTTP响应，从HTTP Body取出HTML文档并显示。
所谓“参考实现”是指该实现完全符合WSGI标准，但是不考虑任何运行效率，仅供开发和测试使用。 
 
	无论多么复杂的Web应用程序，入口都是一个WSGI处理函数。HTTP请求的所有输入信息都可以通过environ获得，HTTP响应的输出都可以通过start_response()加上函数返回值作为Body。

	复杂的Web应用程序，光靠一个WSGI函数来处理还是太底层了，我们需要在WSGI之上再抽象出Web框架，进一步简化Web开发

##flask
其实一个Web App，就是写一个WSGI的处理函数，针对每个HTTP请求进行响应

	我们需要在WSGI接口之上能进一步抽象，让我们专注于用一个函数处理一个URL，至于URL到函数的映射，就交给Web框架来做。  


    Django：全能型Web框架；

    web.py：一个小巧的Web框架；

    Bottle：和Flask类似的Web框架；

    Tornado：Facebook的开源异步Web框架。

#数据库
<pre><code>
sqlite3
import sqlite3
conn = sqlite3.connect('test.db')   //连接数据库
cursor = conn.cursor()  
cursor.execute('insert into user values(\'123\',\'456\')')
cursor.rowcount
cursor.close()
conn.commit()
conn.close()
conn = sqlite3.connect('test.db')
cursor = conn.cursor()
cursor.execute('select * from user ')
value = cursor.fetchall()
value
cursor.close()
conn.close()
%hist
</pre></code>


#orm.py

	file = open("/tmp/foo.txt")
	try:
    	data = file.read()
	finally:
    	file.close()  

	with open("/tmp/foo.txt") as file:
    	data = file.read()
dict() 函数用于创建一个字典。

	__new__
	在 Python 中存在于类里面的构造方法 __init__() 负责将类的实例化，而在

 	__init__() 启动之前，__new__() 决定是否要使用该 __init__() 方法，因为

	__new__() 可以调用其他类的构造方法或者直接返回别的对象来作为本类的实例。



注意到定义在User类中的__table__、id和name是类的属性，不是实例的属性。所以，在类级别上定义的属性用来描述User对象和表的映射关系，而实例属性必须通过__init__()方法去初始化，所以两者互不干扰：
[https://blog.csdn.net/qq_31780525/article/details/72639491](https://blog.csdn.net/qq_31780525/article/details/72639491 "类属性详解")

元类的主要目的就是为了当创建类时能够自动地改变类。
[https://blog.csdn.net/weixin_31449201/article/details/80320672](https://blog.csdn.net/weixin_31449201/article/details/80320672 "元类")


[https://blog.csdn.net/u012156686/article/details/52792529](https://blog.csdn.net/u012156686/article/details/52792529 "getattr")

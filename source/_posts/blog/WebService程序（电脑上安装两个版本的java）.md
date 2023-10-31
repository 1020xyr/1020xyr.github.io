---
title: WebService程序（电脑上安装两个版本的java）
date: 2020-04-04 10:48:10
tags: jdk webservice
categories: 
- [踩坑日记] 
- [分布式作业]
---
<meta name="referrer" content="no-referrer" />



# 在电脑安装jdk1.8版本
[华为镜像站](https://repo.huaweicloud.com/java/jdk/)（jdk-8u192-windows-x64.exe）
下载后安装
<mark>jdk和jre安装在不同文件夹</mark>
![](https://img-blog.csdnimg.cn/2020040310184049.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)
## 设置环境变量
环境变量相当于给系统或用户应用程序设置的一些参数，比如path，是告诉系统，当要求系统运行一个程序而没有告诉它程序所在的完整路径时，系统除了在**当前目录**下面寻找此程序外，还应到**path中指定的路径**去找。
用户通过设置环境变量，来更好的运行进程

我的电脑存在两个版本的jdk

![](https://img-blog.csdnimg.cn/20200403101950446.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)
我的环境变量

```java
变量：JAVA_HOME8，JAVA_HOME13,JAVA_HOME,CLASSPATH,PATH
其中：
JAVA_HOME8 = D:\java\java8\jdk
JAVA_HOME13 = D:\java\java13\jdk
JAVA_HOME = %JAVA_HOME8%   //通过该变量来切换版本号
PATH变量添加以下内容
;%JAVA_HOME%\bin;%JAVA_HOME%\jre\bin 
设置CLASSPATH变量
CLASSPATH = .;%JAVA_HOME%\lib\dt.jar;%JAVA_HOME%\lib\tools.jar

java -version
javac -version 
检查变量是否配置成功
并编译运行程序测试
```
### 变量解释
在java环境变量设置中，真正起作用的只有path 和 classpath，java_home有可能被第三方软件使用。
**JAVA_HOME**
变量名：JAVA_HOME
用途：定义一个变量，供其他地方使用，或被某些第三方软件使用
**Path**
变量名：Path
用途：让系统在任何路径下都可以识别**java、javac、javap**等命令
**CLASSPATH**
变量名：CLASSPATH
变量值：**.;%JAVA_HOME%\lib\dt.jar;%JAVA_HOME%\lib\tools.jar**
用途：告诉jvm要使用或执行的class放在什么路径上，便于JVM加载class文件，**.;表示当前路径**，tools.jar和dt.jar为类库路径
**CLASSPATH详解**
tools.jar
工具类库(编译和运行等)，它跟我们程序中用到的基础类库没有关系。我们注意到在Path中变量值bin目录下的各个exe工具的大小都很小，一般都在27KB左右，这是因为它们实际上仅仅相当于是一层代码的包装，这些工具的实现所要用到的类库都在tools.jar中，用压缩软件打开tools.jar，你会发现有很多文件是和bin目录下的exe工具相对性的。当然，如果tools.jar的功能只有这些的话，那么我们根本不用把它加入到CLASSPATH变量中，因为bin目录下的工具自己可以完成对这些类库的调用，因此tools.jar应该还有其他的功能。在里面还可以看到有Applet和RMI等相关的文件，因此tools.jar应该还是远程调用等必须的jar包。tools.jar的其他作用可以查看其他资料。

dt.jar
运行环境类库，主要是Swing包，这一点通过用压缩软件打开dt.jar也可以看到。如果在开发时候没有用到Swing包，那么可以不用将dt.jar添加到CLASSPATH变量中。
CLASSPATH中的类库是由Application ClassLoader或者我们自定义的类加载器来加载的，这里当然不能包括基础类库，如果包括基础类库的话，并用两个不同的自定义类加载器去加载该基础类，那它得到的该基础类就不是唯一的了，这样便不能保证Java类的安全性。

基本类库和扩展类库rt.jar
基本类库是所有的 import java.* 开头的类，在 %JAVA_HOME%\jre\lib 目录下（如其中的 rt.jar、resource.jar ），类加载机制提到，该目录下的类会由 Bootstrap ClassLoader 自动加载，并通过亲委派模型保证了基础类库只会被Bootstrap ClassLoader加载，这也就保证了基础类的唯一性。

扩展类库是所有的 import javax.* 开头的类，在 %JAVA_HOME%\jre\lib\ext 目录下，该目录下的类是由Extension ClassLoader 自动加载，不需要我们指定。

rt.jar 默认就在根ClassLoader的加载路径里面，放在CLASSPATH也是多此一举。

[参考链接](https://blog.csdn.net/ThinkWon/article/details/94353907)
观察path变量可知，各路径用;号间隔，有些变量末尾没加分号会出错，不过我没有碰见
%xxx% 表示引用某环境变量
若环境变量一直出错，可以在命令行窗口用set + 环境变量名的方式检查是否正确添加

```java
set classpath
```
另外，可以将环境变量以文本形式复制到notepad等记事本软件编辑检查
![](https://img-blog.csdnimg.cn/20200401223605717.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)

## 问题解决
### wind10的环境变量中的Path如何列表显示
如果你的变量值以%开头，打开编辑的时候就会显示一串的变量值，不方便查找编辑，所以将变量值更改为以盘符开始，就可以解决这个问题，比如：D:\WorkSoft\app\product\11.2.0\dbhome_1\bin
<mark>不一定%开头就无法显示</mark>
###  更换JDK版本后，修改环境变量也无法生效的原因和解决办法
原因： 当使用安装版本的JDK程序时（一般是1.7版本以上），在安装结束后安装程序会自动将java.exe、javaw.exe、javaws.exe三个可执行文件复制到C:\Windows\System32目录，这个目录在WINDOWS环境变量中的优先级高于JAVA_HOME设置的环境变量优先级，故此直接更改JAVA_HOME会无效。
 另外，JDK1.8安装版本，还会在C:\ProgramData\Oracle\Java目录中生成一些配置文件，并同时将此目录写到环境变量中的Path中。

解决：
删除C:\Windows\System32目录下的java.exe、javaw.exe、javaws.exe三个文件
删除环境变量Path中C:\ProgramData\Oracle\Java\javapath的配置

### 解决JDK13没有jre问题（jre可以不用）
.进入命令控制台（必须使用管理员权限，否则报错）
2.进入jdk目录后输入bin\jlink.exe --module-path jmods --add-modules java.desktop --output jre（可直接复制这条链接）


参考链接
[同一个电脑安装两个jdk版本](https://blog.csdn.net/yuruixin_china/article/details/53607248)
[wind10的环境变量中的Path如何列表显示](https://blog.csdn.net/yanmuchen/article/details/85679256)
[更换JDK版本后，修改环境变量也无法生效的原因和解决办法](https://blog.csdn.net/qq_26369317/article/details/80922425)
# 运行webservice程序
在[http://www.webxml.com.cn/zh_cn/web_services.aspx](http://www.webxml.com.cn/zh_cn/web_services.aspx)网站中选取一个服务
我这里选择了第一个服务 中文<->英文双向翻译WEB服务
![](https://img-blog.csdnimg.cn/202004041036452.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)
```java
WSDL: http://fy.webxml.com.cn/webservices/EnglishChinese.asmx?wsdl 
```
使用命令导入wsproxy包

```java
wsimport -keep -p wsproxy http://fy.webxml.com.cn/webservices/EnglishChinese.asmx?wsdl 
```
出现解析组件 's:schema' 时出错。在该组件中检测到 's:schem的错误
![](https://img-blog.csdnimg.cn/20200404104148984.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center)
## 解析组件 's:schema' 时出错。在该组件中检测到 's:schem
解决：
将http://fy.webxml.com.cn/webservices/EnglishChinese.asmx?wsdl的xml文件保存到本地，
而后将文件中的<s:element ref="s:schema" /> <s:any />全部替换为<s:any minOccurs="2" maxOccurs="2" />
在cmd中用wsimport命令生成客户端代码,这时候的wsdl路径为本地文件的路径
这样就能导入wsproxy包
## 示例程序
下载帮助文档，查看api，以下调用translatorString方法实现简单的功能

```java
package client;

import wsproxy.*;

import java.util.List;


public class WebServiceClient {
    public static void main(String[] args) {
        EnglishChinese service = new EnglishChinese();
        EnglishChineseSoap pService = service.getEnglishChineseSoap();

        ArrayOfString result1_1 = pService.translatorString("你好");
        List<String> res1_1 = result1_1.getString();
        for (String s : res1_1) {
            System.out.println(s);
        }
    }

}


```


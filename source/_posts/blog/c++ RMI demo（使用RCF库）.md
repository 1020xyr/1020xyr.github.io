---
title: c++ RMI demo（使用RCF库）
date: 2022-05-06 17:11:08
tags: c++
categories: 分布式作业
---
<meta name="referrer" content="no-referrer" />


**作业要求**
![](https://img-blog.csdnimg.cn/ef4f8b5030df4fe3b131704dc19c4ba9.png)
下载RCF库并编译成静态库/动态库
宿主机操作系统：ubuntu
```bash
wget https://www.deltavsoft.com/downloads/RCF-3.2.413.tar.gz # 下载RCF压缩包
tar xvf RCF-3.2.413.tar.gz # 解压到本地文件夹
```
在/root/code/rcf/RCF-3.2.413文件夹下
```bash
g++ -I include/  src/RCF/RCF.cpp -lpthread -ldl -luuid -c # 生成obj文件
# -l：链接第三方库 -I：头文件目录  -c只进行 预处理， 编译，汇编操作，生成.o (.obj)文件，不进行链接。

报错fatal error: uuid/uuid.h: No such file or directory
sudo apt-get install uuid-dev # 安装uuid-devuuid-dev
# 重新运行g++命令成功
mkdir lib # 创建lib文件夹，存放静态库与动态库文件

# 生成静态库
# 将所有.o文件打包为静态库，r将文件插入静态库中，c创建静态库，不管库是否存在，s写入一个目标文件索引到库中
ar rcs librcf.a  RCF.o 
mv librcf.a  lib/
mv RCF.o  lib/RCF_static.o


# 生成动态库
g++ -I include/  src/RCF/RCF.cpp -lpthread -ldl -luuid -c -fPIC 	# 参数-fPIC表示生成与位置无关代码
g++ -shared -o librcf.so RCF.o
mv librcf.so  lib/
mv RCF.o  lib/RCF_share.o
```
![](https://img-blog.csdnimg.cn/de0c1e5cd54b48f09c310c952c9e5b09.png)

仿照/root/code/rcf/RCF-3.2.413/demo文件夹下的demo编写RMI程序

```cpp
// interface.h
#pragma once
#include <string>
#include <RCF/RCF.hpp>

RCF_BEGIN(I_Translate, "I_Translate")
RCF_METHOD_R1(std::string, Translate, const std::string &);
RCF_END(I_Translate);

// server.cpp
#include <iostream>
#include <string>
#include <map>

#include "interface.h"

class Translator
{
  public:
    std::string Translate(const std::string &str)
    {
        if(word_list_.count(str)!=0){
            return  word_list_[str];
        }
        return {};
    }
    void InsertSampleData()
    {
        word_list_.insert({"Afghanistan", "阿富汗"});
        word_list_.insert({"Denmark", "丹麦"});
        word_list_.insert({"Egypt", "埃及"});
        word_list_.insert({"Finland", "芬兰"});
        word_list_.insert({"Korea (South)", "韩国"});
        word_list_.insert({"Kuwait", "科威特"});
    }

  private:
    std::map<std::string, std::string> word_list_;
};

int main()
{
    RCF::RcfInit rcfInit;

    std::string networkInterface = "0.0.0.0";
    int port = 50001;
    std::cout << "Starting server on " << networkInterface << ":" << port << "." << std::endl;

    // Start a TCP server, and expose DemoService.
    Translator translator;
    translator.InsertSampleData();
    RCF::RcfServer server(RCF::TcpEndpoint(networkInterface, port));
    server.bind<I_Translate>(translator);
    server.start();

    std::cout << "Press Enter to exit..." << std::endl;
    std::cin.get();

    return 0;
}

// client.cpp
#include <iostream>
#include <string>

#include "interface.h"

int main()
{
    RCF::RcfInit rcfInit;

    try
    {

        std::string networkInterface = "127.0.0.1";
        int port = 50001;
        std::cout << "Connecting to server on " << networkInterface << ":" << port << "." << std::endl;

        // Make the call.
        auto remotes_obj = RcfClient<I_Translate>(RCF::TcpEndpoint(networkInterface, port));
        std::string input_string;
        std::string translate_res;
        while (true)
        {
            std::cout << "输入需要查询的英文单词,按q结束查询" << std::endl;
            std::cin >> input_string;
            if (input_string == "q")
            {
                break;
            }
            translate_res = remotes_obj.Translate(input_string).get();
            if (translate_res == "")
            {
                std::cout << "词汇表中未存该单词" << std::endl;
            }
            else
            {
                std::cout << translate_res << std::endl;
            }
        }
    }
    catch (const RCF::Exception &e)
    {
        std::cout << "Caught exception:\n";
        std::cout << e.getErrorMessage() << std::endl;
        return 1;
    }

    return 0;
}
```

编译运行

```bash
# 使用静态库
g++ client.cpp   /root/code/rcf/RCF-3.2.413/lib/librcf.a  -I /root/code/rcf/RCF-3.2.413/include/ -o client_static -lpthread -ldl -luuid
g++ server.cpp   /root/code/rcf/RCF-3.2.413/lib/librcf.a  -I /root/code/rcf/RCF-3.2.413/include/ -o server_static -lpthread -ldl -luuid


# 使用动态库
g++ client.cpp   /root/code/rcf/RCF-3.2.413/lib/librcf.so  -I /root/code/rcf/RCF-3.2.413/include/ -o client_share -lpthread -ldl -luuid
g++ server.cpp   /root/code/rcf/RCF-3.2.413/lib/librcf.so  -I /root/code/rcf/RCF-3.2.413/include/ -o server_share -lpthread -ldl -luuid
```
![](https://img-blog.csdnimg.cn/51ef0607dc4143b682964cb1e7b36bd6.png)
![](https://img-blog.csdnimg.cn/86541d173d0340dab49d2f9e58907205.png)
<mark>突然想到以上能成功的原因是不是因为interface.h中只使用了RCF.hpp，实际上是不是应该将所有源文件编译成obj文件，而后打包成静态库/动态库呢？以后再用到这个库时再看，不过打包成库的步骤差不多，也没有太大问题</mark>
**参考博客**
[RCF的使用](https://blog.csdn.net/yuweiping5247/article/details/81386658)
[Linux基础——gcc编译、静态库与动态库（共享库）](https://blog.csdn.net/daidaihema/article/details/80902012)

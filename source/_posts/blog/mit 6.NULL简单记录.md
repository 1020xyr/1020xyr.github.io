---
title: mit 6.NULL简单记录
date: 2022-04-24 21:57:17
tags: 6.NULL
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />



相关网站：
[MIT6.NULL实用工具介绍](https://conanhujinming.github.io/comments-for-awesome-courses/%E5%85%B6%E4%BB%96%E8%AF%BE%E7%A8%8B/MIT6.NULL%E5%AE%9E%E7%94%A8%E5%B7%A5%E5%85%B7%E4%BB%8B%E7%BB%8D/)
[计算机教育中缺失的一课](https://missing-semester-cn.github.io/)

只是花点时间简单看一下，这博客只是当简单的笔记，没啥阅读价值，建议直接看[计算机教育中缺失的一课](https://missing-semester-cn.github.io/)网站原文
### 课程概览与 shell

**在程序间创建连接**
在 shell 中，程序有两个主要的“流”：它们的输入流和输出流。 当程序尝试读取信息时，它们会从输入流中进行读取，当程序打印信息时，它们会将信息输出到输出流中。 通常，一个程序的输入输出流都是您的终端。也就是，您的键盘作为输入，显示器作为输出。 但是，我们也可以重定向这些流！
最简单的重定向是 < file 和 > file。这两个命令可以将程序的输入输出流分别重定向到文件：

```bash
missing:~$ echo hello > hello.txt
missing:~$ cat hello.txt
hello
missing:~$ cat < hello.txt
hello
missing:~$ cat < hello.txt > hello2.txt
missing:~$ cat hello2.txt
hello
```

cd -      返回进入此目录之前所在目录 

find用法：[Linux find 命令](https://www.runoob.com/linux/linux-comm-find.html)

```bash
将当前目录及其子目录下所有文件后缀为 .c 的文件列出来:

# find . -name "*.c"
将当前目录及其子目录中的所有文件列出：

# find . -type f
将当前目录及其子目录下所有最近 20 天内更新过的文件列出:

# find . -ctime  20
```
grep用法：[Linux grep 命令](https://www.runoob.com/linux/linux-comm-grep.html)
grep 指令用于查找内容包含指定的范本样式的文件，如果发现某文件的内容符合所指定的范本样式，预设 grep 指令会把含有范本样式的那一列显示出来。

```bash
1、在当前目录中，查找后缀有 file 字样的文件中包含 test 字符串的文件，并打印出该字符串的行。此时，可以使用如下命令：

grep test *file 
```

### Shell 工具和脚本

shebang：
 >在计算领域中，Shebang（也称为 Hashbang ）是一个由井号和叹号构成的字符序列 #! ，其出现在文本文件的第一行的前两个字符。 在文件中存在 Shebang 的情况下，类 Unix 操作系统的程序加载器会分析 Shebang 后的内容，将这些内容作为解释器指令，并调用该指令，并将载有 Shebang 的文件路径作为该解释器的参数。
例如，以指令#!/bin/sh开头的文件在执行时会实际调用/bin/sh程序（通常是 Bourne shell 或兼容的 shell，例如 bash、dash 等）来执行。这行内容也是 shell 脚本的标准起始行。
由于 # 符号在许多脚本语言中都是注释标识符，Shebang 的内容会被这些脚本解释器自动忽略。 在 # 字符不是注释标识符的语言中，例如 Scheme，解释器也可能忽略以 #! 开头的首行内容，以提供与 Shebang 的兼容性。

[#!/usr/bin/env python 有什么用？](https://zhuanlan.zhihu.com/p/262456371)
```bash
当你执行 env python 时，它其实会去 env | grep PATH 里（也就是 /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin ）这几个路径里去依次查找名为python的可执行文件。

那么对于这两者，我们应该使用哪个呢？

个人感觉应该优先使用 #!/usr/bin/env python，因为不是所有的机器的 python 解释器都是 /usr/bin/python 。
```

**查看命令如何使用**
最常用的方法是为对应的命令行添加-h 或 --help 标记。另外一个更详细的方法则是使用man 命令。man 命令是手册（manual）的缩写，它提供了命令的用户手册。
有时候手册内容太过详实，让我们难以在其中查找哪些最常用的标记和语法。 **TLDR** pages 是一个很不错的替代品，它提供了一些案例，可以帮助您快速找到正确的选项。

查找 shell 命令
**history** 命令允许您以程序员的方式来访问shell中输入的历史命令。这个命令会在标准输出中打印shell中的里面命令。如果我们要搜索历史记录，则可以利用管道将输出结果传递给 grep 进行模式搜索。 history | grep find 会打印包含find子串的命令。

函数 marco 和 polo
我喜欢用fish而不是bash，故我使用fish的格式编写函数
[Fish Shell 精简手册](https://imlonghao.com/52.html)
[Fish for bash users](https://fishshell.com/docs/current/fish_for_bash_users.html)
>source命令是一个内置的shell命令，用于从当前shell会话中的文件读取和执行命令。source命令通常用于保留、更改当前shell中的环境变量。简而言之，source一个脚本，将会在当前shell中运行execute命令。

```bash
#!/usr/bin/env fish
function marco
    set -gx MARCO (pwd)
end

function polo
    cd $MARCO
end
```

```bash
# Define $PAGER global and exported,
# so this is like ``export PAGER=less``
set -gx PAGER less

# Define $alocalvariable only locally,
# like ``local alocalvariable=foo``
set -l alocalvariable foo
```


```bash
find /  -name "*.html" | xargs  -d '\n'  zip test.zip
```

```bash
find . -type f  -print0 | xargs -0 ls -lt | head -30  #抄的

xargs
-0：items are separated by a null, not whitespace;

ls
-t sort by modification time, newest first
-l use a long listing format

```
### 编辑器 (Vim)
了解基本用法即可，我用vscode
	:q 退出（关闭窗口）
	:w 保存（写）
	:wq 保存然后退出

### 数据整理
太复杂了，应该用不到，看点简单的就成
sed命令进行正则匹配替换

```bash
 seq 10 | sort -r --numeric-sort # 倒序输出10个数
```
awk用于处理文本

```bash
awk '{print $1}' test.sh  
```
 ### 命令行环境
 >SIGSTOP 会让进程暂停。在终端中，键入 Ctrl-Z 会让 shell 发送 SIGTSTP 信号
 

ssh 会查询 .ssh/authorized_keys 来确认那些用户可以被允许登录。您可以通过下面的命令将一个公钥拷贝到这里：
```bash
cat .ssh/id_ed25519 | ssh foobar@remote 'cat >> ~/.ssh/authorized_keys'
# 如果支持 ssh-copy-id 的话，可以使用下面这种更简单的解决方案：
ssh-copy-id -i .ssh/id_ed25519.pub foobar@remote
```

常见的情景是使用本地端口转发，即远端设备上的服务监听一个端口，而您希望在本地设备上的一个端口建立连接并转发到远程端口上。例如，我们在远端服务器上运行 Jupyter notebook 并监听 8888 端口。 然后，建立从本地端口 9999 的转发，使用 ssh -L 9999:localhost:8888 foobar@remote_server 。这样只需要访问本地的 localhost:9999 即可。
### 版本控制(Git)
![](https://img-blog.csdnimg.cn/2b9a44ffb79046688b73ccd14311a32e.png)

Git 将顶级目录中的文件和文件夹作为集合，并通过一系列快照来管理其历史记录。在 Git 中，历史记录是一个由快照组成的有向无环图。

Git 数据模型
```python
// 文件就是一组数据
type blob = array<byte>

// 一个包含文件和目录的目录
type tree = map<string, tree | blob>

// 每个提交都包含一个父辈，元数据和顶层树
type commit = struct {
    parent: array<commit>
    author: string
    message: string
    snapshot: tree
}
// Git 中的对象可以是 blob、树或提交：
type object = blob | tree | commit

// Git 在储存数据时，所有的对象都会基于它们的 SHA-1 哈希 进行寻址。
objects = map<string, object>

def store(object):
    id = sha1(object)
    objects[id] = object

def load(id):
    return objects[id]

// Git 的解决方法是给这些哈希值赋予人类可读的名字，也就是引用（references）,引用是指向提交的指针
references = map<string, string>

def update_reference(name, id):
    references[name] = id

def read_reference(name):
    return references[name]

def load_reference(name_or_id):
    if name_or_id in references:
        return load(references[name_or_id])
    else:
        return load(name_or_id)
```

```bash
git mergetool: 使用工具来处理合并冲突
git remote: 列出远端
git remote add <name> <url>: 添加一个远端
git push <remote> <local branch>:<remote branch>: 将对象传送至远端并更新远端引用
git branch --set-upstream-to=<remote>/<remote branch>: 创建本地和远端分支的关联关系
git fetch: 从远端获取对象/索引
git pull: 相当于 git fetch; git merge
git clone: 从远端下载仓库
```

[Learn Git Branching](https://learngitbranching.js.org/?locale=zh_CN) 通过基于浏览器的游戏来学习 Git ；


### 调试及性能分析
“最有效的 debug 工具就是细致的分析，配合恰当位置的打印语句” — Brian Kernighan, Unix 新手入门。

对于 UNIX 系统来说，程序的日志通常存放在 /var/log。

>过早的优化是万恶之源

像 C 或者 C++ 这样的语言，内存泄漏会导致您的程序在使用完内存后不去释放它。为了应对内存类的 Bug，我们可以使用类似 **Valgrind** 这样的工具来检查内存泄漏问题。


```bash
资源监控
有时候，分析程序性能的第一步是搞清楚它所消耗的资源。程序变慢通常是因为它所需要的资源不够了。例如，没有足够的内存或者网络连接变慢的时候。

有很多很多的工具可以被用来显示不同的系统资源，例如 CPU 占用、内存使用、网络、磁盘使用等。

通用监控 - 最流行的工具要数 htop,了，它是 top的改进版。htop 可以显示当前运行进程的多种统计信息。htop 有很多选项和快捷键，常见的有：<F6> 进程排序、 t 显示树状结构和 h 打开或折叠线程。 还可以留意一下 glances ，它的实现类似但是用户界面更好。如果需要合并测量全部的进程， dstat 是也是一个非常好用的工具，它可以实时地计算不同子系统资源的度量数据，例如 I/O、网络、 CPU 利用率、上下文切换等等；
I/O 操作 - iotop 可以显示实时 I/O 占用信息而且可以非常方便地检查某个进程是否正在执行大量的磁盘读写操作；
磁盘使用 - df 可以显示每个分区的信息，而 du 则可以显示当前目录下每个文件的磁盘使用情况（ disk usage）。-h 选项可以使命令以对人类（human）更加友好的格式显示数据；ncdu是一个交互性更好的 du ，它可以让您在不同目录下导航、删除文件和文件夹；
内存使用 - free 可以显示系统当前空闲的内存。内存也可以使用 htop 这样的工具来显示；
打开文件 - lsof 可以列出被进程打开的文件信息。 当我们需要查看某个文件是被哪个进程打开的时候，这个命令非常有用；
网络连接和配置 - ss 能帮助我们监控网络包的收发情况以及网络接口的显示信息。ss 常见的一个使用场景是找到端口被进程占用的信息。如果要显示路由、网络设备和接口信息，您可以使用 ip 命令。注意，netstat 和 ifconfig 这两个命令已经被前面那些工具所代替了。
网络使用 - nethogs 和 iftop 是非常好的用于对网络占用进行监控的交互式命令行工具。
如果您希望测试一下这些工具，您可以使用 stress 命令来为系统人为地增加负载。
```
### 元编程
>Makefile中的指令，即如何使用右侧文件构建左侧文件的规则。或者，换句话说，冒号左侧的是构建目标，冒号右侧的是构建它所需的依赖。缩进的部分是从依赖构建目标时需要用到的一段程序。

**语义版本号**
- 如果新的版本没有改变 API，请将补丁号递增；
- 如果您添加了 API 并且该改动是向后兼容的，请将次版本号递增；
- 如果您修改了 API 但是它并不向后兼容，请将主版本号递增。


持续集成，或者叫做 CI 是一种雨伞术语（umbrella term，涵盖了一组术语的术语），它指的是那些“当您的代码变动时，自动运行的东西”

**测试简介**
多数的大型软件都有“测试套件”。您可能已经对测试的相关概念有所了解，但是我们觉得有些测试方法和测试术语还是应该再次提醒一下：

测试套件：所有测试的统称。
- 单元测试：一种“微型测试”，用于对某个封装的特性进行测试。
- 集成测试：一种“宏观测试”，针对系统的某一大部分进行，测试其不同的特性或组件是否能协同工作。
- 回归测试：一种实现特定模式的测试，用于保证之前引起问题的 bug 不会再次出现。
- 模拟（Mocking）: 使用一个假的实现来替换函数、模块或类型，屏蔽那些和测试不相关的内容。例如，您可能会“模拟网络连接” 或 “模拟硬盘”。

###  安全和密码学
**熵**
熵的单位是 比特。对于一个均匀分布的随机离散变量，熵等于log_2(所有可能的个数，即n)。 扔一次硬币的熵是1比特。掷一次（六面）骰子的熵大约为2.58比特。
使用多少比特的熵取决于应用的威胁模型。 大约40比特的熵足以对抗在线穷举攻击（受限于网络速度和应用认证机制）。 而对于离线穷举攻击（主要受限于计算速度）, 一般需要更强的密码 (比如80比特或更多)。

**散列函数**
抽象地讲，散列函数可以被认为是一个不可逆，且看上去随机（但具确定性）的函数 （这就是散列函数的理想模型）。 一个散列函数拥有以下特性：
确定性：对于不变的输入永远有相同的输出。
不可逆性：对于hash(m) = h，难以通过已知的输出h来计算出原始输入m。
目标碰撞抵抗性/弱无碰撞：对于一个给定输入m_1，难以找到m_2 != m_1且hash(m_1) = hash(m_2)。
碰撞抵抗性/强无碰撞：难以找到一组满足hash(m_1) = hash(m_2)的输入m_1, m_2（该性质严格强于目标碰撞抵抗性）。

**别开生面的扔硬币**
>我可以选择一个值r = random()，并和你分享它的哈希值h = sha256(r)。 这时你可以开始猜硬币的正反：我们一致同意偶数r代表正面，奇数r代表反面。 你猜完了以后，我告诉你值r的内容，得出胜负。同时你可以使用sha256( r )来检查我分享的哈希值h以确认我没有作弊。


**对称加密**
```bash
keygen() -> key  (这是一个随机方法)

encrypt(plaintext: array<byte>, key) -> array<byte>  (输出密文)
decrypt(ciphertext: array<byte>, key) -> array<byte>  (输出明文)

decrypt(encrypt(m, k), k) = m。
```

**非对称加密**
```bash
keygen() -> (public key, private key)  (这是一个随机方法)

encrypt(plaintext: array<byte>, public key) -> array<byte>  (输出密文)
decrypt(ciphertext: array<byte>, private key) -> array<byte>  (输出明文)

sign(message: array<byte>, private key) -> array<byte>  (生成签名)
verify(message: array<byte>, signature: array<byte>, public key) -> bool  (验证签名是否是由和这个公钥相关的私钥生成的)
```

对称加密和非对称加密可以类比为机械锁。 对称加密就好比一个防盗门：只要是有钥匙的人都可以开门或者锁门。 非对称加密好比一个可以拿下来的挂锁。你可以把打开状态的挂锁（公钥）给任何一个人并保留唯一的钥匙（私钥）。这样他们将给你的信息装进盒子里并用这个挂锁锁上以后，只有你可以用保留的钥匙开锁。

每个人都应该尝试使用密码管理器，比如KeePassXC、pass 和 1Password)。

以守护进程（daemon）运行的程序名一般以 d 结尾，比如 SSH 服务端 sshd，用来监听传入的 SSH 连接请求并对用户进行鉴权。Linux 中的 systemd（the system daemon）是最常用的配置和运行守护进程的方法。运行 systemctl status 命令可以看到正在运行的所有守护进程。

FUSE（用户空间文件系统）

--version 或者 -V 标志参数可以让工具显示它的版本信息（对于提交软件问题报告非常重要）
基本所有的工具支持使用 --verbose 或者 -v 标志参数来输出详细的运行信息。多次使用这个标志参数，比如 -vvv，可以让工具输出更详细的信息（经常用于调试）。同样，很多工具支持 --quiet 标志参数来抑制除错误提示之外的其他输出。

### 提问&回答
/bin - 基本命令二进制文件
/sbin - 基本的系统二进制文件，通常是root运行的
/dev - 设备文件，通常是硬件设备接口文件
/etc - 主机特定的系统配置文件
/home - 系统用户的主目录
/lib - 系统软件通用库
/opt - 可选的应用软件
/sys - 包含系统的信息和配置(第一堂课介绍的)
/tmp - 临时文件( /var/tmp ) 通常重启时删除
/usr/ - 只读的用户数据
/usr/bin - 非必须的命令二进制文件
/usr/sbin - 非必须的系统二进制文件，通常是由root运行的
/usr/local/bin - 用户编译程序的二进制文件
/var -变量文件 像日志或缓存

**source script.sh 和 ./script.sh 有什么区别?**
这两种情况 script.sh 都会在bash会话中被读取和执行，不同点在于哪个会话执行这个命令。 对于 source 命令来说，命令是在当前的bash会话中执行的，因此当 source 执行完毕，对当前环境的任何更改（例如更改目录或是定义函数）都会留存在当前会话中。 单独运行 ./script.sh 时，当前的bash会话将启动新的bash会话（实例），并在新实例中运行命令 script.sh。 因此，如果 script.sh 更改目录，新的bash会话（实例）会更改目录，但是一旦退出并将控制权返回给父bash会话，父会话仍然留在先前的位置（不会有目录的更改）。 同样，如果 script.sh 定义了要在终端中访问的函数，需要用 source 命令在当前bash会话中定义这个函数。否则，如果你运行 ./script.sh，只有新的bash会话（进程）才能执行定义的函数，而当前的shell不能。

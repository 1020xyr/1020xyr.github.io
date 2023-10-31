---
title: 《C++沉思录》读书笔记
date: 2023-02-04 16:17:55
tags: C++沉思录 C++ 阅读笔记
categories: 学习记录
index_img: https://img-blog.csdnimg.cn/0150c2c57e904e4f8360ffc71badd3df.jpeg
---
<meta name="referrer" content="no-referrer" />


# 序幕
本书中多次强调，C++最基本的设计理念就是用类来表示概念，C++解决复杂性的基本原则是抽象，面向对象思想是C++的手段之一，而不是全部。
本书并不是教C++语言本身，而是想告诉你用C++时怎样进行思考，以及如何思考问题并用C++表述解决方案。知识可以通过系统学习获得，智慧则不能。


什么事情是C++可以做好而C做不好的。
例子：
**需求1：实现打印消息的功能**
C

```cpp
#include <stdio.h>

void println(const char *msg) { printf("%s\n", msg); }

int main() {
  println("main() begin");
  println("main() end");
}
```

C++
```cpp
#include <iostream>

class Trace {
 public:
  void PrintLn(const char *msg) { printf("%s\n", msg); }
};

int main() {
  Trace t;
  t.PrintLn("main() begin");
  t.PrintLn("main() end");
}
```
显然，C语言更加简洁
**需求2：增加开启关闭输出功能**
C
```c
#include <stdio.h>

static int open = 1;
void println(const char *msg) {
  if (open) {
    printf("%s\n", msg);
  }
}
void on() { open = 1; }
void off() { open = 0; }

int main() {
  println("main() begin");
  off();
  println("msg1");
  on();
  println("msg2");
  println("main() end");
}
```
C++

```cpp
#include <iostream>

class Trace {
 public:
  Trace() : open_(true) {}
  void PrintLn(const char *msg) {
    if (open_) {
      printf("%s\n", msg);
    }
  }
  void On() { open_ = true; }
  void Off() { open_ = false; }

 private:
  bool open_;
};

int main() {
  Trace t;
  t.PrintLn("main() begin");
  t.Off();
  t.PrintLn("msg1");
  t.On();
  t.PrintLn("msg2");
  t.PrintLn("main() end");
}
```
现在C与C++的复杂度类似，但C实现中对同一份状态open进行操作，而C++则可创建不同的对象控制各个消息的输出。
**需求3：允许程序输出到标准输出设备之外的设备文件**
C

```cpp
#include <stdio.h>

static int open = 1;
static FILE *out;  // 不能在此赋值stdout，报错initializer element is not constant
void println(const char *msg) {
  if (open) {
    fprintf(out, "%s\n", msg);
  }
}
void on() { open = 1; }
void off() { open = 0; }
// C语言没有默认参数，也没有函数重载
void init_outstream() { out = stdout; }
void set_outstream(FILE *f) { out = f; }
int main() {
  init_outstream();
  println("main() begin");
  off();
  println("msg1");
  on();
  println("msg2");
  println("main() end");

  FILE *f = fopen("1.txt", "a+");
  set_outstream(f);
  println("main() begin");
  off();
  println("msg1");
  on();
  println("msg2");
  println("main() end");
}
```
C++

```cpp
#include <iostream>

class Trace {
 public:
  Trace() : open_(true), out_(stdout) {}
  Trace(FILE *out) : open_(true), out_(out) {}
  void PrintLn(const char *msg) {
    if (open_) {
      fprintf(out_, "%s\n", msg);
    }
  }
  void On() { open_ = true; }
  void Off() { open_ = false; }

 private:
  bool open_;
  FILE *out_;
};

int main() {
  Trace t;
  t.PrintLn("main() begin");
  t.Off();
  t.PrintLn("msg1");
  t.On();
  t.PrintLn("msg2");
  t.PrintLn("main() end");

  FILE *f = fopen("1.txt", "a+");
  Trace file_trace(f);
  file_trace.PrintLn("main() begin");
  file_trace.Off();
  file_trace.PrintLn("msg1");
  file_trace.On();
  file_trace.PrintLn("msg2");
  file_trace.PrintLn("main() end");
}
```
&emsp; 当前版本的实现中，C++比C简洁许多，且**main函数第一段代码可以原封不动的拿来用**，不需要修改已有的代码，而C实现则随着需求的增多，越来越臃肿，所以可以说C++是迎接变化的。

&emsp; 为什么在C方案中进行扩展会如此困难呢？难就难在**没有一个合适的位置来存储辅助的状态信息**——文件指针 输出开关。向原本没有考虑存储状态信息的设计中添加这项能力是很难的，在C中常见的做法是**找个地方把它藏起来**，但对于多个文件指针，输出流则很难有效控制了。
&emsp;  结果是，C倾向于不存储状态信息，除非事先已经规划妥当。因此C程序员趋向于假设有这样一个“环境”：存在一个位置集合，他们可以在其中找到系统的当前状态。如果只有一个环境和一个系统，这样考虑毫无问题。但是，系统在不断增长的过程中往往需要引入某些独一无二的东西，并且创建更多这类东西。

**小结**：是什么使得对系统的改变如此容易呢？关键在于，一项计算的状态作为对象的一部分应当是显式可用的，而不是某些隐藏在幕后的东西。实际上，**将一项计算的状态显式化**，这个理念对于整个面向对象编程思想来说，都是一个基础。
例子：
```cpp
push(x);
push(y);
add(); // 将栈顶两数字相加
z=pop();
```
我们很容易看出这些函数都在对一个栈进行操作，但这个堆栈隐藏在幕后，我们不知道它的位置。
```cpp
s.push(x);
s.push(y);
s.add();
z=s.pop();
```
而对于以上的代码，很容易看出堆栈就在s中

C语言等效的写法为（传入显式的this指针）
```c
push(s,x);
push(x,y);
add(s);
z=pop(s);
```
这种写法在C中比较少见，C++采用类将状态和动作绑在一起，C则不然。
# 动机
&emsp;抽象是有选择的忽略，编程依赖于一种选择：选择忽略什么和何时忽略。也就是说，编程是通过建立抽象来忽略那些我们此刻并不重视的因素。
&emsp;本书坚持以两个思想为核心：**实用和抽象**，本篇将探讨C++如何支持这些思想，后面几篇将探索C++允许使用的各种抽象机制。
### 第1章 为什么我用C++
&emsp;本章主要论证C语言的字符串处理非常复杂，继而转向C++
相关代码段如下
```cpp
// 读取八进制文件
parm = getfield(tf);
mode = cvlong(parm,strlen(parm),8);

// 读入用户名
uid = numuid(getfield(tf));

// 读入小组号
gid = numgid(getfield(tf));

// 读入文件名
path = transname(getfield(tf));

// 直到行尾
geteol(tf);
```
getfield函数的返回值是一个字符串，但C中并没有字符串类型，故使用字符指针。那么何时回收内存呢？
1 每次调用函数都使用malloc分配新内存，由使用者自己决定何时释放内存，容易泄露内存。
```cpp
char* getfield(FILE* f){
	char* p = (char *)malloc(len);
	return p;
}

s = getfield(tf);
uid = numuid(s);
free(s);
```
2 让getfield返回的内存块有效期保存到下次调用为止。
```c
char* getfield(FILE* f){
	static char p[10000];
	return p;
}
```
此时不用回收getfield函数传回的内存，但当想保留结果时则需要将结果额外复制一份（多线程不安全？）。
结果就是，程序大部分工作花在进行**簿记（内存管理）**，而不是解决实际问题。

C中的字符串生命周期分为三种：1 字符串常量 2 静态缓冲区 3 动态分配的内存，C中处理字符串的函数需要遵循各式各样的规则，非常麻烦。在使用你的程序时，如果因为不遵守规则而导致工作失败，大部分人不会反躬自省，反而会怪罪到你头上。C可以做好很多事情，但不能处理灵活多变的字符串。

以后我用C++编程时，还有过几次类似的经历。 **我考虑问题的本质是什么，再定义一个类来抓住这个本质，并确保这个类能独立地工作，然后在遇到符合这个本质的问题时就使用这个类。** 令人惊讶的是，解决方法通常只用编译一次就能工作了。
我的C++程序之所以可靠，是因为我在定义C++类时运用的思想比用C做任何事情时都多得多。只要类定义正确，我就只能按照我编写的初衷那样去用它。因此，我认为C++有助于直接表达我的思想并实现我的目的。
我认为C++强大的表达能力与其几个特殊函数有关，这样类就能“自动”地完成某些事情（资源释放，控制权转移），而C很难做到这一点。
[C++类的六大函数--构造、析构、拷贝构造、移动构造、拷贝赋值、移动赋值](https://www.cnblogs.com/lincz/p/10768607.html)
[C++ 的 std::string 有什么缺点？](https://www.zhihu.com/question/35967887)
### 第2章 为什么用C++工作
&emsp;本章主要论述小项目，小系统往往容易成功，而大项目则因为项目组成员间的交流协调造成了太多开销而表现平平，引入管理者和组织者并不能有效提升软件开发效率，所以需要将大项目拆分成一个个独立的小项目，并通过项目间的接口对接，每个项目的成员不需要关心接口之外的东西。
&emsp;**作者：** 当我在处理大问题时，“抽象”这个工具总能帮助我**将问题分解为独立的子问题，并确保它们相互独立**，当我处理问题的某个部分时，完全不必担心其他部分。例如在使用汇编语言时，经常使用寄存器，内存，以及相关指令，而这些概念本身就是一种抽象，如果抛开提供的抽象不用，程序的运行就要表示成处理器内无数个门电路的状态变换；又比如操作系统所提供的文件概念，实际上也是一种由程序和数据结构的集合所支持的抽象，文件在物理介质上并不存在。

&emsp;由malloc函数实现的动态内存的概念就是C库中经常使用的抽象。要成功使用抽象，就必须遵循一些规范。要成功使用动态内存，程序员必须：

 1. 知道分配多大内存
 2. 不使用超出分配范围外的内存
 3. 当且仅当不再需要时释放内存
 4. 只释放分配的内存
 5. 切记检查每个分配请求，以确保成功

要记住的东西很多，而且一不留神就会出错，有些语言通过垃圾回收（java go）来解决动态内存问题，但垃圾回收要求系统在运行速度，编译器和运行时的系统复杂度方面付出代价，同时垃圾回收策略只关注内存，不管理其他资源。**C++用抽象的眼光看待数据结构，利用构造函数和析构函数来构建初始化与终止的概念，而不仅仅实现内存分配与释放。**

### 第3章 生活在现实世界中
&emsp;本章主要介绍C++的可移植性与可并存性。编程语言是解决问题的工具，我们不可能为特定工具挑选问题，如果必须与已经存在的软件系统共存，就不能为了使用自己的工具而重写所有代码，而是选择能被软件系统兼容的工具。明智的程序员对待Lisp和任何其他编程语言的态度应当是：**把它们当成工具，这一种合适时就采用这一种；如果另一种更管用，则选用另一种**
# 类与继承
&emsp;作者认为的面向对象编程（OOP）即是使用**继承和动态绑定**的编程方式，这种编程风格在处理那些相似而又有所不同的实体的程序中非常有用。继承是一种抽象，它允许程序员在某些时候忽略相似对象间的差异，又在其他时候利用这些差异。
&emsp;C++填补了OOP语言的一项空白。大多数OOP语言都提供继承和动态绑定，以及动态类型检查。因此这些语言必须在程序运行时查找成员函数（方法）以决定调用哪个函数。C++则要求程序员**在编译时就标明哪些类型是“相似的”**，因此可以在编译那些将来可能动态绑定的函数调用时检查类型。采用这种编译时检查的方式是因为C++能为动态绑定的函数调用快速生成代码。只有在程序通过指向基类对象的指针或基类对象的引用调用虚函数时，才会发生运行时的多态现象。
&emsp;如果一系列类之间存在继承关系，当我们需要创建，复制和存储对象，而这些对象的确切类型只有到运行时才能知道时，则这种编译时检查会带来一些麻烦。通常解决这种问题的方法是**增加一个间接层**。传统的C模型可能会建议采用**指针**来实现这个间接层。这样做会让用户必须参与内存管理。C++采用了一种更自然的方法：定义一个类来提供并且隐藏这个间接层。这个类通常叫做**句柄类**，句柄类采用最简单的形式，把一个单一类型的对象与一个与之有某种继承关系的任意类型的对象捆绑起来。所以句柄可以让我们忽略正在处理的对象的准确类型，同时还能避免指针带来的内存管理方面的麻烦，句柄类的常见作用是通过避免不必要的复制来优化内存管理（引用计数）。
### 第4章 类设计者的核查表
以下这些问题没有确切的答案，它们的目的是提醒你思考它们，并确认你所做的事情是出于有意识的决定，而不是偶然事件。

 1. 你的类需要一个构造函数吗？
 2. 你的数据成员是私有的吗？   通常使用公有的数据成员不是什么好事，因为类设计者无法控制何时访问这些成员。
 3. 你的类需要一个无参的构造函数吗？
 4. 是不是每个构造函数都需要初始化所有的数据成员？
 5. 类需要析构函数吗？
 6. 类需要一个虚析构函数吗？
 7. 你的类需要复制构造函数吗？
 8. 你的类需要一个赋值操作符吗？
 9. 你的赋值操作符能正确地将对象赋值给对象本身吗？（自我赋值问题）
 10. 你的类需要定义关系操作符吗？
 11. 删除数组时你记住用delete[]了吗？
 12. 记住在复制构造函数和赋值操作符的参数类型中加上const了吗？（现在编译器强制加const）
 13. 如果函数有引用参数，它们应该是const引用吗？
 14. 记得适当声明成员函数为const了吗？
 
  

### 第5章 代理类
&emsp;我们怎样才能设计一个C++容器，使它有能力包含类型不同但彼此相关的对象呢？容器通常只能包含一种类型的对象，所以很难在容器中存储对象本身。存储指向对象的指针，虽然允许通过继承来处理类型不同的问题，但是也增加了内存分配的额外负担。

&emsp;本章中通过代理（surrogate）对象来解决该问题。代理运行起来和它所代表的对象基本相同，但是允许将整个派生层次压缩在一个对象类型中。代理类是句柄类中最简单的一种。

示例类：

```cpp
class Vehicle {
 public:
  virtual double Weight() const = 0;
  virtual void start() = 0;
  virtual ~Vehicle() = default;
  // ...
};

class RoadVehicle : public Vehicle { /*...*/
};

class AutoVehicle : public Vehicle { /*...*/
};

class Aircraft : public Vehicle { /*...*/
};
```

需求：跟踪处理一系列不同种类的Vehicle

**经典解决方案**
第一种方法：直接使用基类数组
```cpp
Vehicle parking_lot[1000];
AutoVehicle x = /* ... */
parking_lot[num++] = x;
```
问题：抽象基类不允许实例化，深层次的原因是parking_lot是Vehicle的集合，而不是所有继承自Vehicle的集合

第二种方法：使用基类指针的数组
实现灵活性的常见做法是提供一个**间接层（indirection）**

```cpp
Vehicle* parking_lot[1000];
AutoVehicle x = /* ... */
parking_lot[num++] = &x;
```
问题一：x为局部变量，如果x不存在了，指针悬挂
解决：存储指向对象副本的指针

```cpp
Vehicle* parking_lot[1000];
AutoVehicle x = /* ... */
parking_lot[num++] = new AutoVehicle(x);
```

新的问题：带来了动态内存管理的开销，无法应付以下需求

奇怪的需求：让parking_lot[p]指向新建的Vehicle，这个Vehicle的类型和值与parking_lot[q]指向的对象相同

```cpp
// 可能的解决方案一：此时二者指向相同的对象
if (p != q) {
  delete parking_lot[p];
  parking_lot[p] = parking_lot[q];
}

// 可能的解决方案二：没有Vehicle类型的对象，即使有也不是我们想要的
if (p != q) {
  delete parking_lot[p];
  parking_lot[p] = new Vehicle(*parking_lot[q]);
}
```

### 第6章 句柄：第一部分
### 第7章 句柄：第二部分
### 第8章 一个面向对象程序范式
### 第9章 一个课堂练习的分析（上）
### 第10章 一个课堂练习的分析（下）
### 第11章 什么时候不应当使用虚函数
# 模板

# 库

# 技术

#  总结


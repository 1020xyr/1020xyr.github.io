---
title: c++学习笔记
date: 2019-10-11 23:20:23
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


使用静态类型的编程语言是在编译时执行类型检查，而不是在运行时执行类型检查。
标准的 C++ 由三个重要部分组成：

1 **核心语言**，提供了所有构件块，包括变量、数据类型和常量，等等。<br/>
2 **C++ 标准库**，提供了大量的函数，用于操作文件、字符串等。<br/>
3 **标准模板库**（STL），提供了大量的方法，用于操作数据结构等。<br/>
程序 g++ 是将 gcc 默认语言设为 C++ 的一个特殊的版本，链接时它自动使用 C++ 标准库而不用 C 标准库。<br/>
通过遵循源码的命名规范并指定对应库的名字，用 gcc 来编译链接 C++ 程序是可行的<br/>
bool 布尔型<br/>
wchar_t 宽字符型 typedef short int wchar_t;<br/>

类型修饰符<br/>  

signed<br/>
unsigned<br/>
short<br/>
long<br/>
typedef type newname; <br/>
typedef int feet;<br/>
枚举类型(enumeration)是C++中的一种派生数据类型，它是由用户定义的若干枚举常量的集合。<br/>
enum 枚举名{ <br/>
     标识符[=整型常数], <br/>
     标识符[=整型常数], <br/>
... 
    标识符[=整型常数]		<br/>
} 枚举变量;
enum color { red, green, blue } c;<br/>
c = blue;    <br/>
基本类型 bool char int float double void wchar_t<br/>
其他类型 枚举、指针、数组、引用、数据结构、类<br/>
不带初始化的定义：带有静态存储持续时间的变量会被隐式初始化为 NULL<br/>
（所有字节的值都是 0），<br/>
其他所有变量的初始值是未定义的。<br/>
左值（lvalue）：指向内存位置的表达式被称为左值（lvalue）表达式。左值可以出现在赋值号的左边或右边。<br/>
右值（rvalue）：术语右值（rvalue）指的是存储在内存中某些地址的数值。右值是不能对其进行赋值的表达式，<br/>
也就是说，右值可以出现在赋值号的右边，但不能出现在赋值号的左边。<br/>
int g = 20; //g 左值 20 右值<br/>
在所有函数外部定义的变量（通常是在程序的头部），称为全局变量。<br/>
当局部变量被定义时，系统不会对其初始化，您必须自行对其初始化。<br/>
定义全局变量时，系统会自动初始化为下列值 0 '\0' NULL<br/>
我们不应把 true 的值看成 1，把 false 的值看成 0。<br/>
在 C++ 中，有两种简单的定义常量的方式：<br/>

使用 #define 预处理器。<br/>
	#define LENGTH 10 <br/>
使用 const 关键字。<br/>
   const int  LENGTH = 10;<br/>
 由 restrict 修饰的指针是唯一一种访问它所指向的对象的方式。<br/>
#随机数
<pre><code>
#include stdlib.h 
#include time.h 
srand((unsigned)time(NULL));   //srand()函数产生一个以当前时间开始的随机种子 
rand() % n 0到n-1
</pre></code>
参数与成员变量重名 //this->n = n;
#string类
##string 使用反向迭代器来完成逆序排列
<pre><code>
#include iostream
#include string
using namespace std;
int main()
{
     string str("cvicses");
     string s(str.rbegin(),str.rend());
     cout << s <<endl;
     return 0;
}
//输出：sescivc
</pre></code>
<pre><code>
#include iostream
#include string
 
using namespace std;
 
int main ()
{
   string str1 = "Hello";
   string str2 = "World";
   string str3;
   int  len ;
 
   // 复制 str1 到 str3
   str3 = str1;
   cout << "str3 : " << str3 << endl;
 
   // 连接 str1 和 str2
   str3 = str1 + str2;
   cout << "str1 + str2 : " << str3 << endl;
 
   // 连接后，str3 的总长度
   len = str3.size();
   cout << "str3.size() :  " << len << endl;
 
   return 0;
}
</pre></code>


#STL

##容器
	容器（Containers）	容器是用来管理某一类对象的集合。C++ 提供了各种不同类型的容器，比如 deque、list、vector、map 等。

###向量容器vector类
	**在容器后方插入或删除元素，可通过下标直接访问**
vector是一种线性顺序结构，它的大小和所用内存是不定的，会在使用中自动分配<br/>vector是一个类模板，像vector（int）才叫一种数据类型。它的存储空间是连续的。
<pre><code>
vector(vector(int)   )  vecInt(n, vector(int)(n));  //n*n int数组容器 
参数直接int？
vector<int> test(tmp,tmp+10);
	for (int i = 0;i < 10;i++)
		cout << test[i] << " ";
</pre></code>


##algorithm
	算法（Algorithms）	算法作用于容器。它们提供了执行各种操作的方式，包括对容器内容执行初始化、排序、搜索和转换等操作。
### 内置sort
**1** algorithm头文件 

**2** 函数使用方法：sort(首元素地址，**尾元素地址的下一个地址**，比较函数)    //前两个参数必填，比较函数不填，默认递增

**3**比较函数可以自己写，函数或者类都可以，也可以用标准库里自带的模板类：greater,less足够用

	递减：sort(begin,end+1,greater<data_type>())

	递增：sort(begin,end+1,less<data_type>())

##迭代器
	迭代器（iterators）	迭代器用于遍历对象集合的元素。这些集合可能是容器，也可能是容器的子集。

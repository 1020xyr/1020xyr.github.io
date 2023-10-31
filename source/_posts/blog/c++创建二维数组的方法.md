---
title: c++创建二维数组的方法
date: 2019-10-02 11:59:43
tags: c++创建二维数组 二维数组 c++
categories: 
---
<meta name="referrer" content="no-referrer" />



# 用malloc函数创建二维数组
```java
int first(int row,int col) {
	int** array = (int**)malloc(sizeof(int*) * row);
	if (array != NULL) {   //如果申请成功
		for (int i = 0;i < row;i++) {
			array[i] = (int*)malloc(sizeof(int) * col);
			if (array[i] != NULL)   //如果申请成功 
				memset(array[i], 0, col * sizeof(int)); //初始化为0
			else
				return -1;
		}
		for (int i = 0;i < row;i++) {
			free(array[i]);			//释放内存
		}
		free(array);    			//释放内存
		array = NULL;				//指针重定向，避免野指针
	}
	return 0;
}
```
**解释**
**1**
用malloc函数创建二维数组需调用#include<stdlib.h> 库函数，且需要判断内存是否分配成功   <mark>一般情况下都会成功，以防万一</mark>
**2**
 用该方法分配的内存空间不连续，不能通过 array[i * width + j] 访问数组
 **3**
 初始化函数 memset函数原型
 **void * memset (void * p,int c,size_t n);**
 memset函数以字节为单位进行赋值，故对int double型时只能赋值0
 详细解释参见[浅谈C中malloc和memset函数](https://blog.csdn.net/a351945755/article/details/20142809).
 # 用new运算符创建二维数组
 ```java
 void second(int row, int col) {
	int** array = new int* [row];
	for (int i = 0;i < row;i++) {
		array[i] = new int[col]();
	//tmp[i]=new int[m]{}; {}是()的一种扩展方式，最好统一用() 避免错误 
	//全部初始化为0
	}
	Print(row, col, array);
	for (int i = 0;i < row;i++) {
		delete[] array[i];         //释放内存
	}
	delete[] array;          	 //释放内存
	array = NULL;  			//指针重定向，避免野指针
}
```
**解释**
**1**
用new运算符请求的内存同样不连续
**2**
new的初始化更多细节参见[new的初始化](https://blog.csdn.net/u012494876/article/details/76222682).
**3**
关于new与malloc的区别参见[new和malloc的区别](https://blog.csdn.net/zjc156m/article/details/16819357).这篇文章讲的很详细，建议看一下
特别注意**new malloc分配的内存空间都在堆中**
# 使用STL中的容器类创建二维数组
```java
void three(int row, int col) {
	vector<vector<int> >array(row, vector<int>(col,1));
	//vector<vector<int> >array(row, vector<int>(col));此时初始化为0
}
```
**解释**
1：使用vector创建二维数组需要导入#include <vector>库
2： 这种方式创建的二维数组内存连续，可以使用array[i * width + j]访问数组，且并不需要内存回收，故推荐使用这种方式
另外
	**vector的元素被初始化为与其类型相关的缺省值：算术和指针类型的缺省值是 0，对于class 类型，缺省值可通过调用这类的缺省构造函数获得，我们还可以为每个元素提供一个显式的初始值来完成初始化，例如 
	vector< int > ivec( 10, -1 ); 
	定义了 ivec 它包含十个int型的元素 每个元素都被初始化为-1 不需要回收空间**


<mark>第一次写博客，如有不足之处，望请提出</mark>



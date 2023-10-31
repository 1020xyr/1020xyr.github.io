---
title: Visual Studio：无法解析的外部符号
date: 2021-04-08 11:25:46
tags: ide
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


最近用Visual Studio写项目时，自己新增了两个文件（.h和.cpp），并在main.cpp中调用该类。但生成解决方案时一直显示无法解析的外部符号。在网上搜索了了许多种方法，都没有发现问题所在。头文件中定义的类方法都在源文件实现了，**而无法解析的外部符号实际上就是指没有找到该类的实现**。在观察生成解决方式时输出列表的编译文件发现，并没有编译我新建的源文件。故在.vcxproj文件中修改编译选项
```xml
<ClCompile Include="src\ssd\Host_Interface_SATA.cpp" />
<ClCompile Include="src\ssd\IO_Flow_Extra_Parameter.cpp" /> //新加的源文件
<ClCompile Include="src\ssd\NVM_Firmware.cpp" />
```
而后就能成功生成了！

#### 头文件与源文件
头文件一般用定义类，为避免多次引用，需在前面加上ifndef define，最后加上endif并带上标识（一般为文件名大写_H)

示例
```c
//IO_Flow_Extra_Parameter.h
#ifndef IO_FLOW_EXTRA_PARAMETER_H
#define IO_FLOW_EXTRA_PARAMETER_H

#include<vector>
#include "../sim/Sim_Defs.h"
namespace SSD_Components
{
	class IO_Flow_Extra_Parameter
	{
	public:
		std::vector<sim_time_type> expected_response_times;
		std::vector<int> io_flow_intensities;
		std::vector<sim_time_type> real_response_times;
		std::vector<sim_time_type> waiting_times;
		std::vector<double> weights;
		int IO_Flow_Number;
		static IO_Flow_Extra_Parameter* _instance;

		IO_Flow_Extra_Parameter();

		void Reset();
		static IO_Flow_Extra_Parameter* Instance();
	};
}
#define Extra_Parameter SSD_Components::IO_Flow_Extra_Parameter::Instance()
#endif // !IO_FLOW_EXTRA_PARAMETER_H

//IO_Flow_Extra_Parameter.cpp
#include "IO_Flow_Extra_Parameter.h"

namespace SSD_Components
{
	IO_Flow_Extra_Parameter* IO_Flow_Extra_Parameter::_instance = NULL;

	IO_Flow_Extra_Parameter::IO_Flow_Extra_Parameter() {
	}
	IO_Flow_Extra_Parameter* IO_Flow_Extra_Parameter::Instance() {
		if (_instance == NULL) {
			_instance = new IO_Flow_Extra_Parameter();
		}
		return _instance;
	}

	void IO_Flow_Extra_Parameter::Reset()
	{
		expected_response_times.clear();
		io_flow_intensities.clear();
		real_response_times.clear();
		waiting_times.clear();
		weights.clear();

	}
}
```
如果我们导入一个头文件，实际上在预编译阶段编译器就会直接将该头文件中的所有内容复制进该文件，这些头文件中一般只是方法声明，而没有定义。等到链接阶段，才将真正的方法定义连接起来（源文件的obj文件中存在方法定义）
### 命名空间
命名空间可作为附加信息来区分不同库中相同名称的函数、类、变量等。使用了命名空间即定义了上下文。本质上，命名空间就是定义了一个范围。
您可以使用 using namespace 指令，这样在使用命名空间时就可以不用在前面加上命名空间的名称。这个指令会告诉编译器，后续的代码将使用指定的命名空间中的名称。


[无法解析的外部符号的几种可能（lib方面的）](https://blog.csdn.net/educast/article/details/12491473)
[浅谈头文件(.h)和源文件(.cpp)的区别](https://www.cnblogs.com/scyq/p/12287140.html)


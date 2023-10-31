---
title: vscode彻底卸载记录/使用经验
date: 2022-03-30 15:49:41
tags: linux vscode
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


vscode用久了一堆奇奇怪怪的东西和设置，就打算重装一下vscode，反正就当一个能高亮的编辑器。
 删除远程主机扩展
```bash
rm -rf ~/.vscode-server
```

 1. 点击vscode安装文件夹unins000.exe，完成vscode程序的卸载
 2. 删除C:\Users\xxx\.vscode文件夹
 3. 删除C:\Users\xxx\AppData\Roaming\Code
[彻底卸载VSCode](https://blog.csdn.net/qq_29339467/article/details/104074758)




重新安装vscode，将vscode设置成简体中文
Ctrl + Shift + P，切入到命令行模式。输入“Configure display Language”
下载简体中文语言包，切换语言包


下载vscode插件

 1. Theme - Oceanic Next
 2. Vscode-icons
 4. c++前两个插件
 ![](https://img-blog.csdnimg.cn/c87f840328b241598931def0e9567846.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_8,color_FFFFFF,t_70,g_se,x_16)

[推荐两款好看的 Vscode主题插件](https://cloud.tencent.com/developer/article/1592654)


json配置文件中加入
```bash
"editor.mouseWheelZoom": 
 true
```
用Ctrl+滚轮实现代码的缩放


**代码格式化快捷键**
● On Windows Shift + Alt + F

● On Mac 　　Shift + Option + F

● On Ubuntu Ctrl + Shift + I

**保存时自动格式化**
```bash
# "editor.formatOnType": true, 不应该每写一行就格式化

"editor.formatOnSave": true,
```

```bash
"C_Cpp.clang_format_fallbackStyle": " Google", # 设置风格为谷歌
"C_Cpp.default.cppStandard": "c++20"           # 标准为c++20
```
显示.git文件夹
```bash
"files.exclude": {
     "**/.git": false
}
```


**vscode下载加速**
    首先进入vscode官方网站然后选择对应版本下载
    然后进入浏览器下载页面
    复制下载链接粘贴到地址栏
    将地址中的/stable前换成vscode.cdn.azure.cn

[VsCode下载，使用国内镜像秒下载](https://blog.csdn.net/bielaiwuyang1999/article/details/117814237)


**格式化行长度**
可以设置格式化时行的最大长度（我不怎么喜欢格式化时不太长的行分成两行），可以按自己习惯设置行长度
```bash
"C_Cpp.clang_format_fallbackStyle": "{BasedOnStyle: Google, ColumnLimit: 100}",
```

	ColumnLimit (unsigned)
	限制列。
	列的限制为0意味着没有列限制。在这种情况下，clang-format将谨慎对待在声明中输入行的换行决定，除非与其他规则矛盾。
有时需改动.clang-format文件

扩展设置分为用户，远程，工作区，一个没生效可以都试一下。

**使用vscode配置C/C++运行程序**
[Windows下VSCode配置C++环境](https://zhuanlan.zhihu.com/p/105135431)
大学的时候配置Windows的vscode c++环境总是出现问题，后面就懒得配了，直接开Linux虚拟机然后用vscode远程连接，命令行g++运行 gdb调试，虽然也可以，但确实有点麻烦，最近想花点时间研究一下为什么出问题，没想到这次一点问题也没有，按照文章的步骤几下就成功了，不知道为什么我以前一直没配成，还是要勇于打破固有观念，vscode的调试功能确实好用

[VScode（C/C++）无法自动生成launch.json文件解决办法](https://blog.csdn.net/weixin_55644008/article/details/125820835)
切换c++扩展版本至1.8.4

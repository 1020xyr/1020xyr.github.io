---
title: sort
date: 2020-02-04 20:14:57
tags: 
categories: 算法
---
<meta name="referrer" content="no-referrer" />


## sort
### 内置sort方法

在oj中
时间超时
<mark>cin cout 改成 scanf printf</mark>

表示错误
<mark>空格与换行符的输出是否错误</mark>
```cpp
#include<iostream>
#include<vector>
#include<algorithm>

using namespace std;
bool cmp(int a, int b) {
	return a > b;
}
void func() {
	int n, m;
	while(scanf ("%d %d",&n,&m) != EOF){
		vector<int> a(n);
		for (int i = 0;i < n;i++) {
			scanf("%d",&a[i]);
		}
		sort(a.begin(), a.end(), cmp);
		for (int i = 0;i < m-1;i++) {
			printf("%d ",a[i]);
		}
		printf("%d",a[m-1]);
		printf("\n");
	}
}
int main() {
	func();
	return 0;
}
```
### hash方法

```cpp
#include<iostream>
#include<vector>
#include<stdio.h>
#define OFFSET 500000
using namespace std;

vector<int> a(1000001, 0);
void func() {
	int n, m;
	while (scanf ("%d %d",&n,&m) != EOF) {
		int temp;
		for (int i = 0;i < n;i++) {
			scanf("%d",&temp);
			a[temp + OFFSET] =  1;
		}
		for (int i = 500000; i >= -500000; i --) { 
			if (a[i + OFFSET] == 1) { 
				printf("%d",i); 
				m --; 
				if (m != 0) printf(" "); 
			
				else {
					printf("\n"); 
					break;
				}
			}
		}
	}
}
int main() {
	func();
	return 0;
}
```
### 示例代码

```cpp
#include <stdio.h>
#define OFFSET 500000
int Hash[1000001]; 
int main () {
	int n , m;
	while (scanf ("%d%d",&n,&m) != EOF) {
		for (int i = -500000; i <= 500000; i ++) {
			Hash[i + OFFSET] = 0;
		} 
		for (int i = 1; i <= n; i ++) {
			int x;
			scanf ("%d",&x);
			Hash[x + OFFSET] = 1; 
		}
		for (int i = 500000; i >= -500000; i --) { 
			if (Hash[i + OFFSET] == 1) { 
				printf("%d",i); 
				m --; 
				if (m != 0) printf(" "); 
			
				else {
					printf("\n"); 
					break;
				}
			}
		}
	}
	return 0;
}
```

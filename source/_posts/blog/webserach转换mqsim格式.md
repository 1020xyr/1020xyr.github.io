---
title: webserach转换mqsim格式
date: 2020-12-30 09:56:09
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


# webserach转换mqsim格式

```cpp
#include <stdio.h>
#include <iostream>
#include <string>
#include <math.h>

//webserach： 0, 657728, 8192, R, 0.011413
//mqsim： 	  11413000 0 657728 16 1
using namespace std;

void func() {

	FILE *fp1 = fopen("WebSearch1.spc", "r");
	FILE *fp2 = fopen("test.trace", "w");

	int dev, lba, size;
	double time;
	char way;
	double mul = pow(10, 9);
	while (fscanf(fp1, "%d,%d,%d,%c,%lf", &dev, &lba, &size, &way, &time) != EOF) {
		cout << dev << lba << size << way << time << endl;
		time *= mul;
		int opCode;
		if (way == 'R') {
			opCode = 1;
		} else {
			opCode = 0;
		}
		fprintf(fp2, "%.0lf %d %d %d %d\n", time, dev, lba, size / 512, opCode);

	}
	fclose(fp1);
	fclose(fp2);
}

int main() {
	func();
	return 0;
}

```


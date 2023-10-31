---
title: 第十八次CSP认证
date: 2019-12-17 11:07:13
tags: 算法
categories: 
---
<meta name="referrer" content="no-referrer" />



# 1.cpp（100分）

```cpp
#include<iostream>
#include<vector>

using namespace std;
bool have(int x){
	if(x%7==0)
		return true;
	while(x!=0){
		if(x%10==7)
			return true;
		x = x / 10;
	}
	return false;
}
void func(){
	int n;
	cin>>n;
	vector<int> ans(4,0);
	int index = 0;
	int num = 1;
	for(int i=0;i<n;i++){
		if(have(num)){
			ans[index]++;
			i--;
		}
		
		num++;
		index = (index + 1) % 4;
	}
	for(int i=0;i<4;i++){
		cout<<ans[i]<<endl;
	}
}

int main(){
	func();
	return 0;
}
```
# 2.cpp（100分）

```cpp
#include<vector>
#include<algorithm>
#include<iostream>

 using namespace std;
 
 typedef struct{
 	long long x,y;
 	int index;
 }plot;
 
 bool cmp_x(plot p1,plot p2){
 	return p1.x<p2.x;
 }
 
 
 int findx(vector<plot> t,long long x){
 	int len = t.size();
 	for(int i=0;i<len;i++){
 		if(t[i].x==x){
 			return i;
 		}
 	}
 	return -1;
 }
 
 bool process(vector<plot> t,vector<plot> tx,long long x,long long y){
 	int start = findx(tx,x);
 	int len = tx.size();
 	if(start==-1){
 		return false;
 	}
 	while(start<len&&tx[start].x==x){
 		int index = tx[start].index;
 		if(t[index].y==y){
 			return true;
 		}
 		start++;
 	}
 	return false;
 }
 void func(){
 	int n;
 	cin>>n;
 	vector<plot> tmp;
 	for(int i=0;i<n;i++){
 		long long x,y;
 		cin>>x>>y;
 		plot p;
 		p.x = x;
 		p.y = y;
 		p.index = i;
 		tmp.push_back(p);
 	}
 	vector<int> ans(5,0);
 	vector<plot> tmpx = tmp;
 	sort(tmpx.begin(),tmpx.end(),cmp_x);
 	for(int i=0;i<n;i++){
 		long long x = tmp[i].x;
 		long long y = tmp[i].y;
 		bool x1 = process(tmp,tmpx,x+1,y);
 		bool x2 = process(tmp,tmpx,x-1,y);
 		bool x3 = process(tmp,tmpx,x,y+1);
 		bool x4 = process(tmp,tmpx,x,y-1);
 		if(x1&&x2&&x3&&x4){
 			int num = 0;
 			if(process(tmp,tmpx,x+1,y+1))
 				num++;
 			if(process(tmp,tmpx,x+1,y-1))
 				num++;
 			if(process(tmp,tmpx,x-1,y+1))
 				num++;
 			if(process(tmp,tmpx,x-1,y-1))
 				num++;
			ans[num]++;	
 		}
 	}
 	for(int i=0;i<5;i++){
 		cout<<ans[i]<<endl;
 	}
 	
 }
 int main(){
 	func();
 	return 0;
 }
```
# 3.cpp(70分 样例全部通过 不知道出错点）

```cpp
#include<iostream>
#include<vector>
#include<string>
#include<stdio.h>
#include<algorithm>
#include<cstring>

using namespace std;

typedef struct{
	string s;
	int num;
}mystring;
void out(mystring x){
	cout<<x.s<<" "<<x.num<<endl;
}
void outString(vector<mystring> e){
	for_each(e.begin(),e.end(),out);
	cout<<endl;
}
bool isnumber(char c){
	if(c>='0'&&c<='9')
		return true;
	return false;
}
bool isbig(char c){
	if(c>='A'&&c<='Z')
		return true;
	return false;
}
bool issmall(char c){
	if(c>='a'&&c<='z')
		return true;
	return false;
}
int find(vector<mystring> m,string x){
	int len = m.size();
	for(int i=0;i<len;i++){
		if(m[i].s==x)
			return i;
	}
	return -1;
}
bool cmp(mystring x1,mystring x2){
	if(x1.s[0]-x2.s[0]>0)
		return true;
	else if(x1.s[0]-x2.s[0]==0){
		int size1 = x1.s.size();
		int size2 = x2.s.size(); 
		if(size1>size2){
			return true;
		} 
		if(x1.s[1]-x2.s[1]>0){
			return true;
		}
	}
	return false;
}
int tonumber(string s,int i){
	int len = s.length();
	int ans = 0;
	while(i<len&&isnumber(s[i])){
		ans = ans*10 + s[i] - '0';
		i++;
	}
	if(ans==0)
		ans = 1;
	return ans;
}
void func(string s,vector<mystring> &ans,int time){
	int len = s.length();
	if(isnumber(s[0])){
		time = tonumber(s,0);
	}
	for(int i=0;i<len;i++){
		if(isbig(s[i])){
			mystring t;
			if(i+1<len){
				if(issmall(s[i+1])){
					t.s.assign(s,i,2);
					int num = tonumber(s,i+2);
					t.num = time*num;
					
				}	
				else if(isnumber(s[i+1])){
					t.s.assign(s,i,1);
					int num = tonumber(s,i+1);
					t.num = time*num;
				}
				else{
					t.s.assign(s,i,1);
					t.num = time;
				}
			}
			else{
				t.s.assign(s,i,1);
				t.num = time;
			}
			int index = find(ans,t.s);
			if(index==-1)
				ans.push_back(t);
			else{
				ans[index].num += t.num;
			}
		}
		else if(s[i]=='('){
			int num_k = 1;
			for(int j=i+1;j<len;j++){
				if(s[j]=='(')
					num_k++;
				else if(s[j]==')'){
					num_k--;
					if(num_k==0){
						string sub;
						sub.assign(s,i+1,j-i-1);
						int num = tonumber(s,j+1);
						int time_copy = num * time;
						func(sub,ans,time_copy);
						i = j;
					}
				}
					
			}
		}
	}
	
}
void process_expression(vector<string> e,vector<mystring> &ans){
	int len = e.size();
	for(int i=0;i<len;i++){
		func(e[i],ans,1);
	}
}
void process(){
	char tmp[1000];
	vector<string> expression;
	gets(tmp);
	char *sp = strtok(tmp,"=");
	while(sp){
		expression.push_back(sp);
		sp = strtok(NULL,"=");
	}
	vector<string> expression1;
	vector<string> expression2;	
	char * tmp1 = (char*)expression[0].c_str();
	char *sp1 = strtok(tmp1,"+");
	while(sp1){
		expression1.push_back(sp1);
		sp1 = strtok(NULL,"+");
	}
	char * tmp2 = (char*)expression[1].c_str();
	char *sp2 = strtok(tmp2,"+");
	while(sp2){
		expression2.push_back(sp2);
		sp2 = strtok(NULL,"+");
	}
	vector<mystring> ans1;
	process_expression(expression1,ans1);
	vector<mystring> ans2;
	process_expression(expression2,ans2);
	sort(ans1.begin(),ans1.end(),cmp);
	sort(ans2.begin(),ans2.end(),cmp);
	int len1 = ans1.size();
	int len2 = ans2.size();
	if(len1!=len2){
		cout<<'N'<<endl;
		return;
	}
	for(int i=0;i<len1;i++){
		if(ans1[i].num!=ans2[i].num||ans1[i].s.compare(ans2[i].s)!=0){
			cout<<'N'<<endl;
			return;
		}
	}
	cout<<'Y'<<endl;
	return;
}



int main(){
	int n;
	cin>>n;
	char tmp = getchar();
	for(int i=0;i<n;i++){
		process();
	}
	return 0;
}
```
# 5.cpp（水得10分）

```cpp
if(q==1){
		int l,r;
		cin>>l>>r;
		int ans = 0;
		for(int j=l-1;j<r;j++){
			ans += A[j] % 2019;
		}
		cout<<ans;
	}
```


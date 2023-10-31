---
title: python机器学习实战一：入门
date: 2020-02-14 13:11:56
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


```python
import requests 
r = requests.get(r"https://api.github.com/users/acombs/starred") 
r.json()
import os 
import pandas as pd 
import requests 
PATH = 'C:\\Users\\15236\\Desktop\\机器学习\\'
r= requests.get('https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data') 
with open(PATH + 'iris.data', 'w') as f: 
    f.write(r.text)
os.chdir(PATH) 
df = pd.read_csv(PATH + 'iris.data', names=['sepal length', 'sepal width', 
'petal length', 'petal width', 'class']) 
df.head()
os.getcwd()  
df['sepal length']
df.iloc[:2,:3]
df.loc[:3,[x for x in df.columns if 'width' in x]]
df['class'].unique()
df[df['class']=='Iris-versicolor']
df.count()
df[df['class']=='Iris-versicolor'].count()
df.count() 
ver = df[df['class']=='Iris-versicolor'].reset_index(drop=True)
ver
df[(df['class']=='Iris-virginica')&(df['petal width']>2.0)].count()
df.describe()
df.corr()
df.corr(method="spearman")
import matplotlib.pyplot as plt 
plt.style.use('ggplot') 
%matplotlib inline 
import numpy as np
fig, ax = plt.subplots(figsize=(6,4)) 
ax.hist(df['petal width'],color='black')
ax.set_ylabel('Count',fontsize=12)
ax.set_xlabel('Width',fontsize=12)
plt.title('Iris Petal Width',fontsize=14,y=1.01)
fig, ax = plt.subplots(2,2,figsize=(6,4))
ax[0][0].hist(df['petal width'],color='black')
ax[0][0].set_ylabel('Count',fontsize=12)
ax[0][0].set_xlabel('Width',fontsize=12)
ax[0][0].set_title('Iris Petal Width',fontsize=14,y=1.01)

ax[0][1].hist(df['petal length'], color='black');
ax[0][1].set_ylabel('Count', fontsize=12)
ax[0][1].set_xlabel('Lenth', fontsize=12)
ax[0][1].set_title('Iris Petal Lenth', fontsize=14, y=1.01)

ax[1][0].hist(df['sepal width'], color='black');
ax[1][0].set_ylabel('Count', fontsize=12)
ax[1][0].set_xlabel('Width', fontsize=12)
ax[1][0].set_title('Iris Sepal Width', fontsize=14, y=1.01)

ax[1][1].hist(df['sepal length'], color='black');
ax[1][1].set_ylabel('Count', fontsize=12)
ax[1][1].set_xlabel('Length', fontsize=12)
ax[1][1].set_title('Iris Sepal Length', fontsize=14, y=1.01)

plt.tight_layout()
 
fig, ax = plt.subplots(figsize=(6,6)) 
ax.scatter(df['petal width'],df['petal length'], color='green') 
ax.set_xlabel('Petal Width') 
ax.set_ylabel('Petal Length') 
ax.set_title('Petal Scatterplot')
fig, ax = plt.subplots(figsize=(6,6))
ax.plot(df['petal length'],color='blue')
ax.set_xlabel('Specimen NUmber')
ax.set_ylabel('Petal Length')
ax.set_title('Petal Length Plot')
fig, ax = plt.subplots(figsize=(6,6)) 
bar_width = .8 
labels = [x for x in df.columns if 'length' in x or 'width' in x] 
ver_y = [df[df['class']=='Iris-versicolor'][x].mean() for x in labels] 
vir_y = [df[df['class']=='Iris-virginica'][x].mean() for x in labels] 
set_y = [df[df['class']=='Iris-setosa'][x].mean() for x in labels] 
x = np.arange(len(labels)) 
ax.bar(x, vir_y, bar_width, bottom=set_y, color='darkgrey') 
ax.bar(x, set_y, bar_width, bottom=ver_y, color='white') 
ax.bar(x, ver_y, bar_width, color='black') 
ax.set_xticks(x + (bar_width/2)) 
ax.set_xticklabels(labels, rotation=-70, fontsize=12); 
ax.set_title('Mean Feature Measurement By Class', y=1.01) 
ax.legend(['Virginica','Setosa','Versicolor'])
import seaborn as sns
sns.pairplot(df,hue='class')
fig, ax = plt.subplots(2,2,figsize=(7, 7))
sns.set(style='white', palette='muted')
sns.violinplot(x=df['class'], y=df['sepal length'], ax=ax[0,0])
sns.violinplot(x=df['class'], y=df['sepal width'], ax=ax[0,1])
sns.violinplot(x=df['class'], y=df['petal length'], ax=ax[1,0])
sns.violinplot(x=df['class'], y=df['petal width'], ax=ax[1,1])
fig.suptitle('my picture', fontsize=16, y=1.02)
for i in ax.flat:
    plt.setp(i.get_xticklabels(), rotation=-90)
    fig.tight_layout()
fig, ax = plt.subplots(2, 2, figsize=(7, 7))
sns.set(style='white', palette='muted')
sns.violinplot(x=df['class'], y=df['sepal length'], ax=ax[0,0])
sns.violinplot(x=df['class'], y=df['sepal width'], ax=ax[0,1])
sns.violinplot(x=df['class'], y=df['petal length'], ax=ax[1,0])
sns.violinplot(x=df['class'], y=df['petal width'], ax=ax[1,1])
fig.suptitle('Violin Plots', fontsize=16, y=1.03)
for i in ax.flat:
    plt.setp(i.get_xticklabels(), rotation=-90)
fig.tight_layout()
df['class'] = df['class'].map({'Iris-setosa':'SET', 'Iris-virginica': 'VIR', 'Iris-versicolor': 'VER'})
df
df['wide petal'] = df['petal width'].apply(lambda v: 1 if v >=1.3 else 0)
df
df['petal area'] = df.apply(lambda r: r['petal length']*r['petal width'], axis=1)
df
df.applymap(lambda v: np.log(v) if isinstance(v,float) else v)
df.groupby('class').mean()
df.groupby('class').describe()
df.groupby('petal width')['class'].unique().to_frame()
df.groupby('class')['petal width']\
.agg({'delta': lambda x:x.max()-x.min(), 'max':np.max, 'min' : np.min})
fig, ax = plt.subplots(figsize=(7,7))
ax.scatter(df['sepal width'][:50], df['sepal length'][:50])
ax.set_ylabel('Sepal Length')
ax.set_xlabel('Sepal Width')
ax.set_title('Setosa Sepal Width vs. Sepal Length',fontsize=14, y=1.02)
import statsmodels.api as sm
y = df['sepal length'][:50]
x = df['sepal width'][:50]
X = sm.add_constant(x)

result = sm.OLS(y,X).fit()
print(result.summary())
fig, ax = plt.subplots(figsize=(7,7))
ax.plot(x, result.fittedvalues, label='regression line')
ax.scatter(x, y, label='data point', color='r')
ax.set_ylabel('Sepal Length')
ax.set_xlabel('Sepal Width')
ax.set_title('my picture',fontsize=14,y=1.02)
ax.legend(loc=2)
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

clf = RandomForestClassifier(max_depth=5, n_estimators=10)

X = df.iloc[:,:4]
y = df.iloc[:,4]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=.3)

clf.fit(X_train,y_train)

y_pred = clf.predict(X_test)

rf = pd.DataFrame(list(zip(y_pred, y_test)), columns=['predicted', 'actual'])
rf['correct'] = rf.apply(lambda r: 1 if r['predicted'] == r['actual'] else 0, axis=1)
    
rf
rf['correct'].sum() / rf['correct'].count()
f_importance = clf.feature_importances_
f_name = df.columns[:4]
f_std = np.std([tree.feature_importances_ for tree in clf.estimators_], axis=0)

zz = zip(f_importance,f_name,f_std)
zzs = sorted(zz,key=lambda x:x[0], reverse=True)

imps = [x[0] for x in zzs]
label = [x[1] for x in zzs]
errs = [x[2] for x in zzs]

plt.bar(range(len(f_importance)), imps, color="r", yerr=errs, align="center")
plt.xticks(range(len(f_importance)), label)
from sklearn.multiclass import OneVsOneClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split

clf = OneVsOneClassifier(SVC(kernel='linear'))

X = df.iloc[:,:4]
y = np.array(df.iloc[:,4]).astype(str)

X_train, X_test, y_train, y_test = train_test_split(X,y,test_size=.3)

clf.fit(X_train,y_train)

y_pred = clf.predict(X_test)

rf = pd.DataFrame(list(zip(y_pred,y_test)), columns=['predicted', 'actual'])
rf['correct'] = rf.apply(lambda r : 1 if r['predicted']==r['actual'] else 0, axis=1)
rf
rf['correct'].sum() / rf['correct'].count()
rf
 
```


---
title: python机器学习实战二：构建应用程序，发现低价的公寓
date: 2020-02-23 20:11:29
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


```python
from __future__ import print_function,division
import pandas as pd
import re
import numpy as np
import matplotlib.pyplot as plt
import os

pd.set_option("display.max_columns",30)
pd.set_option("display.max_colwidth",100)
pd.set_option("display.precision",3)

plt.style.use('ggplot')
%matplotlib inline
os.getcwd()
CSV_PATH = "magic.csv"
df = pd.read_csv(CSV_PATH)
df.columns
df.head().T
mu = df[df['listingtype_value'].str.contains("Apartments For")]
si = df[df['listingtype_value'].str.contains('Apartment For')]
len(mu)
len(si)
si.head().T
len(si[si['pricelarge_value_prices'].isnull()])
si['pricelarge_value_prices']
si["propertyinfo_value"]
# check the number of rows that do not contain 'bd' or 'Studio'
len(si[~(si['propertyinfo_value'].str.contains("Studio")|si["propertyinfo_value"].str.contains('bd'))])
# check the number of row that do not contain 'ba'
len(si[~(si['propertyinfo_value'].str.contains('ba'))])
# select those listings with a bath
sucln = si[si['propertyinfo_value'].str.contains('ba')]
len(sucln)
# split using the bullet
def parse_info(row):
        if not 'sqft' in row:
            br, ba = row.split('•')[:2]
            sqft = np.nan
        else:
            br, ba, sqft = row.split('•')[:3]                
        return pd.Series({'Beds': br, 'Baths': ba, 'Sqft': sqft})
attr = sucln['propertyinfo_value'].apply(parse_info)
attr
#remove the strings from our values
attr_cln = attr.applymap(lambda x: x.strip().split(' ')[0] if isinstance(x, str) else np.nan)

attr_cln
sujnd = sucln.join(attr_cln)
sujnd.head().T
# parse out zip, floor

def parse_addy(r):
    so_zip = re.search(', NY(\d+)', r)
    so_flr = re.search('(?:APT|#)\s+(\d+)[A-Z]+,', r)
    if so_zip:
        zipc = so_zip.group(1)
    else:
        zipc = np.nan
    if so_flr:
        flr = so_flr.group(1)
    else:
        flr = np.nan
    return pd.Series({'Zip':zipc, 'Floor': flr})
flrzip = sujnd['routable_link/_text'].apply(parse_addy)
flrzip
suf = sujnd.join(flrzip)
suf.head().T
len(flrzip[~flrzip['Floor'].isnull()])
len(flrzip[~flrzip['Zip'].isnull()])
# we'll reduce the data down to the columns of interest
sudf = suf[['pricelarge_value_prices','Beds','Baths','Sqft','Floor','Zip']]
# we'll also clean up the weird column name
sudf.rename(columns={'pricelarge_value_prices': 'Rent'}, inplace=True)
sudf.reset_index(drop=True, inplace=True)
sudf
sudf.describe()
sudf['Beds'] = sudf['Beds'].apply(lambda x: 0 if 'Studio' in x else x)
sudf
sudf.describe()
sudf.info()
# let's fix the datatype for the columns
sudf.loc[:,'Rent'] = sudf['Rent'].astype(int)
sudf.loc[:,'Beds'] = sudf['Beds'].astype(int)

# half baths require a float
sudf.loc[:,'Baths'] = sudf['Baths'].astype(float)

# with NaNs we need float, but we have to replace commas first
sudf.loc[:,'Sqft'] = sudf['Sqft'].str.replace(',', '')

sudf.loc[:,'Sqft'] = sudf['Sqft'].astype(float)
sudf.loc[:,'Floor'] = sudf['Floor'].astype(float)
sudf.info()
sudf.describe()
len(sudf)
x = [i for i in range(len(sudf)) if sudf.iloc[i]['Floor'] > 100]
 
 
sudf = sudf.drop(x)
sudf.describe()
sudf.pivot_table('Rent', 'Zip', 'Beds', aggfunc='mean')
sudf.pivot_table('Rent', 'Zip', 'Beds', aggfunc='count')
su_two = sudf[sudf['Beds']<2]
import folium
su_two.sort_values('Zip')
su_two
import patsy
import statsmodels.api as sm

f = 'Rent ~ Zip + Beds'
y, X = patsy.dmatrices(f, su_two, return_type='dataframe')
results = sm.OLS(y,X).fit()
print(results.summary())
results.params
X
to_pred_idx = X.iloc[1].index
to_pred_zero = np.zeros(len(to_pred_idx))
tpdf = pd.DataFrame(to_pred_zero,index=to_pred_idx,columns=['value'])
tpdf
tpdf['value']
tpdf.columns
tpdf.iloc[0]
len(tpdf)
tpdf.loc['Intercept'] = 1
tpdf.loc['Beds'] = 2
tpdf.loc['Zip[T.10002]'] = 1 
tpdf
tpdf['value']
results.predict(X)
len(X)
X.columns
tpdf.columns
tpdf.T
results.predict(tpdf.T)
 
```


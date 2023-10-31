---
title: Tinyhttpd实战四：部署到云服务器
date: 2020-02-27 18:00:02
tags: 
categories: 学习记录
---
<meta name="referrer" content="no-referrer" />


### vim的基本使用
全选（高亮显示）：按esc后，然后ggvG或者ggVG

全部复制：按esc后，然后ggyG

全部删除：按esc后，然后dG
解析：
gg：是让光标移到首行，在vim才有效，vi中无效 
v ： 是进入Visual(可视）模式 
G ：光标移到最后一行 
选中内容以后就可以其他的操作了，比如： 
d  删除选中内容 
y  复制选中内容到0号寄存器 
"+y  复制选中内容到＋寄存器，也就是系统的剪贴板，供其他程序用 
### 服务器上安装FTP服务端
1 安装vsftpd
```cpp
sudo apt-get install vsftpd
```


2 修改配置文件
**/etc/vsftpd.conf**
这里把我的配置文件放上来



```python
# Example config file /etc/vsftpd.conf
#
# The default compiled in settings are fairly paranoid. This sample file
# loosens things up a bit, to make the ftp daemon more usable.
# Please see vsftpd.conf.5 for all compiled in defaults.
#
# READ THIS: This example file is NOT an exhaustive list of vsftpd options.
# Please read the vsftpd.conf.5 manual page to get a full idea of vsftpd's
# capabilities.
#
#
# Run standalone?  vsftpd can run either from an inetd or as a standalone
# daemon started from an initscript.
listen=YES
#
# This directive enables listening on IPv6 sockets. By default, listening
# on the IPv6 "any" address (::) will accept connections from both IPv6
# and IPv4 clients. It is not necessary to listen on *both* IPv4 and IPv6
# sockets. If you want that (perhaps because you want to listen on specific
# addresses) then you must run two copies of vsftpd with two configuration
# files.
listen_ipv6=NO
#
# Allow anonymous FTP? (Disabled by default).
#这个是设置是否允许匿名登录ftp服务器，不允许。
anonymous_enable=NO
#
# Uncomment this to allow local users to log in.
#是否允许本机用户登录
local_enable=YES
#
# Uncomment this to enable any form of FTP write command.
#允许上传文件到ftp服务器
write_enable=YES
#
# Default umask for local users is 077. You may wish to change this to 022,
# if your users expect that (022 is used by most other ftpd's)
#local_umask=022
#
# Uncomment this to allow the anonymous FTP user to upload files. This only
# has an effect if the above global write enable is activated. Also, you will
# obviously need to create a directory writable by the FTP user.
#anon_upload_enable=YES
#
# Uncomment this if you want the anonymous FTP user to be able to create
# new directories.
#anon_mkdir_write_enable=YES
#
# Activate directory messages - messages given to remote users when they
# go into a certain directory.
dirmessage_enable=YES
#
# If enabled, vsftpd will display directory listings with the time
# in  your  local  time  zone.  The default is to display GMT. The
# times returned by the MDTM FTP command are also affected by this
# option.
use_localtime=YES
#
# Activate logging of uploads/downloads.
xferlog_enable=YES
#
# Make sure PORT transfer connections originate from port 20 (ftp-data).
connect_from_port_20=YES
#
# If you want, you can arrange for uploaded anonymous files to be owned by
# a different user. Note! Using "root" for uploaded files is not
# recommended!
#chown_uploads=YES
#chown_username=whoever
#
# You may override where the log file goes if you like. The default is shown
# below.
#xferlog_file=/var/log/vsftpd.log
#
# If you want, you can have your log file in standard ftpd xferlog format.
# Note that the default log file location is /var/log/xferlog in this case.
#xferlog_std_format=YES
#
# You may change the default value for timing out an idle session.
#idle_session_timeout=600
#
# You may change the default value for timing out a data connection.
#data_connection_timeout=120
#
# It is recommended that you define on your system a unique user which the
# ftp server can use as a totally isolated and unprivileged user.
#nopriv_user=ftpsecure
#
# Enable this and the server will recognise asynchronous ABOR requests. Not
# recommended for security (the code is non-trivial). Not enabling it,
# however, may confuse older FTP clients.
#async_abor_enable=YES
#
# By default the server will pretend to allow ASCII mode but in fact ignore
# the request. Turn on the below options to have the server actually do ASCII
# mangling on files when in ASCII mode.
# Beware that on some FTP servers, ASCII support allows a denial of service
# attack (DoS) via the command "SIZE /big/file" in ASCII mode. vsftpd
# predicted this attack and has always been safe, reporting the size of the
# raw file.
# ASCII mangling is a horrible feature of the protocol.
#ascii_upload_enable=YES
#ascii_download_enable=YES
#
# You may fully customise the login banner string:
#ftpd_banner=Welcome to blah FTP service.
#
# You may specify a file of disallowed anonymous e-mail addresses. Apparently
# useful for combatting certain DoS attacks.
#deny_email_enable=YES
# (default follows)
#banned_email_file=/etc/vsftpd.banned_emails
#
# You may restrict local users to their home directories.  See the FAQ for
# the possible risks in this before using chroot_local_user or
# chroot_list_enable below.
#chroot_local_user=YES
#
# You may specify an explicit list of local users to chroot() to their home
# directory. If chroot_local_user is YES, then this list becomes a list of
# users to NOT chroot().
# (Warning! chroot'ing can be very dangerous. If using chroot, make sure that
# the user does not have write access to the top level directory within the
# chroot)
chroot_local_user=YES
chroot_list_enable=YES
# (default follows) 允许chroot_list文件中配置的用户登录此ftp服务器。
chroot_list_file=/etc/vsftpd.chroot_list
 
# You may activate the "-R" option to the builtin ls. This is disabled by
# default to avoid remote users being able to cause excessive I/O on large
# sites. However, some broken FTP clients such as "ncftp" and "mirror" assume
# the presence of the "-R" option, so there is a strong case for enabling it.
#ls_recurse_enable=YES
#
# Customization
#
# Some of vsftpd's settings don't fit the filesystem layout by
# default.
#
# This option should be the name of a directory which is empty.  Also, the
# directory should not be writable by the ftp user. This directory is used
# as a secure chroot() jail at times vsftpd does not require filesystem
# access.
secure_chroot_dir=/var/run/vsftpd/empty
#
# This string is the name of the PAM service vsftpd will use.
pam_service_name=vsftpd
#
# This option specifies the location of the RSA certificate to use for SSL
# encrypted connections.
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=NO
 
#
# Uncomment this to indicate that vsftpd use a utf8 filesystem.
#utf8_filesystem=YES
#配置ftp服务器的上传下载文件所在的目录。
local_root=/home/ftpfile
#this directory is for ftp server to save  download or upload data

```
**/etc/vsftpd.chroot_list**
记录运行登录用户
例如我的只有一行
```python
root
```
3 创建/home/ftpfile文件夹
<mark>这个个好像可有可无，因为我没在这上传文件</mark>
有可能是我哪里配置错了，不过无所谓。。。

4 在阿里云配置安全组规则，开放21端口（如Tinyhttpd实战三所示）
![](https://img-blog.csdnimg.cn/20200304170707187.png)

而后就需要判断vsftpd是否安装成功
<mark>运气好的人这时候已经成功了</mark>
首先重启vsftpd服务

```cpp
sudo service vsftpd restart
```
查看vsftpd状态

```cpp
sudo service vsftpd status
```
如果一切正常（success），则在windows上安装xftp，开始传输文件
但大概率不会正常
如果出现**exit code **等字样，这先看端口占用

```cpp
lsof -i:21
```

杀死进程 

```cpp
kill -s 9 pid
```

如果不是端口占有，就有很多种可能了
这里推荐再来一次试一试

```python
sudo apt-get remove vsftpd
sudo apt-get upgrade --fix-missing
sudo apt-get install vsftpd
```

问题大多数与vsftpd.conf，listen 或者 listen_ipv6
这些我就不懂了，我反正就是重装

### 将Tinyhttpd文件移入服务器
我的虚拟机文件不知道为什么无法移动文件到宿主机，故采用折中的方法，共享文件夹，添加路径后，.在虚拟机中使用命令，

```python
sudo vmware-config-tools.pl -d
```
在mnt/hgfs  路径下可以看到共享文件夹
这样便实现了文件的传输
![](https://img-blog.csdnimg.cn/20200304174930892.png)

### 服务器上对文件的配置
1 再次改变文件权限

```cpp

cd htdocs

sudo chmod 600 index.html  

sudo chmod 764 color.cgi check.cgi  
```
2 在阿里云上配置使用端口的安全组规则
这里用的是9734端口
![](https://img-blog.csdnimg.cn/20200304175109235.png)
3 找不到CGI模块问题
perl 缺少CGI模块，需要自己安装
如果是root用户

```cpp
perl -MCPAN -e shell
cpan>install CGI
cpan>quit

```

测试是否安装成功
```cpp
perl -e 'use CGI'
```
如果不是root用户，需要手动安装，bing搜索perl 模块安装即可
不再赘述

### 项目长期运行在服务器中

使服务端程序在后台运行，使用命令

```cpp
nohup ./httpd > test.log>&1 &
```
而exit即可
欢迎访问我的项目首页
[地址](http://106.14.2.163:9734/)

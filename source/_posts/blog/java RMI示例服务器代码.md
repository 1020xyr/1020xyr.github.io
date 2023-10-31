---
title: java RMI示例服务器代码
date: 2020-03-21 21:41:59
tags: 
categories: 分布式作业
---
<meta name="referrer" content="no-referrer" />


目录结构
![](https://img-blog.csdnimg.cn/20200321154132924.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70#pic_center#pic_center)

```java
// MyRMIClient
package Client;
import InterFace.*;
import java.rmi.Naming;
import java.util.ArrayList;
import java.util.Scanner;

public class MyRMIClient {
    public static void Print_Tip(){
        System.out.println("选择操作代号完成操作");
        System.out.println("1:add args:book b");
        System.out.println("2:queryByID args:int bookID");
        System.out.println("3:queryByName args: String name");
        System.out.println("4:delete args:int BookID");
        System.out.println("5: print args:null");
        System.out.println("6: exit");
    }
    public static void main(String args[]) {

        try {
            String name = "rmi://106.14.2.163:6789/BookSystem";
            String[] test = Naming.list( "rmi://106.14.2.163:6789/BookSystem");
            System.out.println(test[0]);
            BookSystemInfo  BookSystem=( BookSystemInfo)Naming.lookup(name);

            System.out.println("查找服务端成功");
            Scanner input=new Scanner(System.in);
            int number = 6;
            Print_Tip();
            while ((number = input.nextInt())!=6){
                switch (number){
                    case 1:{
                        System.out.println("输入ID和名字");
                        int bookID = input.nextInt();
                        String bookName = input.next();
                        Book newbook = new Book(bookName,bookID);
                        boolean res = BookSystem.add(newbook);
                        if(res==true){
                            System.out.println("添加成功");
                        }
                        else{
                            System.out.println("添加失败");
                        }
                    }
                    break;
                    case 2:{
                        System.out.println("输入ID");
                        int bookID = input.nextInt();
                        Book res = BookSystem.queryByID(bookID);
                        if(res==null){
                            System.out.println("无该ID号的书籍");
                        }
                        else{
                            System.out.println("书籍信息如下");
                            res.Print_content();
                        }
                    }
                    break;
                    case 3:{
                        System.out.println("输入name");
                        String bookName = input.next();
                        ArrayList<Book> res = BookSystem.queryByName(bookName);
                        if(res==null){
                            System.out.println("同名书籍数目为零");
                        }
                        else {
                            System.out.println("查询结果如下");
                            for (Book b : res) {
                                b.Print_content();
                            }
                        }
                    }
                    break;
                    case 4:{
                        System.out.println("输入ID");
                        int bookID = input.nextInt();
                        boolean res = BookSystem.delete(bookID);
                        if(res==true){
                            System.out.println("删除成功");
                        }
                        else{
                            System.out.println("删除失败");
                        }
                    }
                    break;
                    case 5:{
                        System.out.println("调用该方法只是在服务端打印书籍列表，客户端不显示");
                        BookSystem.print();
                    }
                    break;
                }

            }

        } catch (Exception e) {
            System.err.println("??? exception:");
            e.printStackTrace();
        }
    }
}
```

```java
//  Book
package InterFace;

import java.io.Serializable;

public class Book implements Serializable {
    private static final long serialVersionUID = 6529685098267757690L;
    private String name;
    private int BookID;
    public Book(String n,int b){
        name = n;
        BookID = b;
    }
    public boolean EqualName(String otherName){
        return name.equals(otherName);
    }
    public boolean EqualID(int otherID){
        return (BookID==otherID);
    }
    public void Print_content(){
        System.out.println(BookID+": "+name);
    }
}


```

```java
// BookSystem
package InterFace;

import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.io.Serializable;
import java.util.ArrayList;


public class  BookSystem  implements BookSystemInfo,Serializable {
    private static final long serialVersionUID = 6529685098267757665L;
    private ArrayList<Book> list;
    public BookSystem() throws RemoteException{
        list = new ArrayList<>();
    }
    public boolean add(Book b)  throws RemoteException{
        try{
           list.add(b);
        }catch (Exception e){
            return false;
        }
        return true;
    }

    public Book  queryByID(int BookID) throws RemoteException{
        for(Book b :list){
            if(b.EqualID(BookID)){
                return b;
            }
        }
        return null;
    }
    public ArrayList<Book> queryByName(String name) throws RemoteException{
        ArrayList<Book> res = new ArrayList<Book>();
        for(Book b :list){
            if(b.EqualName(name)){
                res.add(b);
            }
        }
        return res;
    }
    public boolean delete(int BookID) throws RemoteException{
        for(Book b :list){
            if(b.EqualID(BookID)){
                list.remove(b);
                return true;
            }
        }
        return false;
    }
    public void print(){
        System.out.println("书籍列表如下");
        for(Book b :list){
            b.Print_content();
        }
    }
}

```

```java
// BookSystemInfo
package InterFace;
import java.rmi.Remote;
import java.rmi.RemoteException;
import java.io.Serializable;
import java.util.ArrayList;

public interface BookSystemInfo extends Remote,Serializable{
    boolean add(Book b) throws RemoteException;
    Book queryByID(int bookID) throws RemoteException;
    ArrayList<Book> queryByName(String name) throws RemoteException;
    boolean delete(int BookID) throws RemoteException;
    void print() throws RemoteException;
}
```

```java
// MyRMIServer
package Server;
import java.rmi.registry.LocateRegistry;
import java.rmi.Naming;
import InterFace.*;
import java.rmi.server.UnicastRemoteObject;

public class MyRMIServer {


    public static void main(String[] args) throws Exception {

        try {
            String serverIP = "106.14.2.163";
            System.setProperty("java.rmi.server.hostname", serverIP);
            LocateRegistry.createRegistry(6789);
            String name ="rmi://127.0.0.1:6789/BookSystem";
            BookSystemInfo engine = new BookSystem();
            BookSystemInfo skeleton = ( BookSystemInfo) UnicastRemoteObject.exportObject(engine, 5678);
            System.out.println("Registering BookSystem Object");
            Naming.bind(name,skeleton);
        } catch (Exception e) {
            System.err.println("Exception:" + e);
            e.printStackTrace();
        }
    }
}

```


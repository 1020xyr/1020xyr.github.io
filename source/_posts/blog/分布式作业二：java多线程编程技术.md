---
title: 分布式作业二：java多线程编程技术
date: 2020-03-14 22:37:15
tags: 
categories: 分布式作业
---
<meta name="referrer" content="no-referrer" />


##  题目
### 1. 功能概述
实现一个支持并发服务的网络运算服务器程序。该服务器能够同时接收来自于多个客户端的运算请求，然后根据运算类型和请求参数完成实际的运算，最后把运算结果返
回给客户端。
### 2. 具体要求
（1）至少支持加、减、乘、除四种基本运算。
（2）服务器端能够分别记录已经成功处理的不同运算类型请求的个数。
（2）客户端与服务器端之间基于 UDP 协议进行通信。
（3）应用层协议自行设计。

## 源码

```java
// 服务端程序
import java.net.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;


class Counter {                                             //运算符数目类
    private int counter;
    public Counter() {
        counter=0;
    }
    public synchronized void increase() {
        counter++;
    }

    public int getCounter() {
        return counter;
    }
}
class ThreadCounter {                                       //线程数目类
    private int counter;
    public ThreadCounter() {
        counter=0;
    }
    public synchronized void increase() {
        counter++;
    }
    public synchronized void decrease() {
        counter--;
    }
    public synchronized boolean compare(int n){             // 比较线程数目
        return counter < n;
    }
    public void print(){
        System.out.println("当前进程数目："+ counter);
    }

}

class PacketType{                   // 数据包类型
    private String op;              // 运算符
    private int num1;
    private int num2;
    public PacketType(String a,int b, int c) {
        op = a;
        num1 = b;
        num2 = c;
    }
    public double computer(){
        try {
            if (op.equals("+")) {
                UDPServer.operator[0].increase();
                return num1 + num2;
            }
            if (op.equals("-")) {
                UDPServer.operator[1].increase();
                return num1 - num2;
            }
            if (op.equals("*")) {
                UDPServer.operator[2].increase();
                return num1 * num2;
            }
            if (op.equals("/")) {
                UDPServer.operator[3].increase();
                return (double) num1 / num2;
            }
        }catch (Exception e){
            e.printStackTrace();
            return -1;
        }
        System.out.println("Error Input");
        return -1;
    }
}

class WorkThread implements Runnable {          //工作线程
    public static byte[] double2Bytes(double d) {          // 将浮点数类型转换为字节数组
        long value = Double.doubleToRawLongBits(d);
        byte[] byteRet = new byte[8];
        for (int i = 0; i < 8; i++) {
            byteRet[i] = (byte) ((value >> 8 * i) & 0xff);
        }
        return byteRet;
    }
    public void run() {
        try {
            while (true) {
                DatagramPacket m = UDPServer.InputQueue.take();
                String t = new String(m.getData()).substring(0,m.getLength());
                String[] s = t.split("t");
                String op = s[0];
                int num1 = Integer.parseInt(s[1]);
                int num2 = Integer.parseInt(s[2]);
                PacketType n = new PacketType(op, num1, num2);
                double ans = n.computer();
                byte[] ans_byte = double2Bytes(ans);
                System.out.println("此次运算结果: " + ans);
                DatagramPacket res = new DatagramPacket(ans_byte, ans_byte.length,m.getAddress(),m.getPort());
                UDPServer.OutputQueue.put(res);
            }
        } catch (Exception e) {
           e.printStackTrace();
        }finally {
            UDPServer.ThreadNumber.decrease();
        }

    }
}
class SendThread implements Runnable {                      //发送线程

    public void run() {
        while(true) {
            try {
                DatagramPacket m = UDPServer.OutputQueue.take();
                UDPServer.bSocket.send(m);
                // 打印当前接受的运算符数目

                int [] num = new int[4];
                for (int i = 0; i < 4; i++) {
                    num[i] = UDPServer.operator[i].getCounter();
                }
                UDPServer.ThreadNumber.print();
                System.out.println("运算符数目如下");
                System.out.println("+:"+num[0]);
                System.out.println("-:"+num[1]);
                System.out.println("*:"+num[2]);
                System.out.println("/:"+num[3]);
            } catch (Exception e) {
               e.printStackTrace();
            }
        }
    }
}

public class UDPServer{
    // 全局变量的声明以及定义
    public static Counter[] operator = new Counter[4];      // 运算符计数器
    public static ThreadCounter ThreadNumber = new ThreadCounter();

    public static int MaxThreadNumber = 2;                 // 定义最大线程数

    @SuppressWarnings("unchecked")
    public static BlockingQueue<DatagramPacket> InputQueue = new LinkedBlockingQueue();
    @SuppressWarnings("unchecked")
    public static BlockingQueue<DatagramPacket> OutputQueue = new LinkedBlockingQueue();

    public  static DatagramSocket aSocket = null;

    public  static DatagramSocket bSocket = null;
    public static void main(String args[]){
        for(int i=0;i<4;i++){
            operator[i] = new Counter();
        }

        try{
            // DatagramPacket 公用一个buffer 可能出现意想不到的bug(例如之后读出数据时getData() 方法的坑)
            byte[] buffer = new byte[1000];
            /*
                aSocket:主线程接受报文，监听6789端口
                bSocket: 发送线程发送报文，使用随机端口
             */
            aSocket = new DatagramSocket(6789);
            bSocket = new DatagramSocket();
            SendThread sendthread = new SendThread();
            Thread sendt = new Thread(sendthread);                         // 发送线程开始工作
            sendt.start();
            while(true){
                //接受请求
                DatagramPacket request = new DatagramPacket(buffer, buffer.length);
                aSocket.receive(request);
                // 请求入队
               InputQueue.put(request);

                //创建工作线程 执行运算任务
                if (ThreadNumber.compare(MaxThreadNumber)) {
                    WorkThread workthread = new WorkThread();
                    Thread workt = new Thread(workthread);
                    workt.start();
                    ThreadNumber.increase();
                }
            }
        } catch (Exception e){
            e.printStackTrace();
        }  finally {
            if (aSocket != null) aSocket.close();


        }
    }
}
```

```java
// 客户端程序
import java.net.*;
import java.io.*;

public class UDPClient{

    public static double bytes2Double(byte[] arr) {    // 字节数组转换为double类型
        long value = 0;
        for (int i = 0; i < 8; i++) {
            value |= ((long) (arr[i] & 0xff)) << (8 * i);
        }
        return Double.longBitsToDouble(value);
    }
    public static void main(String args[]){
        DatagramSocket aSocket = null;
        String userInput = null;
        try {
            BufferedReader stdIn = new BufferedReader(new InputStreamReader(System.in));
            aSocket = new DatagramSocket();
            InetAddress aHost = InetAddress.getByName("127.0.0.1");
            int serverPort = 6789;
            while(!(userInput=stdIn.readLine()).equals("quit")) {           // 输入quit时退出客户端程序
                byte[] m = userInput.getBytes();
                // 创建发送报文
                DatagramPacket request = new DatagramPacket(m, m.length, aHost, serverPort);
                aSocket.send(request);
                byte[] buffer = new byte[1000];
                // 准备接收报文
                DatagramPacket reply = new DatagramPacket(buffer, buffer.length);
                aSocket.receive(reply);
                System.out.println("Reply: " + bytes2Double(reply.getData()));
            }
        } catch (SocketException e){
            System.out.println("Socket: " + e.getMessage());
        } catch (IOException e){
            System.out.println("IO: " + e.getMessage());
        } finally {
            if(aSocket != null) aSocket.close();
        }
    }
}
```


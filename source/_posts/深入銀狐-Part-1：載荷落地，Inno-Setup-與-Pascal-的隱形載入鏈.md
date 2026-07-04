---
title: 深入銀狐 Part 1：載荷落地，Inno Setup 與 Pascal 的隱形載入鏈
date: 2026-02-12 02:23:12
tags:
    - SilverFox
    - APT
    - 惡意程式分析
categories: [Medium]
---

本章將聚焦在受害者自 Silver Fox APT 釣魚站點下載並執行安裝檔後，惡意程式如何在端點完成第一階段的解包落地、環境偵測與防護繞過，並把下一階段的載入器悄悄部署到固定位置，讓看似正常的安裝流程，轉變為可持續擴張的多階段攻擊起點。

<!-- more -->

本篇文章已投稿至 Medium，請由以下連結觀看全文

全文連結:[Medium](https://medium.com/ois/%E6%B7%B1%E5%85%A5%E9%8A%80%E7%8B%90-part-1-%E8%BC%89%E8%8D%B7%E8%90%BD%E5%9C%B0-inno-setup-%E8%88%87-pascal-%E7%9A%84%E9%9A%B1%E5%BD%A2%E8%BC%89%E5%85%A5%E9%8F%88-0d68fa59f8a6?utm_source=dinlon5566.com)

---
這邊其實在樣本出來之後不久就分析完了，作為之後研討會的材料一直放著。不過看到其他資安產商已經公開這個家族框架的分析，所以就決定把這個分析寫成一篇較為教學性質的文章來分享，順便把一些細節補充完整。

總之，希望您看的開心 OwO/
---
title: Silver Fox APT：遞送鏈的集中化特徵
date: 2026-01-14 20:09:01
tags:
    - 威脅情資
    - SilverFox
    - APT
categories: [Medium]
---

在針對 Silver Fox APT 相關資產進行情資收集時，我們觀測到一系列具有一致行為模式的前端下載誘導框架。此類站點多以熱門關鍵字進行 SEO 佔位，吸引使用者透過搜尋引擎進入偽裝下載頁。當使用者點擊下載後，站點會載入外部 JavaScript 資源並觸發導流流程，過程中向指定 API 站點請求動態短連結並投放最終載荷。
#
#
#
#
#
<!-- more -->
本篇文章已投稿至 Medium，請由以下連結觀看全文

全文連結: [Medium](https://medium.com/ois/silver-fox-apt-%E9%81%9E%E9%80%81%E9%8F%88%E7%9A%84%E4%B8%AD%E6%A8%9E%E5%8C%96%E7%89%B9%E5%BE%B5%E7%A0%94%E7%A9%B6-8a713ad90fd6?utm_source=dinlon5566.com)

---

其實在寫這一篇文章時挺開心的，因為這陣子做 Silver Fox 的情資與惡意程式分析時，常常拆到一半發現這個樣本的家族已經被其他資安團隊寫過了，甚至有時候才差了幾天 QAQ

所以發現這次的研究重點與相關情資還沒有在其他地方出現，就趕快把這一篇文章寫出來，希望您看的開心 OwO/

---
# IOCs
```
| IOC                                      | TYPE   | NOTE         |
| ---------------------------------------- | ------ | ------------ |
| 154d5a259cfe9b0908d0cff3cd02b102ee3a14d8 | SHA256 | 檔案 nice.js |
| telegram[.]organic                       | Domain | 資產         |
| js.telegram[.]organic                    | Domain | 資產         |
| 6x[.]org                                 | Domain | 資產         |
| api.6x[.]org                             | Domain | 資產         |
| hkdownload[.]com                         | Domain | 關聯資產     |
| xiazai.heimao[.]io                       | Domain | 關聯資產     |
| linebbn[.]com                            | Domain | TOP5釣魚頁面 |
| hk-line[.]com                            | Domain | TOP5釣魚頁面 |
| linebzn[.]com                            | Domain | TOP5釣魚頁面 |
| linebcn[.]com                            | Domain | TOP5釣魚頁面 |
| wps1[.]com                               | Domain | TOP5釣魚頁面 |
```
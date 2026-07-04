---
title: 深入銀狐 Part 3：從 DLL 側載到 ValleyRAT，完整拆解記憶體載入與反鑑識鏈手法
date: 2026-05-14 16:06:46
tags:
    - SilverFox
    - APT
    - 惡意程式分析
categories: [Medium]
---

本篇聚焦在銀狐完成環境鋪設後，真正的 ValleyRAT 如何被載入、上線並長期存活。透過 DLL 側載，由這支載入器同時拉起三條執行緒：包含 payload 解密與執行、rootkit註冊、Defender 排除路徑等手法，使得單純刪除落地檔案或封鎖 C2 都不足以讓端點恢復乾淨。


<!-- more -->

本篇文章已投稿至 Medium，請由以下連結觀看全文

全文連結:[Medium](https://medium.com/ois/%E6%B7%B1%E5%85%A5%E9%8A%80%E7%8B%90-part-3-%E5%BE%9E-dll-%E5%81%B4%E8%BC%89%E5%88%B0-valleyrat-%E5%AE%8C%E6%95%B4%E6%8B%86%E8%A7%A3%E8%A8%98%E6%86%B6%E9%AB%94%E8%BC%89%E5%85%A5%E8%88%87%E5%8F%8D%E9%91%91%E8%AD%98%E9%8F%88%E6%89%8B%E6%B3%95-29115e3a5a52?utm_source=dinlon5566.com)

---

其實這一個樣本的分析過程還藏了不少有趣的手法，不過篇幅原因就沒有再加進去了。

總之，希望您看的開心 OwO/

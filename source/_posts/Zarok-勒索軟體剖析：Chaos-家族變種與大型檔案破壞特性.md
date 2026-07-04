---
title: Zarok 勒索軟體剖析：Chaos 家族變種與大型檔案破壞特性
date: 2025-12-08 20:18:47
tags:
    - 惡意程式分析
categories: [Medium]
---

近期我們在自動化分析平台上觀察到一個標記為「Zarok」的新勒索軟體家族。該樣本屬於建立在 Chaos builder 與 BlackSnake Ransomware 之上的變種，為典型的低門檻勒索工具再包裝案例。該病毒除傳統的加密勒索功能外，還具有大型檔案破壞、還原能力破壞與針對加密貨幣位置的剪貼簿劫持功能，造成進一步資產損失。
<!-- more -->

本篇文章已投稿至 Medium，請由以下連結觀看全文

全文連結: [Medium](https://medium.com/ois/zarok-%E5%8B%92%E7%B4%A2%E8%BB%9F%E9%AB%94%E5%89%96%E6%9E%90-chaos-%E5%AE%B6%E6%97%8F%E8%AE%8A%E7%A8%AE%E8%88%87%E5%A4%A7%E5%9E%8B%E6%AA%94%E6%A1%88%E7%A0%B4%E5%A3%9E%E7%89%B9%E6%80%A7-e303dcbc2e97?utm_source=dinlon5566.com)

---

這一篇研究其實算是一個新的嘗試，透過分析那些尚未受到標記或是全新的家族，以探索最新的攻擊手法或是各種罕見的行為特徵。總之，希望您看的開心 OwO/
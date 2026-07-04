---
title: IDA MCP安裝與使用教學
date: 2025-09-15 23:10:21
tags:
  - 惡意程式分析
  - IDA
excerpt: 在 VS Code 上使用 Roo Code 與 IDA Pro 使用 IDA MCP 進行惡意程式分析。
categories: []
---
# IDA MCP安裝與使用教學

嗨嗨，好久不見了 OwO/<br>

這次來介紹IDA MCP安裝與使用技巧 ~

[https://github.com/mrexodia/ida-pro-mcp](https://github.com/mrexodia/ida-pro-mcp)

# 前言

自研究所畢業後不到一周，我就開始進行惡意程式分析的工作。我發現身為新手在使用 IDA 時會遇到很多困難，像是超多的未命名函數與各種無法理解的邏輯都會讓我卡上一段時間。到 HITCON 後發現似乎人都開始使用了 IDA MCP 這個酷東西，進而對這個技術有了一點興趣，直到開始使用後發現真香，所以來寫個筆記來記錄我的安裝過程與使用上的方法。

# 安裝 IDA MCP

在這一章節，將會講述如何在 VS Code 上使用 Roo Code 與 IDA Pro 使用 IDA MCP。並且會提到一些常見的問題。這些問題可能隨著時間被解決或是出更多問題，不過現在 (2025/09/15) 我已經把我安裝時踩到的坑解決了，希望之後不會遇到更多坑。

很可惜，IDA Free 是不能玩 MCP 插件的，且 IDA Pro 版本必須大於 8.3。如果發現你的版本無法使用，請升級 IDA 版本。

由於我在這次使用 Roo Code 進行 LLM 工具交互，所以先在VS Code上安裝這個插件。

![](image.png)

## IDA Python版本更改

若你的電腦有安裝不符合的python版本 (<3.11 )，請參考這邊：

![](image1.png)

首先，到 [https://www.python.org/downloads/](https://www.python.org/downloads/)  安裝新版，我這邊安裝的是 python-3.13.7-amd64.exe 。

安裝完後裝置應會有兩個以上的 Python 版本，請到 IDA 的安裝位置 (C:\Program Files\IDA Professional X.X) 並執行 idapyswitch.exe，選擇你的最新版本即可。

![](image2.png)

接下來的python環境就會變成 3.13.7 了

---

然後進行安裝

```bash
py -3.13 -m pip uninstall ida-pro-mcp
py -3.13 -m pip install https://github.com/mrexodia/ida-pro-mcp/archive/refs/heads/main.zip
py -3.13 -m ida_pro_mcp --install
```

## 檢測到 IDA Free ?

若你的電腦過去曾安裝過  IDA Free，這將會造成安裝時顯示以下提示且無法繼續安裝：

“IDA Free does not support plugins and cannot be used. Purchase and install IDA Pro instead.”

![](image3.png)

在上個月時還不會出現這樣的問題，所以我去看了一下儲存庫的更新資訊，還被我找到了：

[https://github.com/mrexodia/ida-pro-mcp/commit/19499f066b234a9b9767661de1916fdb0990931d](https://github.com/mrexodia/ida-pro-mcp/commit/19499f066b234a9b9767661de1916fdb0990931d)

可以看到這次更新導致 `%APPDATA%\Hex-Rays\IDA Pro` 若有檔案名稱符合 `idafree_*.hexlic` 將會立即停止安裝。所以只要把這個檔案改個名稱就好了，我這邊在檔案名稱前加了一個減號即可通過安裝。

![](image4.png)

---

安裝完成應該可以看到 IDA plugin 與 Roo Code 安裝完成。

![](image5.png)

---

# 開始使用 MCP

接下來在 Roo Code 進行 API 設定，首先你需要一個可以支援MCP功能的 LLM API 服務。我個人喜歡使用 openai 的 **GPT-5 mini** 模型，價格與品質算是合理。配合資料分享政策，每天都有近五美元的免費使用，通常可以完成多個程式的逆向分析。

在 Roo Code右上角的齒輪進行 API 設定，輸入 API Key 後選擇提供商與模型，最後要記得儲存。

![](image6.png)

在 IDA 中開啟你要分析的項目，到程式碼的頁面上開啟 Edit > Plugins > MCP 即可開啟 IDA MCP Server。

![](image7.png)

接下來可以根據你分析的過程來編寫 Prompt，個人以官方的建議 Prompt Engineering 進行改編：

```bash
你已經使用 MCP 工具連接至IDA Pro，你的任務是對一個惡意程式樣本進行靜態分析。你可以使用 MCP 工具取得資訊與修改 IDB 狀態。請遵循以下原則與流程，並最終產出一份 report.md。
【總原則】
- 絕對不要自行進行數位進位制或位元運算轉換，務必使用 MCP 的 convert_number，必要時再用可決定性的數學/位元工具。
- 以「可驗證證據」為準則：每一個關鍵結論，都要附上函式名稱、起始位址、關聯字串或常數，以及你在反編譯/反組譯中觀察到的關鍵條件或基本塊。
- 除非我明確要求，請不要使用任一 dbg_* 類的除錯工具；本任務預設「靜態分析優先」。
- 以英文進行思考與命名，當與使用者交互、報告註解時可使用繁體中文。
- 任何對 IDB 的變更（命名、型別、註解）都要有理據，並在報告中可追溯。
- 不要猜測與暴力破解、Fuzz。所有推論應建立在可觀察輸出、xref、型別與簡單可重現的 Python 腳本之上。
【分析目標】
你的目標是分析 NVIDIA.exe 在被呼叫後進入函數sub_140006BF0後的行為，函數中包含多個未命名函數，請分析這些函數的流程並進行命名與編寫註解。並詳細研究是否出現明顯特徵與需要分析的地方。
```

可以添加其他的功能以增加體驗，這是我預設開啟的幾個項目。

![](image8.png)

部分函數需有手動確認，這時候需要先確認行為才能進行下一步。

![](image9.png)

當詢問下一步動作時，可以參考提示直接選擇下一步動作；或是可以根據分析時的發現寫入自訂命令。

![](image10.png)

最後經過多次分析，你會得到一份有命名函數的 ida 分析結果與 report.md，請記得將這些資訊儲存起來以方便繼續分析。

![](image11.png)

這次的分享就到這邊，下次來寫關於惡意程式開發的一些小記好了。
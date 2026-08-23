# 專注房間（網頁試用版）

這是「專注計時＋任務日曆＋房間布置」App 的網頁版本。目前可以直接在電腦瀏覽器中試用，不需要先包裝成 Android App。

> 正式網頁專案位於 `E:\App_design\focus-room-app`。工作區外層的 `focus-room-core-wireframes.html` 是早期介面原型，不是目前的完整版本。

## 啟動 Server

### 1. 開啟終端機

在 VS Code 上方選單按：

`Terminal（終端機）` → `New Terminal（新增終端機）`

### 2. 進入專案資料夾

在 PowerShell 輸入：

```powershell
cd E:\App_design\focus-room-app
```

### 3. 第一次使用時安裝套件

```powershell
npm install
```

已經安裝過套件的話，可以跳過這一步。

### 4. 啟動開發 Server

```powershell
npm run dev
```

## 家具圖片校準台

啟動開發伺服器後，開啟：

<http://localhost:3000/developer>

此頁面可以即時調整家具圖片的桌面／手機寬度、落地錨點、占地格數、格線位置與左右翻轉。校準結果可以儲存在瀏覽器，並複製成 CSS 或 JSON。

看到終端機顯示本機網址後，用瀏覽器開啟：

<http://localhost:3000/>

終端機需要保持開啟。修改程式後，網頁通常會自動更新；沒有更新時可重新整理瀏覽器。

## 停止 Server

回到正在執行 Server 的終端機，按：

```text
Ctrl + C
```

如果終端機詢問是否終止工作，輸入 `Y` 後按 Enter。

## 如果出現「找不到 npm」

專案需要 Node.js 22.13.0 以上版本。若電腦已安裝 Node.js，請關閉並重新開啟 VS Code，再試一次 `npm run dev`。

如果你是使用 Codex 內附的 Node.js，可以在 PowerShell 使用：

```powershell
$npm = Get-ChildItem "$env:LOCALAPPDATA\OpenAI\Codex\runtimes" -Filter npm.cmd -Recurse |
  Select-Object -First 1

if (-not $npm) {
  throw "找不到 npm，請先安裝 Node.js 22.13.0 以上版本。"
}

& $npm.FullName install
& $npm.FullName run dev
```

## 如果 3000 Port 已被占用

先查看是哪個程式正在使用 Port 3000：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

確認該程序是先前啟動、已不需要的專案 Server 後，再停止它：

```powershell
$connection = Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id $connection.OwningProcess
```

接著重新執行：

```powershell
npm run dev
```

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動本機開發 Server |
| `npm run build` | 檢查正式版能否成功建置 |
| `npm test` | 執行專案測試 |

## 資料儲存說明

目前任務、家具與遊戲進度主要儲存在瀏覽器的本機資料中。同一個瀏覽器再次開啟時通常會保留，但清除網站資料、使用無痕模式或更換瀏覽器後，資料可能不會保留。

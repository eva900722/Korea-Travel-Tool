# 韓旅隨手查

需要 Node.js 18 以上。在 PowerShell 設定 Google Cloud API 金鑰並啟動：

```powershell
$env:GOOGLE_CLOUD_API_KEY = '你的金鑰'
node server.js
```

開啟 `http://localhost:3000`。照片翻譯需在 Google Cloud 啟用 **Cloud Vision API** 與 **Cloud Translation API**，並使用支援這兩項 API 的金鑰；只用靜態檔案伺服器開啟時，照片翻譯 API 無法運作。沒有金鑰時，句子新增、編輯、刪除與釘選仍可使用。句子資料只存在目前瀏覽器；清除網站資料會一併清除自訂內容。

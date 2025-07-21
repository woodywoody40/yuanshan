# 🏛️ 教會電子留名卡系統

一個現代化、響應式的教會訪客登記系統，具備即時統計和完整的管理功能。

## ✨ 功能特色

### 🎯 **核心功能**
- **訪客留名表單** - 簡潔優雅的資料收集介面
- **即時統計顯示** - 今日/本週/總計訪客數據
- **管理員後台** - 完整的 CRUD 操作介面
- **搜尋功能** - 快速查找訪客記錄
- **響應式設計** - 完美支援手機、平板、桌面

### 🎨 **設計亮點**
- **莫蘭迪色系** - 優雅低調的視覺風格
- **中文書法字體** - ChenYuluoyan 增添文化氣息
- **流暢動畫** - 提升使用者體驗
- **無障礙設計** - 符合現代網頁標準

## 🚀 快速開始

### 1. 部署到 Cloudflare Pages

```bash
# 1. Fork 或下載此專案
git clone <your-repo-url>
cd church-visitor-sign-in

# 2. 推送到您的 Git 儲存庫
git remote set-url origin <your-git-repo>
git push origin main
```

### 2. 設定 Cloudflare Pages

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 前往 **Pages** > **Create a project**
3. 連接您的 Git 儲存庫
4. 部署設定：
   - **Build command**: 留空
   - **Build output directory**: `.`

### 3. 配置環境變數

在 Cloudflare Pages > Settings > Environment variables 中添加：

```
ADMIN_PASSWORD = 您的管理員密碼
SHEETDB_URL = https://sheetdb.io/api/v1/YOUR_SHEET_ID
```

### 4. 設定 Google Sheets + SheetDB

1. 創建 Google Sheets 並設為公開可讀取
2. 在 [SheetDB.io](https://sheetdb.io) 創建 API
3. 確保 Sheet 第一行包含以下欄位：
   ```
   id | name | phone | email | howDidYouHear | howDidYouHearOther | isFirstVisit | wantsContact | prayerRequest
   ```

## 📱 使用方式

### 👥 **訪客使用**
1. 訪問主頁面填寫留名表單
2. 提交後查看成功頁面和統計資訊

### 👨‍💼 **管理員使用**
1. 前往 `/admin.html` 登入
2. 在 Dashboard 中查看、編輯、刪除訪客記錄
3. 即時查看統計數據

## 🛠️ 技術架構

### **前端技術**
- **HTML5 + CSS3** - 語義化標記和現代樣式
- **Vanilla JavaScript** - 輕量級無框架實現
- **Tailwind CSS** - 實用優先的 CSS 框架

### **後端服務**
- **Cloudflare Pages** - 靜態網站託管
- **Cloudflare Functions** - 無伺服器 API
- **SheetDB** - Google Sheets 作為資料庫

### **API 端點**
```
GET  /api/visitors      - 獲取訪客列表 (需認證)
POST /api/visitors      - 新增訪客記錄
PUT  /api/visitors      - 更新訪客記錄 (需認證)
DELETE /api/visitors    - 刪除訪客記錄 (需認證)
GET  /api/stats         - 獲取統計數據
POST /api/login         - 管理員登入
GET  /api/logout        - 管理員登出
```

## 🔒 安全性

- **Cookie 基礎認證** - 安全的 session 管理
- **HTTPS 強制** - Cloudflare 自動提供 SSL
- **環境變數保護** - 敏感資訊安全儲存
- **CORS 政策** - 防止跨域攻擊

## 📊 資料管理

### **資料流程**
1. 訪客填寫表單 → Cloudflare Functions → SheetDB → Google Sheets
2. 管理員查看 → 身份驗證 → 從 SheetDB 讀取 → 顯示在 Dashboard

### **資料備份**
- 所有資料儲存在您的 Google Sheets 中
- 可隨時匯出為 Excel 或 CSV 格式
- 支援 Google Sheets 的版本歷史功能

## 🎯 自訂設定

### **修改樣式**
- 編輯 CSS 變數來調整色彩主題
- 替換字體檔案來變更字型
- 調整 Tailwind 類別來修改佈局

### **新增欄位**
1. 在 Google Sheets 中新增欄位
2. 修改 `index.html` 表單
3. 更新 `functions/api/visitors.js` API
4. 調整 Dashboard 顯示邏輯

## 📞 支援與維護

### **常見問題**
- **無法登入**: 檢查 `ADMIN_PASSWORD` 環境變數
- **資料不顯示**: 確認 `SHEETDB_URL` 設定正確
- **表單提交失敗**: 檢查 Google Sheets 權限設定

### **效能優化**
- 啟用 Cloudflare CDN 快取
- 壓縮圖片和字體檔案
- 使用 Service Worker 離線支援

## 📄 授權條款

MIT License - 歡迎自由使用和修改

## 🙏 致謝

感謝所有為開源社群貢獻的開發者，讓這個專案得以實現。

---

**🏛️ 願這個系統能為您的教會帶來便利，讓每一位訪客都感受到溫暖的歡迎！**
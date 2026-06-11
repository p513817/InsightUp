# InsightUp 10 頁投影片細節與草稿

這份文件是後續製作 PowerPoint、Google Slides 或 Figma slides 的逐頁規格。此版已固定為 10 頁，不規劃桌面 UI 畫面；產品展示以手機介面截圖、簡化流程圖與 ASUS 官方公開素材為主。

## 簡報定位

- 簡報名稱：`InsightUp: ASUS 健康追蹤與員工福利應用提案`
- 建議頁數：10 頁。
- 建議簡報時間：8-12 分鐘。
- 主要聽眾：
  - ASUS 內部主管、HR/ESG、員工福利或職安健康單位。
  - VivoWatch / Healthcare AI / AI PC / ExpertBook 相關產品單位。
  - 可能參與 pilot 的健身房營運、教練、運動社團窗口。
- 核心訊息：
  - ASUS 已有健康硬體、AI Healthcare 敘事與員工健康設施。
  - InsightUp 補上的是「InBody 週期性體組成追蹤」與「員工健康活動可量化」這一層。
  - 最務實的第一步是 ASUS 內部健身房 pilot，再評估 VivoWatch、AI PC 與企業 wellness 產品協同。
- 風險語氣：
  - 不宣稱醫療診斷。
  - 員工方案強調自願 opt-in、個資保護、匿名彙總、HR 不看個人健康資料。
  - VivoWatch / ASUS AI Healthcare 整合先寫成產品協同方向或概念驗證，不寫成已完成整合。

## 視覺方向

- 比例：16:9。
- 風格：冷靜、科技、健康管理、可信任。
- 主色：深海軍藍、冷白、mint 綠。
- 字體：PPT 可用 `Aptos` + `Noto Sans TC`；Figma 可用 `Inter` + `Noto Sans TC`。
- 圖像原則：
  - InsightUp 產品畫面以手機截圖為主。
  - ASUS 官方產品或 ESG 素材只使用可驗證來源。
  - 不自行仿製 ASUS logo、VivoWatch 外觀、官方產品 UI 或任何品牌圖示。
  - 沒有授權圖時，用文字引用、來源註記與簡化 diagram 取代。

## 必備手機截圖與素材

### InsightUp 手機截圖

建議用 390x844 或等比例手機 viewport。所有資料需使用 demo 內容，不顯示真實姓名、email、健康資料或公司內部資訊。

| 編號 | 建議檔名 | 來源畫面 | 使用頁 |
| --- | --- | --- | --- |
| M01 | `mobile-home.png` | `/` 登入首頁 | 1 |
| M02 | `mobile-dashboard-overall.png` | `/dashboard?trend=overall` | 5 |
| M03 | `mobile-dashboard-segmental.png` | `/dashboard?trend=segmental` | 5 |
| M04 | `mobile-record-form-scan.png` | 新增紀錄表單，AI Scan 區塊打開 | 4 |
| M05 | `mobile-records-manager.png` | `/records`，顯示 included/excluded | 3 或 4 |
| M06 | `mobile-summary.png` | `/summary` 或 AI 摘要 modal | 5 |
| M07 | `mobile-personal-goal.png` | `/personal-goal` | 6 |
| M08 | `mobile-friends.png` | `/friends` | 6 |
| M09 | `mobile-competitions.png` | `/competitions` | 6 或 8 |
| M10 | `mobile-competition-detail.png` | `/competitions/{competitionId}` | 6 或 8 |
| M11 | `mobile-share-builder.png` | `/share` | 6 |

### ASUS 外部引用素材

| 編號 | 建議檔名 | 來源 | 使用頁 |
| --- | --- | --- | --- |
| A01 | `asus-healthcare-ai-2026.png` | ASUS Computex 2026 Healthcare AI 新聞稿 | 7 |
| A02 | `asus-vivowatch-6.png` | ASUS VivoWatch 6 產品頁 | 7 |
| A03 | `asus-esg-fitness-facility.png` | ASUS ESG 職安健康頁 | 8 |
| A04 | `asus-corporate-health-award.png` | ASUS Corporate Health Responsibility 新聞稿 | 8 |
| A05 | `asus-ai-pc-computex.png` | ASUS Computex 2026 或 AI PC 官方頁 | 9 |

### 仍需確認的資料

- ASUS 內部是否已有 InBody 設備或合作量測點。
- 公司健身房可容納人數、使用率、課程數、教練資源。
- HR/ESG 是否已有健康促進 KPI。
- 員工健康資料治理要求，例如保存期限、匿名化方式、誰可看彙總。
- VivoWatch 是否可在合法授權下提供活動、睡眠、壓力等資料給未來概念驗證。

## 10 頁投影片主線

## 01. 封面：InsightUp 是 ASUS 健康資料的行動洞察層

### 頁面目的

一開始就把 InsightUp 定位為 ASUS 可內部使用、可產品協同、可外部商品化的健康科技提案。

### 主標題

`InsightUp`

### 副標

`把 InBody 從單次報表，變成 ASUS 員工健康與智慧穿戴產品的長期洞察層`

### 畫面呈現

- 左側放標題、副標與一句話：`Mobile-first wellness tracking for body composition, goals, and employee health programs.`
- 右側放 3 張手機 mock：
  - Dashboard overall。
  - AI Scan 表單。
  - Competition detail 或 Personal goal。
- 背景用冷白到淡藍，加入淡 mint 線條，但不要用大面積裝飾圖。
- 頁腳小字：`Internal concept draft / 2026`

### 需要補的素材

- `mobile-dashboard-overall.png`
- `mobile-record-form-scan.png`
- `mobile-competition-detail.png` 或 `mobile-personal-goal.png`

### 講者備註

InsightUp 的切入點不是重新做一個健康 App，而是把公司已有的健康設施、InBody 量測、穿戴裝置與 AI 能力串成可長期追蹤的體組成洞察系統。

## 02. 結論先行：ASUS 已有基礎，缺的是週期性體組成追蹤

### 頁面目的

給主管一頁看懂：為什麼 ASUS 應該評估 InsightUp。

### Claim

`ASUS 已有健康硬體、員工健身設施與 AI Healthcare 敘事；InsightUp 補的是「週期性體組成追蹤」這個缺口。`

### 畫面呈現

使用三段式流程圖：

`ASUS 現有基礎` -> `目前缺口` -> `InsightUp 補位`

第一段：

- VivoWatch / wearable health data。
- Healthcare AI。
- AI PC / ExpertBook。
- 員工健身房與運動社團。

第二段：

- InBody 報表零散。
- 長期追蹤不連續。
- 健身福利成果難量化。
- 社交比較容易變成錯誤壓力。

第三段：

- 資料整理與雜訊控制。
- AI Scan + AI 摘要。
- 個人目標與競賽。
- 匿名彙總與 pilot 指標。

### 需要補的素材

- 可用簡化 diagram。
- 若要放 ASUS 素材，只放官方來源截圖的小型縮圖，不要讓畫面變成產品型錄。

### 講者備註

這頁要把 InsightUp 放在 ASUS existing assets 上，而不是從零開始的新產品。重點是補位。

## 03. 問題：InBody 有資料，但使用者缺判斷

### 頁面目的

用故事建立產品需求，不直接進功能表。

### Claim

`InBody 給了很多數字，但使用者真正缺的是長期判讀與雜訊控制。`

### 畫面呈現

左側故事：

- 小安每兩週量一次 InBody。
- 某次重訓後量測，體脂率看似上升、肌肉量異常波動。
- 如果直接進圖表，她可能誤判訓練方向。

右側視覺：

- 一條趨勢線，中間有異常尖峰。
- 尖峰旁標註：`Keep record, exclude from chart`
- 底部三個痛點：
  - `Too many metrics`
  - `Too much noise`
  - `Too little long-term context`

### 需要補的素材

- 可用簡化折線圖，不需要產品截圖。
- 若要補產品畫面，可放 `mobile-records-manager.png` 小圖，呈現 included/excluded。

### 講者備註

資料保留與分析納入要分開。InsightUp 的核心不是刪資料，而是讓使用者控制哪些資料影響趨勢。

## 04. 產品解法：AI Scan 加速輸入，review-first 保護資料品質

### 頁面目的

展示最容易理解的功能價值：把報表快速變成可確認的紀錄草稿。

### Claim

`AI Scan 降低輸入摩擦，但不讓 AI 直接污染正式健康資料。`

### 畫面呈現

左側放手機截圖：

- AI Scan 區塊打開。
- 使用次數或 loading 狀態可見。

右側放三步流程：

1. `Upload`
   - JPG、PNG、WebP、PDF。
2. `Extract`
   - Gemini 只讀清楚可見欄位。
3. `Review`
   - 不確定欄位留白，使用者確認後才儲存。

底部 callout：

`Plan-driven usage limit. No blind auto-save.`

### 需要補的素材

- `mobile-record-form-scan.png`

### 講者備註

這頁要避免被理解成醫療 AI 或自動建檔。正確敘事是：AI 建草稿，人確認後才入庫。

## 05. 核心體驗：手機上看趨勢、摘要與資料控制

### 頁面目的

用手機畫面展示 InsightUp 的核心日常使用方式。

### Claim

`InsightUp 讓使用者先看懂趨勢，再決定哪些資料值得影響判斷。`

### 畫面呈現

三張手機並排：

1. `Dashboard`
   - Overall 或 segmental 趨勢。
2. `AI Summary`
   - 近期摘要、模型、額度或 cache 狀態。
3. `Records`
   - included/excluded 與 soft delete 管理。

每張手機下方放一句：

- Dashboard：`Read the trend`
- AI Summary：`Understand what changed`
- Records：`Control the signal`

### 需要補的素材

- `mobile-dashboard-overall.png`
- `mobile-summary.png`
- `mobile-records-manager.png`

### 講者備註

這頁是產品核心閉環：紀錄、整理、看趨勢、讀摘要。手機畫面足夠代表主要使用情境，不需要展示桌面。

## 06. 行動層：目標、朋友、競賽與分享讓留存變強

### 頁面目的

說明 InsightUp 不只看資料，還能推動行動與社群回訪。

### Claim

`長期健康追蹤需要行動機制；目標、朋友、競賽與分享讓使用者有理由回來。`

### 畫面呈現

四宮格，每格一張手機截圖或簡化卡片：

1. `Personal Goals`
   - 從最新 InBody 建立體重、肌肉、體脂、BMR 等目標。
2. `Friends`
   - 好友 ID、新增朋友、看最新快照。
3. `Competitions`
   - 共同目標日期、邀請朋友、排行榜看進度。
4. `Share`
   - 產生可下載趨勢圖，控制指標與樣式。

底部一句：

`Compare progress, not sensitive absolute body numbers.`

### 需要補的素材

- `mobile-personal-goal.png`
- `mobile-friends.png`
- `mobile-competition-detail.png`
- `mobile-share-builder.png`

### 講者備註

這裡要強調 InsightUp 的社交不是公開體重或體脂排名，而是個人目標進度與共同挑戰。

## 07. ASUS 產品協同：VivoWatch 看每天，InsightUp 看結果

### 頁面目的

把 InsightUp 放進 ASUS VivoWatch / Healthcare AI / AI PC 的產品地圖。

### Claim

`VivoWatch 看每天怎麼生活；InsightUp 看身體組成是否真的往目標前進。`

### 畫面呈現

左右對照：

左欄 `VivoWatch / ASUS health devices`

- 活動。
- 睡眠。
- 壓力。
- 心率。
- 血壓/ECG。
- 步態或呼吸等進階健康訊號。

右欄 `InsightUp`

- 體重。
- 骨骼肌。
- 體脂。
- 體脂率。
- 部位趨勢。
- AI 摘要。
- 目標與競賽。

中間箭頭：

`Daily behavior signals -> Periodic body composition outcomes`

### 需要補的素材

- `asus-vivowatch-6.png`
- `mobile-dashboard-overall.png`
- 可在頁腳註明 ASUS Computex 2026 Healthcare AI 與 VivoWatch 6 來源。

### 講者備註

不要說已經整合 VivoWatch。要說這是自然的產品協同方向，可以先做概念驗證。

## 08. ASUS 內部 pilot：從員工健身房開始

### 頁面目的

提出最務實的第一步：用 ASUS 內部場域驗證。

### Claim

`最短路徑不是直接對外賣，而是先用 ASUS 自有健身場域驗證留存、福利價值與資料治理。`

### 畫面呈現

使用 8-12 週活動流程：

1. `Recruit`
   - 自願報名。
   - 告知資料使用範圍。
2. `Measure`
   - 定期 InBody。
   - AI Scan 或手動輸入。
3. `Track`
   - Dashboard。
   - Goals。
   - AI Summary。
4. `Challenge`
   - 部門/社團競賽。
   - 排行榜看目標進度。
5. `Report`
   - 匿名彙總。
   - HR/ESG 成果。

右側放一張 ASUS ESG 健身設施官方截圖或簡化 icon rail。

### 需要補的素材

- `asus-esg-fitness-facility.png`
- `mobile-competitions.png`

### 講者備註

這頁要講清楚：不需要先完成 VivoWatch 整合，也能用現有 Web app 和公司健身房做第一輪驗證。

## 09. 資料治理與商業路徑：先建立信任，再擴大應用

### 頁面目的

同一頁處理健康資料敏感性與商業化路線。

### Claim

`員工健康資料要創造商業價值，前提是資料治理清楚，且 HR/ESG 只看匿名成果。`

### 畫面呈現

頁面分上下兩段。

上半部：資料治理三層

1. `Employee`
   - 看完整個人資料。
   - 可刪除、排除、控制分享。
2. `Coach / Activity operator`
   - 只看活動所需進度。
   - 需員工授權。
3. `HR / ESG`
   - 只看匿名彙總。
   - 參與率、完成率、回訪率、設施使用變化。

下半部：商業路徑階梯

1. `Internal Pilot`
2. `VivoWatch / ASUS Device Bundle`
3. `AI PC / Enterprise Wellness Demo`
4. `B2B Wellness / Coach / Studio`

### 需要補的素材

- 不需要產品截圖。
- 用治理 diagram + 商業階梯圖即可。

### 講者備註

這頁要主動解除疑慮：InsightUp 不應變成公司監控員工身體資料的工具。它應該是員工自願使用、公司只看匿名彙總成果的福利工具。

## 10. 下一步：12 週內完成 ASUS 內部驗證

### 頁面目的

收斂成明確行動要求。

### Claim

`建議以 ASUS 內部健身房 pilot 作為第一步，用 12 週驗證產品留存、福利價值與產品協同潛力。`

### 畫面呈現

左側：`Decision ask`

1. 確認 pilot sponsor。
2. 確認 pilot 場域。
3. 確認資料治理原則。
4. 確認 50-100 位自願參與者。

右側：`Success metrics`

- Pilot 參與率。
- 8-12 週完成率。
- 第二/第三筆紀錄留存率。
- AI Scan 使用率。
- 個人目標建立率。
- 競賽接受率與目標設定率。
- 健身房/課程使用率變化。
- 匿名彙總報告可用性。
- VivoWatch 或 ASUS 裝置協同意願。

底部：`Next 30 days`

- 整理 pilot 規格。
- 補齊手機截圖。
- 設計活動規則。
- 建立 demo data。
- 找內部 sponsor 與場域窗口。

### 需要補的素材

- 可放 `mobile-dashboard-overall.png` 淡化背景，或不放截圖，保持決策頁簡潔。

### 講者備註

最後不要停在願景。這頁要讓會議能做決策：誰 sponsor、在哪裡跑、資料怎麼管、什麼指標算成功。

## 截圖補拍規格

### 手機截圖

- Viewport：390x844 或等比例手機尺寸。
- 瀏覽器縮放：100%。
- 資料：使用 demo 資料，避免真實姓名、email、健康資料。
- 用途：
  - 封面裝置 mock。
  - Dashboard。
  - AI Scan。
  - Records included/excluded。
  - AI Summary。
  - Personal Goal。
  - Friends。
  - Competitions。
  - Share builder。
- 截圖前確認：
  - 不顯示 local dev error overlay。
  - 不顯示私人 email。
  - 不顯示 API key、console 或內部網址。
  - 朋友與競賽資料使用假名或 demo user。
  - 浮動按鈕不要遮住重點文字。
  - 安全區與底部控制列完整。

## 來源註記

簡報中引用 ASUS 公開資訊時，頁腳可用短註，完整 URL 可放 speaker notes。

- `Source: ASUS Pressroom, "ASUS Advances AI-Driven Healthcare at Computex 2026", Jun 2, 2026.`
- `Source: ASUS Taiwan Pressroom, Computex 2026 enterprise-to-edge AI release.`
- `Source: ASUS VivoWatch 6 product page.`
- `Source: ASUS ESG, Occupational Safety and Health.`
- `Source: ASUS Pressroom, Corporate Health Responsibility Gold Award.`

## Appendix 素材備用

若後續需要從 10 頁擴充成主管審查完整版，可補以下 appendix；10 頁主簡報中先不放。

### Appendix A. 功能對照表

| 功能 | 現況 | 商業價值 |
| --- | --- | --- |
| Records | 已有 | 核心資料庫 |
| AI Scan | 已有 draft flow | 降低輸入摩擦 |
| Dashboard | 已有 | 趨勢閱讀 |
| AI Summary | 已有 | 降低解讀門檻 |
| Share | 已有 | 成果擴散 |
| Personal Goals | 已有 | 提升留存 |
| Friends | 已有 | 教練/社群場景 |
| Competitions | 已有 | 員工福利與挑戰活動 |

### Appendix B. Pilot 資料治理草案

- 自願參與。
- 明確告知資料用途。
- 員工可刪除或退出。
- HR/ESG 僅看匿名彙總。
- 不用於績效、升遷、考核。
- 健康資料不公開在排行榜上。
- 排行榜只呈現目標進度或活動參與進度。

### Appendix C. 後續產品整合假設

- VivoWatch 資料只作為未來整合方向。
- 第一階段不依賴 VivoWatch API。
- 若進入整合階段，需確認資料授權、隱私條款、資料格式、裝置綁定與地區法規。
- Healthcare AI 若涉及醫療場景，需由 ASUS 既有合規路線處理；InsightUp 保持 wellness/fitness tracking 定位。

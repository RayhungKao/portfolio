---
title: Transaction 與並行寫入
---

**你會學到：** transaction 保證了什麼、超賣和遺失更新是怎麼發生的，以及每種問題最小的解法，包括重複送出。

一次只有一個使用者很簡單。麻煩從兩個請求在同一瞬間碰到同一份資料開始，而在忙碌的網站上這是家常便飯。

## Transaction 是全有或全無

**Transaction** 把好幾個寫入綁在一起，讓它們一起成功或一起失敗。下單會寫入訂單、訂單項目和庫存變動。如果第三個寫入失敗，前兩個就會被復原，沒有人會看到半張訂單。對使用者介面來說，這表示一個請求只有兩種結果：成功，或沒成功。

## 超賣

兩個人買最後一件商品。每個請求都讀取庫存、看到 1，然後存下自己的訂單。

![Overselling without an atomic update](diagram:oversell-without-atomic-update)

兩次讀取都發生在任何一次寫入之前，所以庫存最後變成 -1，賣出了兩件。單純加上 transaction 沒有用，因為兩個 transaction 讀到的都是同一個舊值。

解法是讓資料庫在單一 statement 裡同時檢查和修改：

```sql
UPDATE products SET stock = stock - 2
WHERE id = 'p1' AND stock >= 2;
```

資料庫只會在條件仍然成立時修改這個 row，並回報改了幾個 row。一個 row 代表成功。零個 row 代表有人先搶到了，handler 回應 `409 sold out`。

![An atomic update prevents overselling](diagram:oversell-fixed-with-atomic-update)

## 遺失更新與 optimistic locking

現在兩個人編輯同一份文件。兩人都載入、都修改，第二次儲存就默默蓋掉了第一次。這叫做**遺失更新（lost update）**。

解法是同一個概念。在那個 row 存一個 `version`。儲存時說：「更新這個 row，前提是它的版本還是我載入時那個」：

```sql
UPDATE files SET content = $1, version = version + 1
WHERE id = $2 AND version = 3;  -- 改了 0 個 row：回應 409
```

![Optimistic locking with a version number](diagram:optimistic-locking-conflict)

這叫做 **optimistic locking**：它假設衝突很少見，只在儲存時檢查。真的衝突時，用戶端會收到 `409`，可以顯示對話框讓使用者選擇重新載入、合併或覆蓋。

為什麼不乾脆在使用者編輯期間在資料庫裡 lock 那個 row？資料庫 lock 的設計是只持續幾毫秒。一個人編輯十分鐘，就會擋住其他所有人，還會一直佔著一條連線。

還有其他做法，各有代價：

- **簽出（check-out）**：一個人 lock 檔案，其他人等待。SharePoint 的文件提供這個功能。
- **即時合併**：多個人的編輯在發生的當下就被合併。Google Docs 和 Figma 就是這樣做的，用的是叫做 OT 或 CRDT 的演算法，這是一項很大的工程。

## 重複送出

使用者連點兩下「付款」，或手機重送了一個回應遺失的請求。伺服器就會收到同一個請求兩次。

有些動作天生就可以安全地重複執行，刪除檔案就是其一：

```sql
DELETE FROM files WHERE id = $1 AND owner_id = $2;
```

第二次刪除了零個 row，代表工作早就完成了，handler 一樣可以回應成功。

建立訂單或刷卡就不能安全地重複。這類動作由用戶端送出一個 **idempotency key**：每個預期中的動作只產生一次的唯一值。伺服器記住處理過的 key，遇到重複時回傳先前的結果。

以在你自己的網站下單為例：

1. 打開結帳頁時，瀏覽器用 `crypto.randomUUID()` 替這一筆訂單產生一個 key，例如 `a1b2…`。只在打開頁面時產生一次，不是每按一次就產生一個，所以連點兩下送出的是同一個 key。購物車有變動時，頁面就產生新的 key：一個 key 只代表一筆內容確定的訂單。
2. 按下「下單」，送出 `POST /orders`，header 帶上 `Idempotency-Key: a1b2…`。
3. 伺服器在同一個 transaction 裡，把 key 和使用者 ID 一起存下，並建立訂單。`(user_id, key)` 上的 unique constraint 讓同一組值第二次寫入時失敗。
4. 回應在半路遺失，瀏覽器帶著同一個 key 重送同一個請求。
5. 伺服器發現這個使用者已經存過 `a1b2…`，回傳存下的結果，不會建立第二筆訂單。

UUID v4 有 122 個隨機位元。就算產生十億個 key，任兩個相同的機率也只有約 9.4 × 10⁻²⁰；要到約 2.7 × 10¹⁸ 個 key，機率才會到一半。真正的風險在程式錯誤：用時間戳或 `Math.random()` 拼出 key，或讓兩筆不同的訂單共用一個 key。IETF 替 `Idempotency-Key` header 擬的標準草案寫道：同一個 key 帶著不同的 request body 再送來時，伺服器 SHOULD 回 422；Stripe 遇到這種情況也會回錯誤。伺服器端的程式碼見[一致性實務](/blog/consistency-in-practice)。

Stripe 的 `Idempotency-Key` header 是同一個設計，只是角色換了：你的後端是用戶端，Stripe 是伺服器。

## 單一 statement 不夠用的時候

從最小的工具開始，必要時才往上升級：

1. `CHECK` 或 `UNIQUE` constraint，讓資料庫直接拒絕壞資料。
2. 單一的 atomic `UPDATE`，如上所示。
3. 用 `SELECT … FOR UPDATE` lock row，適用於必須先讀、思考、再寫的情況。
4. `SERIALIZABLE` isolation level，適用於一條規則橫跨多個 row的情況。

每往上一步，都比前一步付出更多速度和更多細心。

> [!PRINCIPLE] 核心原則
> 單一 statement 或 constraint 能解決的，就不要引入 lock。

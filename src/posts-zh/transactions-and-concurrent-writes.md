---
title: Transaction 與同時寫入
---

**你會學到：** transaction 保證了什麼、超賣和更新被蓋掉是怎麼發生的、每種問題最簡單的解法，以及怎麼處理重複送出。

只有一個使用者時一切都很單純。麻煩在於兩個請求同時去改同一份資料，而在流量大的網站上，這種事天天都在發生。

## Transaction：要嘛全部成功，要嘛全部不算

**Transaction** 把好幾個寫入包在一起，讓它們一起成功或一起失敗。下一筆訂單，要寫入訂單、訂單項目和庫存變動。如果第三個寫入失敗，前兩個也會被還原，沒有人會看到只寫了一半的訂單。對畫面來說，這表示一個請求只有兩種結果：成功，或完全沒發生。

## 超賣

兩個人同時買最後一件商品。兩個請求都先讀庫存，都看到 1，然後各自建立訂單。

![Overselling without an atomic update](diagram:oversell-without-atomic-update)

兩次讀取都發生在任何一次寫入之前，所以庫存最後變成 -1，同一件商品賣了兩次。只是加上 transaction 沒有用，因為兩個 transaction 讀到的都是同一個舊的值。

解法是讓資料庫用一個 statement 同時檢查和修改：

```sql
UPDATE products SET stock = stock - 2
WHERE id = 'p1' AND stock >= 2;
```

資料庫只有在條件還成立時才會改這個 row，並回報改了幾個 row。改了一個，就是成功；改了零個，就是有人先搶到了，handler 回應 `409 sold out`。

![An atomic update prevents overselling](diagram:oversell-fixed-with-atomic-update)

## 更新被蓋掉，以及 optimistic locking

換成兩個人編輯同一份文件。兩個人都打開、都改了內容，後存檔的那一個就會在沒有任何提示的情況下，把前一個人的修改蓋掉。這叫做 **lost update**。

解法是同一個道理。在那個 row 上存一個 `version`，存檔時告訴資料庫：「只有版本還是我打開時的那一版，才更新這個 row」：

```sql
UPDATE files SET content = $1, version = version + 1
WHERE id = $2 AND version = 3;  -- 改了 0 個 row：回應 409
```

![Optimistic locking with a version number](diagram:optimistic-locking-conflict)

這叫做 **optimistic locking**：它假設衝突很少發生，只在存檔時才檢查。真的衝突了，client 會收到 `409`，可以跳出對話框，讓使用者選擇重新載入、合併，或直接覆蓋。

為什麼不在使用者編輯的這段時間，直接在資料庫裡把那個 row lock 住？因為資料庫的 lock 是設計來維持幾毫秒的。一個人編輯十分鐘，其他人就被擋十分鐘，還會一直佔住一條資料庫連線。

另外還有幾種做法，各有代價：

- **Check-out**：一個人鎖住檔案，其他人只能等。SharePoint 的文件就有這個功能。
- **即時合併**：多人的修改一發生就馬上合併。Google Docs 和 Figma 都是這樣做，用的是 OT 或 CRDT 這類演算法，要做起來是很大的工程。

## 重複送出

使用者連按兩下「付款」，或手機在回應遺失後又重送了一次請求，伺服器就會收到同一個請求兩次。

有些動作本來就可以放心重複做，例如刪除檔案：

```sql
DELETE FROM files WHERE id = $1 AND owner_id = $2;
```

第二次刪除時，刪掉的 row 是零個，代表這件事早就做完了，handler 照樣可以回應成功。

但建立訂單或刷卡就不能重複做。這類動作要由 client 送出一個 **idempotency key**：每一個要做的動作只產生一次的唯一值。伺服器記住處理過的 key，同一個 key 再來時，就直接回傳上次的結果。

以在你自己的網站上下單為例：

1. 打開結帳頁時，瀏覽器用 `crypto.randomUUID()` 替這筆訂單產生一個 key，例如 `a1b2…`。key 只在打開頁面時產生一次，不是每按一次就產生一個，所以連按兩下送出的是同一個 key。購物車內容一改，頁面就換一個新的 key：一個 key 只代表一筆內容固定的訂單。
2. 按下「下單」，送出 `POST /orders`，header 裡帶著 `Idempotency-Key: a1b2…`。
3. 伺服器在同一個 transaction 裡，把 key 跟使用者 ID 一起存起來，並建立訂單。`(user_id, key)` 上的 unique constraint，會讓同一組值的第二次寫入失敗。
4. 回應在半路上遺失了，瀏覽器帶著同一個 key，再送一次同樣的請求。
5. 伺服器發現這個使用者已經用過 `a1b2…`，就回傳上次存下的結果，不會再建立第二筆訂單。

UUID v4 有 122 個隨機位元。就算產生十億個 key，其中任兩個剛好相同的機率也只有大約 9.4 × 10⁻²⁰；要產生大約 2.7 × 10¹⁸ 個 key，撞號的機率才會到一半。真正的風險在程式寫錯：用時間戳或 `Math.random()` 拼出 key，或讓兩筆不同的訂單共用同一個 key。IETF 替 `Idempotency-Key` header 擬的標準草案規定：同一個 key 帶著不同的 request body 再送來時，伺服器 SHOULD 回 422；Stripe 遇到這種情況也會回錯誤。伺服器端的程式碼請見[一致性實務](/blog/consistency-in-practice)。

Stripe 的 `Idempotency-Key` header 也是同樣的設計，只是角色對調：你的後端是 client，Stripe 是伺服器。

## 一個 statement 解決不了的時候

先用最簡單的工具，不夠再往上換：

1. `CHECK` 或 `UNIQUE` constraint，讓資料庫直接拒絕不合法的資料。
2. 一個 atomic 的 `UPDATE`，就像上面的例子。
3. 用 `SELECT … FOR UPDATE` 把 row lock 住，適合必須先讀出來、判斷之後再寫回去的情況。
4. `SERIALIZABLE` isolation level，適合一條規則牽涉到好幾個 row 的情況。

每往上換一層，就要付出更多效能，也要更小心。

> [!PRINCIPLE] 核心原則
> 一個 statement 或一個 constraint 就能解決的，就不要用 lock。

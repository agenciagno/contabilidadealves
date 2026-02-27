

## Plan: Fix Filters, Layout, Sorting, Bulk Actions & Payment Date Import

### Problem Analysis

1. **Filters not working properly**: The contact filter comparison at line 164 uses `t.contact_id === contactFilter`, which is correct. Need to investigate if the `searchTerm` filter at line 169 only searches `description` but not contact name -- users may expect filtering by contact name too.

2. **KPI cards not updating with filters**: KPI cards already use `filteredTransactions` (line 184). The BI Ticker metrics (line 213) use `allTransactions` intentionally. Need to verify which cards the user wants filter-aware.

3. **Payment date importing as today**: The `date` column has `DEFAULT CURRENT_DATE` in PostgreSQL. The import code uses `...(paymentDateStr ? { date: paymentDateStr } : {})` which omits the key -- but the DB default fills it with today. Fix: explicitly pass `date: null` when empty.

4. **Missing "Data Emissão" column**: Need to add it to the left of "Cliente/Evento".

5. **Sort arrows on date columns**: Replace the current "Ordenar por Data" button with inline sort arrows on each date column header.

6. **Sticky table header**: Make the column headers fixed/sticky.

7. **Bulk delete**: Add delete option alongside bulk pay in the selection bar.

---

### File Changes

#### 1. `src/components/transactions/ImportSpreadsheetDialog.tsx`
- **Fix payment date**: Change `...(paymentDateStr ? { date: paymentDateStr } : {})` to `date: paymentDateStr || null` (explicit null instead of omitting).

#### 2. `src/pages/Transactions.tsx`

**Sort system overhaul:**
- Replace `SortField = 'date'` with `SortField = 'issue_date' | 'due_date' | 'expected_date' | 'date'`
- Remove the "Ordenar por" button bar (lines 614-626)
- Add sort arrows to each date column header (Emissão, Vencimento, Prevista, Pagamento)
- Each header click toggles asc/desc on that column

**Add "Data Emissão" column:**
- Change grid template from 8 columns to 9: `[40px_1fr_90px_90px_90px_90px_80px_120px_80px]`
- Insert "Emissão" column between checkbox and "Cliente/Evento"
- Display `formatDateShort(transaction.issue_date)`

**Sticky table header:**
- Add `sticky top-0 z-10 bg-card` classes to the header div

**Bulk delete:**
- Add a "Excluir X selecionado(s)" button next to the "Pagar" button in the selection bar
- Wire it to delete each selected transaction (with confirmation dialog)

**Filter fix:**
- Update search filter (line 169) to also match `t.contact?.name`
- Verify contact filter works by checking the actual data flow

**KPI cards:**
- Already filter-aware. Confirm BI Ticker is intentionally global (no change needed per original design).

#### 3. Database Migration
- Remove `DEFAULT CURRENT_DATE` from the `date` column so that omitting it results in `null` instead of today's date. This is the root cause.

---

### Technical Details

**Sort arrows (minimalist):**
```typescript
// Inline in header
<button onClick={() => handleSort('due_date')} className="inline-flex items-center gap-0.5">
  Vencimento
  {sortField === 'due_date' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
</button>
```

**Payment date fix (import):**
```typescript
// Instead of: ...(paymentDateStr ? { date: paymentDateStr } : {})
// Use:
date: paymentDateStr || null,
```

**Database migration:**
```sql
ALTER TABLE transactions ALTER COLUMN date DROP DEFAULT;
```

**Grid template update (9 columns):**
```
grid-cols-[40px_90px_1fr_90px_90px_90px_80px_120px_80px]
```
Columns: Checkbox | Emissão | Cliente/Evento | Vencimento | Prevista | Pagamento | Status | Valor | Ações


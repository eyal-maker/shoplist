'use client';

import { useMemo, useState } from 'react';
import { CATALOG, CATALOG_BY_ID, CatalogItem } from '@/lib/catalog';
import { CHAINS, CHAIN_LIST, ChainKey } from '@/lib/chains';
import type { Quote } from '@/lib/prices';

type ListEntry = { itemId: string; qty: number };

type NearbyStore = {
  id: string;
  chain: ChainKey;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  address?: string;
};

type Stage = 'building' | 'approved' | 'stores' | 'chosen' | 'compared';

export default function Page() {
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [pickId, setPickId] = useState<string>(CATALOG[0]?.id ?? '');
  const [pickQty, setPickQty] = useState<number>(1);
  const [freeText, setFreeText] = useState('');

  const [stage, setStage] = useState<Stage>('building');

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());

  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const totalItems = entries.reduce((s, e) => s + e.qty, 0);

  function addFromCatalog() {
    if (!pickId || pickQty <= 0) return;
    setEntries(prev => {
      const existing = prev.find(e => e.itemId === pickId);
      if (existing) {
        return prev.map(e =>
          e.itemId === pickId ? { ...e, qty: e.qty + pickQty } : e,
        );
      }
      return [...prev, { itemId: pickId, qty: pickQty }];
    });
    setPickQty(1);
  }

  function addFromFreeText() {
    const q = freeText.trim().toLowerCase();
    if (!q) return;
    const match = CATALOG.find(
      c => c.he.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
    if (!match) {
      alert('לא נמצא פריט תואם בקטלוג. בחרו מהרשימה.');
      return;
    }
    setFreeText('');
    setEntries(prev => {
      const existing = prev.find(e => e.itemId === match.id);
      if (existing) {
        return prev.map(e =>
          e.itemId === match.id ? { ...e, qty: e.qty + 1 } : e,
        );
      }
      return [...prev, { itemId: match.id, qty: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      setEntries(prev => prev.filter(e => e.itemId !== id));
    } else {
      setEntries(prev => prev.map(e => (e.itemId === id ? { ...e, qty } : e)));
    }
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.itemId !== id));
  }

  function approveList() {
    if (entries.length === 0) return;
    setStage('approved');
  }

  function editList() {
    setStage('building');
    setStores([]);
    setSelectedStoreIds(new Set());
    setQuotes(null);
  }

  async function goSearch() {
    setLocError(null);
    setStoresError(null);
    setStores([]);
    setSelectedStoreIds(new Set());

    if (!navigator.geolocation) {
      setLocError('הדפדפן לא תומך באיתור מיקום.');
      return;
    }

    setStoresLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `/api/stores?lat=${latitude}&lng=${longitude}&limit=10`,
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת סופרים');
          setStores(data.stores as NearbyStore[]);
          setStage('stores');
        } catch (e) {
          setStoresError(e instanceof Error ? e.message : String(e));
        } finally {
          setStoresLoading(false);
        }
      },
      err => {
        setStoresLoading(false);
        setLocError(`שגיאה באיתור מיקום: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function toggleStore(id: string) {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllStores() {
    setSelectedStoreIds(new Set(stores.map(s => s.id)));
  }

  function clearStoreSelection() {
    setSelectedStoreIds(new Set());
  }

  async function comparePrices() {
    if (selectedStoreIds.size === 0) return;
    setCompareError(null);
    setCompareLoading(true);
    setQuotes(null);
    try {
      const selected = stores.filter(s => selectedStoreIds.has(s.id));
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          stores: selected.map(s => ({ id: s.id, chain: s.chain })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהשוואת מחירים');
      setQuotes(data.quotes as Quote[]);
      setStage('compared');
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompareLoading(false);
    }
  }

  const bestTotal = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;
    return Math.min(...quotes.map(q => q.total));
  }, [quotes]);

  const storeById = useMemo(() => {
    const m = new Map<string, NearbyStore>();
    for (const s of stores) m.set(s.id, s);
    return m;
  }, [stores]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>רשימת קניות חכמה</h1>
          <div className="sub">בנו רשימה, מצאו סופרים בסביבתכם והשוו מחירים</div>
        </div>
        <div className="sub">סה״כ פריטים: {totalItems}</div>
      </div>

      <ShoppingListPanel
        entries={entries}
        pickId={pickId}
        pickQty={pickQty}
        freeText={freeText}
        stage={stage}
        onPickIdChange={setPickId}
        onPickQtyChange={setPickQty}
        onFreeTextChange={setFreeText}
        onAddFromCatalog={addFromCatalog}
        onAddFromFreeText={addFromFreeText}
        onUpdateQty={updateQty}
        onRemove={removeEntry}
        onApprove={approveList}
        onEdit={editList}
      />

      <SearchPanel
        stage={stage}
        stores={stores}
        coords={coords}
        loading={storesLoading}
        locError={locError}
        storesError={storesError}
        selectedStoreIds={selectedStoreIds}
        onGoSearch={goSearch}
        onToggleStore={toggleStore}
        onSelectAll={selectAllStores}
        onClearSelection={clearStoreSelection}
      />

      {selectedStoreIds.size > 0 && stage !== 'building' && (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="step">
                <span className="step-num">3</span>
                <span>השוואת מחירים עבור {selectedStoreIds.size} סופרים נבחרים</span>
              </div>
            </div>
            <button
              className="btn primary"
              onClick={comparePrices}
              disabled={compareLoading}
            >
              {compareLoading ? 'משווה…' : 'השווה מחירים'}
            </button>
          </div>
          {compareError && <div className="error">{compareError}</div>}
        </div>
      )}

      {quotes && (
        <ComparePanel
          quotes={quotes}
          bestTotal={bestTotal}
          storeById={storeById}
        />
      )}

      <div className="footer-note">
        המחירים המוצגים כעת דמה (mock) — השלב הבא יחבר לנתוני «חוק מחירים שקופים» של
        הרשתות.
      </div>
    </div>
  );
}

function ShoppingListPanel(props: {
  entries: ListEntry[];
  pickId: string;
  pickQty: number;
  freeText: string;
  stage: Stage;
  onPickIdChange: (v: string) => void;
  onPickQtyChange: (v: number) => void;
  onFreeTextChange: (v: string) => void;
  onAddFromCatalog: () => void;
  onAddFromFreeText: () => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onApprove: () => void;
  onEdit: () => void;
}) {
  const {
    entries,
    pickId,
    pickQty,
    freeText,
    stage,
    onPickIdChange,
    onPickQtyChange,
    onFreeTextChange,
    onAddFromCatalog,
    onAddFromFreeText,
    onUpdateQty,
    onRemove,
    onApprove,
    onEdit,
  } = props;

  const editable = stage === 'building';

  return (
    <div className="panel">
      <div className="step">
        <span className="step-num">1</span>
        <span>בניית רשימת קניות</span>
      </div>
      <h2>הרשימה שלי</h2>

      {editable && (
        <>
          <div className="row wrap" style={{ marginBottom: 8 }}>
            <select
              className="select grow"
              value={pickId}
              onChange={e => onPickIdChange(e.target.value)}
            >
              {CATALOG.map(c => (
                <option key={c.id} value={c.id}>
                  {c.he} ({c.unit})
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min={1}
              value={pickQty}
              onChange={e => onPickQtyChange(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <button className="btn primary" onClick={onAddFromCatalog}>
              הוסף
            </button>
          </div>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            <input
              className="input grow"
              placeholder="חיפוש חופשי (למשל: חלב, לחם, עגבניות)"
              value={freeText}
              onChange={e => onFreeTextChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onAddFromFreeText();
              }}
            />
            <button className="btn" onClick={onAddFromFreeText}>
              חיפוש והוספה
            </button>
          </div>
        </>
      )}

      {entries.length === 0 ? (
        <div className="muted">הרשימה ריקה. הוסיפו פריטים כדי להתחיל.</div>
      ) : (
        <ul className="list">
          {entries.map(e => {
            const c = CATALOG_BY_ID[e.itemId];
            if (!c) return null;
            return (
              <li key={e.itemId}>
                <div className="grow">
                  <strong>{c.he}</strong>
                  <span className="muted"> • {c.unit}</span>
                </div>
                {editable ? (
                  <>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={e.qty}
                      onChange={ev =>
                        onUpdateQty(e.itemId, Number(ev.target.value))
                      }
                      style={{ width: 70 }}
                    />
                    <button
                      className="btn danger"
                      onClick={() => onRemove(e.itemId)}
                    >
                      הסר
                    </button>
                  </>
                ) : (
                  <span className="muted">כמות: {e.qty}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        {editable ? (
          <button
            className="btn success"
            onClick={onApprove}
            disabled={entries.length === 0}
          >
            אישור הרשימה
          </button>
        ) : (
          <button className="btn" onClick={onEdit}>
            ערוך רשימה
          </button>
        )}
      </div>
    </div>
  );
}

function SearchPanel(props: {
  stage: Stage;
  stores: NearbyStore[];
  coords: { lat: number; lng: number } | null;
  loading: boolean;
  locError: string | null;
  storesError: string | null;
  selectedStoreIds: Set<string>;
  onGoSearch: () => void;
  onToggleStore: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  const {
    stage,
    stores,
    coords,
    loading,
    locError,
    storesError,
    selectedStoreIds,
    onGoSearch,
    onToggleStore,
    onSelectAll,
    onClearSelection,
  } = props;

  if (stage === 'building') return null;

  return (
    <div className="panel">
      <div className="step">
        <span className="step-num">2</span>
        <span>חיפוש סופרים בקרבתי</span>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>סופרים קרובים</h2>
        <button className="btn primary" onClick={onGoSearch} disabled={loading}>
          {loading ? 'מחפש…' : stores.length ? 'חפש שוב' : 'חפש (Go Search)'}
        </button>
      </div>

      {coords && (
        <div className="sub" style={{ marginTop: 6 }}>
          מיקום נוכחי: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </div>
      )}
      {locError && <div className="error">{locError}</div>}
      {storesError && <div className="error">{storesError}</div>}

      {stores.length > 0 && (
        <>
          <div className="row" style={{ margin: '12px 0' }}>
            <button className="btn" onClick={onSelectAll}>
              בחר הכול
            </button>
            <button className="btn" onClick={onClearSelection}>
              נקה בחירה
            </button>
            <span className="muted">נבחרו: {selectedStoreIds.size}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {stores.map(s => {
              const info = CHAINS[s.chain];
              const selected = selectedStoreIds.has(s.id);
              return (
                <div
                  key={s.id}
                  className={'store-card' + (selected ? ' selected' : '')}
                  onClick={() => onToggleStore(s.id)}
                >
                  <div>
                    <div className="name">
                      <span
                        className="chip"
                        style={{ background: info.color, marginInlineEnd: 8 }}
                      >
                        {info.he}
                      </span>
                      {s.name}
                    </div>
                    <div className="meta">
                      {s.address ? `${s.address} • ` : ''}
                      {s.distanceKm.toFixed(2)} ק״מ
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleStore(s.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && stage !== 'building' && stores.length === 0 && !locError && !storesError && (
        <div className="muted" style={{ marginTop: 12 }}>
          לחצו «חפש (Go Search)» כדי לאתר את 10 הסופרים הקרובים ביותר.
        </div>
      )}
    </div>
  );
}

function ComparePanel(props: {
  quotes: Quote[];
  bestTotal: number | null;
  storeById: Map<string, NearbyStore>;
}) {
  const { quotes, bestTotal, storeById } = props;

  const sorted = [...quotes].sort((a, b) => a.total - b.total);
  // Collect item ids in display order from first quote.
  const itemIds = sorted[0]?.lines.map(l => l.itemId) ?? [];

  return (
    <div className="panel">
      <div className="step">
        <span className="step-num">4</span>
        <span>תוצאות השוואה</span>
      </div>
      <h2>השוואת סל הקניות</h2>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>פריט</th>
              {sorted.map(q => {
                const s = storeById.get(q.storeId);
                const info = s ? CHAINS[s.chain] : CHAINS[q.chain];
                return (
                  <th key={q.storeId}>
                    <span
                      className="chip"
                      style={{ background: info.color, marginInlineEnd: 6 }}
                    >
                      {info.he}
                    </span>
                    <div className="muted" style={{ fontWeight: 400 }}>
                      {s?.name}
                      {s ? ` • ${s.distanceKm.toFixed(1)} ק״מ` : ''}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {itemIds.map(id => {
              const catalog = CATALOG_BY_ID[id];
              return (
                <tr key={id}>
                  <td>{catalog?.he ?? id}</td>
                  {sorted.map(q => {
                    const line = q.lines.find(l => l.itemId === id);
                    if (!line) return <td key={q.storeId}>—</td>;
                    if (!line.available)
                      return (
                        <td key={q.storeId}>
                          <span className="muted">לא זמין</span>
                        </td>
                      );
                    return (
                      <td key={q.storeId}>
                        ₪{line.lineTotal?.toFixed(2)}
                        <span className="muted"> ({line.qty}×₪{line.unitPrice?.toFixed(2)})</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="total-row">
              <td>סה״כ</td>
              {sorted.map(q => (
                <td
                  key={q.storeId}
                  className={bestTotal !== null && q.total === bestTotal ? 'best' : ''}
                >
                  ₪{q.total.toFixed(2)}
                  {q.missing > 0 && (
                    <span className="tag">{q.missing} חסרים</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

const MEMBERS = ["古川", "中嶋", "坂本"];

const COLORS = {
  古川: { accent: "#ff4d6d", glow: "rgba(255,77,109,0.35)" },
  中嶋: { accent: "#4dabff", glow: "rgba(77,171,255,0.35)" },
  坂本: { accent: "#34e0c4", glow: "rgba(52,224,196,0.35)" },
};

const POS = "#34e0c4";
const NEG = "#ff4d6d";

const yen = (n) => {
  const v = Math.round(n);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}¥${Math.abs(v).toLocaleString()}`;
};

const todayStr = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

const emptyPlayers = () =>
  MEMBERS.reduce((o, m) => ({ ...o, [m]: { investment: "", payout: "" } }), {});

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [view, setView] = useState("home");

  const [date, setDate] = useState(todayStr());
  const [machine, setMachine] = useState("");
  const [players, setPlayers] = useState(emptyPlayers());
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      setError("データの読み込みに失敗しました。通信環境を確認してください。");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const net = (p) =>
    (parseInt(String(p.payout).replace(/,/g, ""), 10) || 0) -
    (parseInt(String(p.investment).replace(/,/g, ""), 10) || 0);

  const sessionTotal = (s) =>
    MEMBERS.reduce((sum, m) => sum + (s.players[m].payout - s.players[m].investment), 0);

  const totals = useMemo(() => {
    const t = MEMBERS.reduce((o, m) => ({ ...o, [m]: 0 }), {});
    sessions.forEach((s) => {
      MEMBERS.forEach((m) => {
        t[m] += s.players[m].payout - s.players[m].investment;
      });
    });
    return t;
  }, [sessions]);

  const grandTotal = useMemo(
    () => Object.values(totals).reduce((a, b) => a + b, 0),
    [totals]
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions]
  );

  const resetForm = () => {
    setDate(todayStr());
    setMachine("");
    setPlayers(emptyPlayers());
    setEditId(null);
  };

  const openInput = (s) => {
    if (s) {
      setEditId(s.id);
      setDate(s.date);
      setMachine(s.machine || "");
      setPlayers(
        MEMBERS.reduce(
          (o, m) => ({
            ...o,
            [m]: {
              investment: String(s.players[m].investment || ""),
              payout: String(s.players[m].payout || ""),
            },
          }),
          {}
        )
      );
    } else {
      resetForm();
    }
    setView("input");
  };

  const setField = (m, field, value) =>
    setPlayers((prev) => ({ ...prev, [m]: { ...prev[m], [field]: value } }));

  const saveSession = async () => {
    if (!date) return;
    setSaving(true);
    setError(null);
    const builtPlayers = MEMBERS.reduce(
      (o, m) => ({
        ...o,
        [m]: {
          investment: parseInt(String(players[m].investment).replace(/,/g, ""), 10) || 0,
          payout: parseInt(String(players[m].payout).replace(/,/g, ""), 10) || 0,
        },
      }),
      {}
    );
    try {
      const res = await fetch("/api/sessions", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, date, machine, players: builtPlayers }),
      });
      const data = await res.json();
      setSessions(data.sessions || []);
      resetForm();
      setView("home");
    } catch (e) {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      setError("削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  // 当日の3人合計と均等分配額
  const liveTotal = MEMBERS.reduce((s, m) => s + net(players[m]), 0);
  const liveShare = liveTotal / 3;

  return (
    <div style={S.app}>
      <div style={S.bgImage} />
      <div style={S.bgOverlay} />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.35); }
        input { font-family: inherit; }
        button { font-family: inherit; }
      `}</style>

      <div style={S.content}>
        {error && (
          <div style={S.errorBanner}>
            {error}
            <button onClick={() => setError(null)} style={S.errorClose}>×</button>
          </div>
        )}

        {!loaded ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <div style={{ color: "#bbb", fontSize: 13, marginTop: 12 }}>読み込み中…</div>
          </div>
        ) : view === "home" ? (
          <div style={S.screen}>
            <header style={S.header}>
              <div>
                <div style={S.eyebrow}>NORIUCHI LEDGER</div>
                <h1 style={S.title}>乗り打ち収支</h1>
              </div>
              {saving && <div style={S.savingDot} />}
            </header>

            <div style={S.glassCard}>
              <div style={S.avgLabel}>通算収支（3人合計）</div>
              <div style={{ ...S.avgValue, color: grandTotal >= 0 ? POS : NEG }}>
                {yen(grandTotal)}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 }}>
                1人あたり通算 {yen(grandTotal / 3)} ・ {sessions.length}日分
              </div>
            </div>

            <div style={S.memberGrid}>
              {MEMBERS.map((m) => {
                const t = totals[m];
                const c = COLORS[m];
                return (
                  <div key={m} style={{ ...S.memberCard, boxShadow: `0 0 0 1px ${c.accent}55, 0 8px 28px -10px ${c.glow}` }}>
                    <div style={{ ...S.memberDot, background: c.accent }} />
                    <div style={S.memberName}>{m}</div>
                    <div style={{ ...S.memberTotal, color: t >= 0 ? POS : NEG }}>{yen(t)}</div>
                  </div>
                );
              })}
            </div>

            <div style={S.sectionLabel}>履歴</div>

            {sortedSessions.length === 0 ? (
              <div style={S.emptyState}>
                まだ記録がありません。右下の＋から最初の1日分を入力してください。
              </div>
            ) : (
              <div style={S.dateList}>
                {sortedSessions.map((s) => {
                  const st = sessionTotal(s);
                  const share = st / 3;
                  return (
                    <div key={s.id} style={S.dateCard}>
                      <div style={S.dateRow}>
                        <span style={S.dateText}>
                          {s.date.replace(/-/g, "/")}
                          {s.machine && <span style={S.machineTag}>{s.machine}</span>}
                        </span>
                        <span style={{ ...S.daySum, color: st >= 0 ? POS : NEG }}>合計 {yen(st)}</span>
                      </div>
                      <div style={S.entryRow}>
                        {MEMBERS.map((m) => {
                          const pn = s.players[m].payout - s.players[m].investment;
                          const c = COLORS[m];
                          return (
                            <div key={m} style={S.entryChip}>
                              <span style={{ color: c.accent, fontWeight: 700 }}>{m}</span>
                              <span style={{ color: pn >= 0 ? POS : NEG, marginLeft: 6 }}>{yen(pn)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={S.shareLine}>
                        均等分配：1人 <b style={{ color: share >= 0 ? POS : NEG }}>{yen(share)}</b>
                      </div>
                      <div style={S.cardActions}>
                        <button onClick={() => openInput(s)} style={S.textBtn}>編集</button>
                        <button onClick={() => deleteSession(s.id)} style={S.textBtnDanger}>削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => openInput(null)} style={S.fab} aria-label="記録を追加">＋</button>
          </div>
        ) : (
          <div style={S.screen}>
            <header style={S.header}>
              <button onClick={() => { resetForm(); setView("home"); }} style={S.backBtn}>← 戻る</button>
              <h1 style={S.title}>{editId ? "記録を編集" : "記録を追加"}</h1>
            </header>

            <div style={S.form}>
              <label style={S.label}>日付</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} />

              <label style={S.label}>何を打ったか（機種・店名など）</label>
              <input type="text" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="例：北斗の拳 / マルハン熊本店" style={S.input} />

              {MEMBERS.map((m) => {
                const c = COLORS[m];
                const pn = net(players[m]);
                return (
                  <div key={m} style={{ ...S.playerBlock, borderColor: c.accent + "66" }}>
                    <div style={S.playerHead}>
                      <span style={{ color: c.accent, fontWeight: 800 }}>{m}</span>
                      <span style={{ color: pn >= 0 ? POS : NEG, fontWeight: 800 }}>{yen(pn)}</span>
                    </div>
                    <div style={S.playerInputs}>
                      <div style={{ flex: 1 }}>
                        <label style={S.miniLabel}>投資額</label>
                        <input type="number" inputMode="numeric" value={players[m].investment} onChange={(e) => setField(m, "investment", e.target.value)} placeholder="0" style={S.input} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={S.miniLabel}>出玉収入</label>
                        <input type="number" inputMode="numeric" value={players[m].payout} onChange={(e) => setField(m, "payout", e.target.value)} placeholder="0" style={S.input} />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={S.glassCard}>
                <div style={S.avgLabel}>この日の3人合計</div>
                <div style={{ ...S.avgValue, fontSize: 26, color: liveTotal >= 0 ? POS : NEG }}>{yen(liveTotal)}</div>
                <div style={S.distRow}>
                  {MEMBERS.map((m) => (
                    <div key={m} style={S.distChip}>
                      <span style={{ color: COLORS[m].accent, fontWeight: 700 }}>{m}</span>
                      <span style={{ color: liveShare >= 0 ? POS : NEG, marginLeft: 6 }}>{yen(liveShare)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 8 }}>
                  ※ 3人で均等に分配した場合の1人あたり金額
                </div>
              </div>

              <button onClick={saveSession} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "保存中…" : editId ? "更新する" : "保存する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  app: { minHeight: "100vh", position: "relative", color: "#fff", fontFamily: "'Hiragino Sans','Yu Gothic',-apple-system,BlinkMacSystemFont,sans-serif", overflow: "hidden" },
  bgImage: { position: "fixed", inset: 0, backgroundImage: "url(/bg.jpeg)", backgroundSize: "cover", backgroundPosition: "center", zIndex: 0 },
  bgOverlay: { position: "fixed", inset: 0, background: "linear-gradient(180deg, rgba(5,2,15,0.72) 0%, rgba(5,2,15,0.86) 100%)", backdropFilter: "blur(2px)", zIndex: 1 },
  content: { position: "relative", zIndex: 2 },
  loadingWrap: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  spinner: { width: 28, height: 28, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: POS, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  screen: { maxWidth: 480, margin: "0 auto", padding: "24px 18px 110px", position: "relative" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  eyebrow: { fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.8)" },
  title: { fontSize: 22, fontWeight: 800, margin: "2px 0 0", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.9)" },
  savingDot: { width: 8, height: 8, borderRadius: "50%", background: POS, flexShrink: 0 },
  backBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.85)", fontSize: 14, cursor: "pointer", padding: 0 },
  errorBanner: { background: "rgba(60,12,18,0.95)", border: "1px solid rgba(255,77,109,0.5)", color: "#ffb3c0", fontSize: 13, padding: "10px 14px", borderRadius: 10, margin: "12px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  errorClose: { background: "none", border: "none", color: "#ffb3c0", fontSize: 16, cursor: "pointer" },
  glassCard: { background: "rgba(20,12,40,0.55)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: "20px 22px", marginBottom: 16, marginTop: 16, textAlign: "center", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)" },
  avgLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6, letterSpacing: "0.04em" },
  avgValue: { fontSize: 32, fontWeight: 800, fontFamily: "'SF Mono','Roboto Mono',monospace", textShadow: "0 2px 12px rgba(0,0,0,0.7)" },
  memberGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 28 },
  memberCard: { background: "rgba(20,12,40,0.5)", borderRadius: 14, padding: "16px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, backdropFilter: "blur(10px)" },
  memberDot: { width: 8, height: 8, borderRadius: "50%", marginBottom: 4 },
  memberName: { fontSize: 13, fontWeight: 700, color: "#eee" },
  memberTotal: { fontSize: 15, fontWeight: 800, fontFamily: "'SF Mono','Roboto Mono',monospace" },
  sectionLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", marginBottom: 10, paddingLeft: 2 },
  emptyState: { textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 13, padding: "40px 20px", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: 14, lineHeight: 1.6, background: "rgba(10,6,24,0.4)" },
  dateList: { display: "flex", flexDirection: "column", gap: 10 },
  dateCard: { background: "rgba(16,10,32,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px", backdropFilter: "blur(8px)" },
  dateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 },
  dateText: { fontSize: 13, color: "#ddd", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  machineTag: { fontSize: 11, color: "#ddd", background: "rgba(255,255,255,0.12)", borderRadius: 6, padding: "2px 8px", fontWeight: 600 },
  daySum: { fontSize: 13, fontWeight: 800, fontFamily: "'SF Mono','Roboto Mono',monospace" },
  entryRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  entryChip: { background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 10px", fontSize: 13 },
  shareLine: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 10 },
  cardActions: { display: "flex", gap: 14, marginTop: 10, justifyContent: "flex-end" },
  textBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", padding: 0 },
  textBtnDanger: { background: "none", border: "none", color: NEG, fontSize: 12, cursor: "pointer", padding: 0 },
  fab: { position: "fixed", bottom: 28, right: "calc(50% - 240px + 18px)", width: 56, height: 56, borderRadius: "50%", background: POS, color: "#05020f", fontSize: 26, fontWeight: 700, border: "none", boxShadow: `0 8px 28px -4px ${COLORS["坂本"].glow}`, cursor: "pointer", zIndex: 5 },
  form: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 14, marginBottom: 4 },
  miniLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4, display: "block" },
  input: { background: "rgba(8,4,20,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none", width: "100%" },
  playerBlock: { border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: "12px 14px", marginTop: 14, background: "rgba(12,7,26,0.5)", backdropFilter: "blur(8px)" },
  playerHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 15 },
  playerInputs: { display: "flex", gap: 10 },
  distRow: { display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  distChip: { background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px", fontSize: 13 },
  saveBtn: { marginTop: 18, background: POS, color: "#05020f", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" },
};

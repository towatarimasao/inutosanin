"use client";

import { useState, useEffect, useMemo } from "react";

const ADMIN_PASSWORD = "admin1234";

const CATEGORY_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店",
  adoption:   "保護犬情報",
};

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({ slug, label }));

type Spot = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
};

type EditForm = { name: string; category: string; address: string };

function adminFetch(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": ADMIN_PASSWORD,
      ...options.headers,
    },
  });
}

// ── パスワード画面 ──────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      onAuth();
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-80 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-gray-800">管理画面ログイン</h1>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="パスワード"
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          autoFocus
        />
        {error && <p className="text-red-500 text-xs">パスワードが違います</p>}
        <button
          type="submit"
          className="bg-gray-800 text-white rounded px-4 py-2 text-sm hover:bg-gray-700 transition"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}

// ── 編集モーダル ────────────────────────────────────────────
function EditModal({
  spot,
  onClose,
  onSave,
}: {
  spot: Spot;
  onClose: () => void;
  onSave: (id: string, form: EditForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm>({
    name:     spot.name,
    category: spot.category,
    address:  spot.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(spot.id, form);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="font-bold text-gray-800">スポットを編集</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">名前</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">カテゴリ</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">住所</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 transition disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── メイン管理画面 ──────────────────────────────────────────
function AdminContent() {
  const [spots, setSpots]           = useState<Spot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("");
  const [editTarget, setEditTarget] = useState<Spot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null);

  async function loadSpots() {
    setLoading(true);
    const res = await adminFetch("/api/admin/spots");
    if (res.ok) setSpots(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadSpots(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return spots.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.address ?? "").toLowerCase().includes(q);
      const matchCat    = !filterCat || s.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [spots, search, filterCat]);

  async function handleSave(id: string, form: EditForm) {
    await adminFetch(`/api/admin/spots/${id}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    await loadSpots();
  }

  async function handleDelete(spot: Spot) {
    await adminFetch(`/api/admin/spots/${spot.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await loadSpots();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">スポット管理</h1>
          <span className="text-sm text-gray-500">{filtered.length} 件表示</span>
        </div>

        {/* 検索・フィルター */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・住所で検索…"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:border-gray-500"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          >
            <option value="">全カテゴリ</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* テーブル */}
        {loading ? (
          <p className="text-sm text-gray-500 py-10 text-center">読み込み中…</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">名前</th>
                  <th className="px-4 py-3 font-medium">カテゴリ</th>
                  <th className="px-4 py-3 font-medium">住所</th>
                  <th className="px-4 py-3 font-medium w-28">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((spot) => (
                  <tr key={spot.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                      {spot.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {CATEGORY_LABELS[spot.category] ?? spot.category}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[280px] truncate">
                      {spot.address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditTarget(spot)}
                          className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 transition"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteTarget(spot)}
                          className="px-3 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-10 text-sm">
                      該当するスポットがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {editTarget && (
        <EditModal
          spot={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="font-bold text-gray-800">削除の確認</h2>
            <p className="text-sm text-gray-600">
              「{deleteTarget.name}」を削除します。この操作は元に戻せません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ページエントリー ────────────────────────────────────────
export default function AdminSpotsPage() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;
  return <AdminContent />;
}

// Simple CSV exporter (UTF-8 BOM for Excel pt-BR compatibility)
type Row = Record<string, string | number | null | undefined>;

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV(filename: string, rows: Row[], headers?: { key: string; label: string }[]) {
  if (!rows.length) return;
  const cols = headers ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const head = cols.map((c) => escape(c.label)).join(";");
  const body = rows.map((r) => cols.map((c) => escape(r[c.key])).join(";")).join("\n");
  const csv = "\uFEFF" + head + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

"use client";

import { Download, Printer } from "lucide-react";

export default function ReportsActions({
  csv,
  filename,
}: {
  csv: string;
  filename: string;
}) {
  function downloadCsv() {
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={downloadCsv}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D9CDC4] bg-white px-4 text-sm font-bold text-brand-primary transition hover:bg-[#FFF7F5]"
      >
        <Download size={17} />
        Exportar planilha
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
      >
        <Printer size={17} />
        Imprimir relatório
      </button>
    </div>
  );
}

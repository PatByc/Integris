"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { createClient } from "@/lib/supabase";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const THUMB_SCALE = 0.2;
const DEFAULT_SCALE = 1.2;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

interface Props {
  documentId: string;
}

function PageThumbnail({
  pdf,
  pageNum,
  isActive,
  onClick,
}: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: THUMB_SCALE });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch {
        // render cancelled — ignore
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, pageNum]);

  return (
    <button
      onClick={onClick}
      className={`overflow-hidden rounded border-2 transition-colors ${
        isActive ? "border-blue-500" : "border-transparent hover:border-gray-400"
      }`}
    >
      <canvas ref={canvasRef} className="w-full" />
      <p className="py-0.5 text-center text-[10px] text-gray-500">{pageNum}</p>
    </button>
  );
}

export function PdfPreview({ documentId }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [error, setError] = useState(false);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  // Load PDF from backend
  useEffect(() => {
    let destroyed = false;
    let loadedDoc: PDFDocumentProxy | null = null;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setError(true); return; }

        const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/pdf`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setError(true); return; }

        const buffer = await res.arrayBuffer();
        const data = new Uint8Array(buffer);
        const doc = await pdfjsLib.getDocument({ data }).promise;

        if (destroyed) { doc.destroy(); return; }

        loadedDoc = doc;
        setPdf(doc);
        setCurrentPage(1);
        setError(false);
      } catch {
        if (!destroyed) setError(true);
      }
    })();

    return () => {
      destroyed = true;
      loadedDoc?.destroy();
      setPdf(null);
    };
  }, [documentId]);

  // Render current page on main canvas
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;

    (async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = mainCanvasRef.current;
      if (!canvas || cancelled) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        // render cancelled — ignore
      }
    })();

    return () => { cancelled = true; };
  }, [pdf, currentPage, scale]);

  if (!pdf && !error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-gray-400">Loading PDF…</p>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-red-500">Could not load PDF.</p>
      </div>
    );
  }

  const numPages = pdf.numPages;

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-gray-200">
      {/* Thumbnail strip */}
      <div className="w-[120px] flex-shrink-0 overflow-y-auto bg-gray-100 p-2 flex flex-col gap-2">
        {Array.from({ length: numPages }, (_, i) => (
          <PageThumbnail
            key={i + 1}
            pdf={pdf}
            pageNum={i + 1}
            isActive={currentPage === i + 1}
            onClick={() => setCurrentPage(i + 1)}
          />
        ))}
      </div>

      {/* Right: toolbar + canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 text-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-gray-500">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            Next →
          </button>
          <span className="mx-1 text-gray-300">|</span>
          <button
            onClick={() => setScale((s) => Math.max(ZOOM_MIN, parseFloat((s - ZOOM_STEP).toFixed(2))))}
            disabled={scale <= ZOOM_MIN}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-12 text-center text-gray-500">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(ZOOM_MAX, parseFloat((s + ZOOM_STEP).toFixed(2))))}
            disabled={scale >= ZOOM_MAX}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >
            +
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex flex-1 overflow-auto bg-gray-200 p-4 justify-center">
          <canvas ref={mainCanvasRef} className="self-start shadow-lg" />
        </div>
      </div>
    </div>
  );
}

"""
Inventory 10x-style single-cell archives inside the two supplementary ZIPs.
Reads only MTX headers + optional feature peek (no full matrix load).
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import tarfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


@dataclass
class SampleRow:
    dataset: str
    archive_in_zip: str
    matrix_member: str
    n_genes: int
    n_cells: int
    nnz: int

    @property
    def nnz_per_cell(self) -> float:
        return self.nnz / max(self.n_cells, 1)

    @property
    def sparsity(self) -> float:
        denom = max(self.n_genes * self.n_cells, 1)
        return 1.0 - (self.nnz / denom)


def _first_mtx_triplet_from_gz_stream(stream) -> tuple[int, int, int]:
    gz = gzip.GzipFile(fileobj=stream)
    for raw in gz:
        line = raw.decode().strip()
        if not line or line.startswith("%"):
            continue
        a, b, c = map(int, line.split())
        return a, b, c
    raise ValueError("Empty or invalid MTX stream")


def iter_mtx_samples(zip_path: Path, dataset_label: str) -> Iterator[SampleRow]:
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            name = info.filename
            if name.endswith(".tar.gz"):
                mode = "r:gz"
            elif name.endswith(".tar"):
                mode = "r"
            else:
                continue
            blob = zf.read(name)
            bio = io.BytesIO(blob)
            with tarfile.open(fileobj=bio, mode=mode) as tf:
                for m in tf.getmembers():
                    if not m.name.endswith("matrix.mtx.gz"):
                        continue
                    mtx_stream = tf.extractfile(m)
                    if mtx_stream is None:
                        continue
                    genes, cells, nnz = _first_mtx_triplet_from_gz_stream(mtx_stream)
                    yield SampleRow(
                        dataset=dataset_label,
                        archive_in_zip=name,
                        matrix_member=m.name,
                        n_genes=genes,
                        n_cells=cells,
                        nnz=nnz,
                    )


def main() -> None:
    from dataset_paths import ZIP_ENDO, ZIP_PCOS

    backup_root = Path(__file__).resolve().parents[1]
    out_dir = backup_root / "scRNA_analysis"
    out_dir.mkdir(exist_ok=True)

    z_endo = ZIP_ENDO
    z_pcos = ZIP_PCOS

    rows = list(iter_mtx_samples(z_endo, "Endometrium")) + list(
        iter_mtx_samples(z_pcos, "PCOS")
    )

    csv_path = out_dir / "single_cell_sample_inventory.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "dataset",
                "archive_in_zip",
                "matrix_member",
                "n_genes",
                "n_cells",
                "nnz",
                "nnz_per_cell",
                "sparsity",
            ]
        )
        for r in rows:
            w.writerow(
                [
                    r.dataset,
                    r.archive_in_zip,
                    r.matrix_member,
                    r.n_genes,
                    r.n_cells,
                    r.nnz,
                    f"{r.nnz_per_cell:.2f}",
                    f"{r.sparsity:.4f}",
                ]
            )

    def agg(label: str) -> dict:
        sub = [r for r in rows if r.dataset == label]
        total_cells = sum(r.n_cells for r in sub)
        total_nnz = sum(r.nnz for r in sub)
        return {
            "libraries": len(sub),
            "total_cells": total_cells,
            "mean_cells_per_library": total_cells / max(len(sub), 1),
            "median_cells_per_library": float(
                sorted(r.n_cells for r in sub)[len(sub) // 2]
            )
            if sub
            else 0.0,
            "genes_per_matrix": sub[0].n_genes if sub else 0,
            "mean_nnz_per_cell": total_nnz / max(total_cells, 1),
        }

    summary = {
        "format": "10x Cell Ranger filtered_feature_bc_matrix (matrix.mtx.gz, barcodes.tsv.gz, features.tsv.gz) nested in per-sample .tar / .tar.gz inside each ZIP",
        "feature_reference": "GRCh38-style Cell Ranger gene list (Gene Expression); 36601 features in all inspected libraries",
        "Endometrium": agg("Endometrium"),
        "PCOS": agg("PCOS"),
        "notes": [
            "PCOS ZIP contains 20 libraries named Mc##-C and Mc##-F (10 donor codes × two conditions); interpret C/F from the original publication.",
            "Endometrium ZIP contains 2 libraries (UA_Endo… tar.gz).",
            "This script does not load full count matrices; QC, normalization, and clustering require Scanpy/Seurat and sufficient RAM.",
        ],
    }
    (out_dir / "single_cell_inventory_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Single-cell supplementary ZIP inventory</title>
<style>
body {{ font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #222; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }}
th {{ background: #f5f5f5; }}
code {{ background: #f4f4f4; padding: 2px 5px; }}
</style>
</head>
<body>
<h1>Single-cell data: ZIP inventory</h1>
<p>Generated from MTX headers only (genes × cells dimensions + nonzeros).</p>
<h2>Summary</h2>
<pre>{json.dumps(summary, indent=2)}</pre>
<h2>Per-library table</h2>
<p>See <code>single_cell_sample_inventory.csv</code> in the same folder.</p>
</body>
</html>"""
    (out_dir / "single_cell_inventory_report.html").write_text(html, encoding="utf-8")

    print(f"Wrote: {csv_path}")


if __name__ == "__main__":
    main()

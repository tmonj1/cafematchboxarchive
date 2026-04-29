#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "osxphotos>=0.68.0",
#   "Pillow>=10.0.0",
# ]
# ///
"""マッチ箱写真処理スクリプト

Apple Photosのアルバムから写真を取得し、中央トリミング・メタデータ削除・PNG変換を行う。
"""

import argparse
import sys
import tempfile
from pathlib import Path
from typing import Optional

try:
    import osxphotos
except ImportError:
    print("osxphotos がインストールされていません。pip install osxphotos を実行してください。")
    sys.exit(1)

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow がインストールされていません。pip install Pillow を実行してください。")
    sys.exit(1)


DEFAULT_ALBUM = "マッチ箱"
DEFAULT_OUTPUT = Path(__file__).parent / "images"


def parse_ratio(ratio_str: str) -> tuple[float, float]:
    parts = ratio_str.split(":")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError(f"比率は W:H の形式で指定してください（例: 1:1, 4:3）: {ratio_str}")
    try:
        w, h = float(parts[0]), float(parts[1])
    except ValueError:
        raise argparse.ArgumentTypeError(f"比率の値が不正です: {ratio_str}")
    if w <= 0 or h <= 0:
        raise argparse.ArgumentTypeError(f"比率は正の数で指定してください: {ratio_str}")
    return w, h


def calc_crop_box(orig_w: int, orig_h: int, ratio: Optional[tuple[float, float]]) -> tuple[int, int, int, int]:
    cx, cy = orig_w // 2, orig_h // 2

    if ratio is None:
        crop_w = max(1, int(orig_w * 0.5))
        crop_h = max(1, int(orig_h * 0.5))
    else:
        rw, rh = ratio
        scale_by_w = orig_w / rw * rh
        scale_by_h = orig_h / rh * rw
        if scale_by_w <= orig_h:
            crop_w = orig_w
            crop_h = max(1, int(scale_by_w))
        else:
            crop_w = max(1, int(scale_by_h))
            crop_h = orig_h

    left = cx - crop_w // 2
    top = cy - crop_h // 2
    return left, top, left + crop_w, top + crop_h


def make_output_filename(photo: osxphotos.PhotoInfo, crop_w: int, crop_h: int) -> str:
    date_str = photo.date.strftime("%Y%m%d_%H%M%S")
    stem = Path(photo.original_filename).stem
    uid = photo.uuid[:8]
    return f"{date_str}_{stem}_{crop_w}x{crop_h}_{uid}.png"


def process_photo(
    photo: osxphotos.PhotoInfo,
    output_dir: Path,
    ratio: Optional[tuple[float, float]],
    dry_run: bool,
) -> str:
    """1枚の写真を処理する。戻り値: "processed" | "skipped" | "dry_run" | "error"."""
    # dry-runはエクスポート不要: osxphotosメタデータのサイズで推定表示
    if dry_run:
        orig_w, orig_h = photo.width, photo.height
        box = calc_crop_box(orig_w, orig_h, ratio)
        crop_w, crop_h = box[2] - box[0], box[3] - box[1]
        out_name = make_output_filename(photo, crop_w, crop_h)
        if (output_dir / out_name).exists():
            print(f"  [スキップ] {out_name}")
            return "skipped"
        print(f"  [dry-run] {out_name}  ({orig_w}x{orig_h} → {crop_w}x{crop_h})")
        return "dry_run"

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # convert_to_jpeg=TrueでHEIC等をJPEGに変換してからエクスポートし、Pillowで確実に開けるようにする
        options = osxphotos.ExportOptions(
            convert_to_jpeg=True,
        )
        results = photo.export(str(tmp_path), options=options)
        image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".bmp"}
        exported_images = [p for p in results.exported if Path(p).suffix.lower() in image_exts]
        if not exported_images:
            print(f"  [エラー] 画像ファイルのエクスポート失敗: {photo.original_filename}")
            return "error"

        try:
            exported_file = Path(exported_images[0])
            raw_img = Image.open(exported_file)
        except Exception as e:
            print(f"  [エラー] 画像読み込み失敗: {photo.original_filename} ({e})")
            return "error"

        with raw_img:
            # EXIF Orientationに従って回転・反転を適用してから処理する
            img = ImageOps.exif_transpose(raw_img)
            orig_w, orig_h = img.size
            box = calc_crop_box(orig_w, orig_h, ratio)
            crop_w = box[2] - box[0]
            crop_h = box[3] - box[1]

            out_name = make_output_filename(photo, crop_w, crop_h)
            out_path = output_dir / out_name

            if out_path.exists():
                print(f"  [スキップ] {out_name}")
                return "skipped"

            cropped = img.crop(box)
            # パレットモードはRGB/RGBAに変換してから転写し、色壊れを防ぐ
            if cropped.mode not in ("RGB", "RGBA", "L", "LA"):
                cropped = cropped.convert("RGBA" if cropped.getbands().__contains__("A") else "RGB")
            # paste()でピクセルのみ転写し、EXIFなどのメタデータを除去する
            clean = Image.new(cropped.mode, cropped.size)
            clean.paste(cropped)
            output_dir.mkdir(parents=True, exist_ok=True)
            clean.save(out_path, format="PNG")
            print(f"  [保存] {out_name}  ({orig_w}x{orig_h} → {crop_w}x{crop_h})")
            return "processed"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apple Photosのアルバムからマッチ箱の写真を取得・処理する"
    )
    parser.add_argument(
        "--album", default=DEFAULT_ALBUM, help=f"対象アルバム名（デフォルト: {DEFAULT_ALBUM}）"
    )
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT, help=f"出力先ディレクトリ（デフォルト: {DEFAULT_OUTPUT}）"
    )
    parser.add_argument(
        "--ratio",
        metavar="W:H",
        help="トリミング比率（例: 1:1, 4:3）。省略時は縦横50%%のデフォルトクロップ",
    )
    def positive_int(value: str) -> int:
        n = int(value)
        if n <= 0:
            raise argparse.ArgumentTypeError(f"正の整数を指定してください: {value}")
        return n

    parser.add_argument(
        "--max-count", type=positive_int, default=None, metavar="N", help="処理する最大ファイル数（省略時は全件）"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="実際には保存せず処理対象を表示する"
    )
    args = parser.parse_args()

    ratio: Optional[tuple[float, float]] = None
    if args.ratio:
        ratio = parse_ratio(args.ratio)

    print("Apple Photosライブラリを読み込み中...")
    db = osxphotos.PhotosDB()

    albums = db.album_info
    target_album = next((a for a in albums if a.title == args.album), None)
    if target_album is None:
        print(f"エラー: アルバム「{args.album}」が見つかりません。")
        available = [a.title for a in albums]
        print(f"利用可能なアルバム: {', '.join(available[:10])}")
        sys.exit(1)

    photos = target_album.photos
    if args.max_count is not None:
        photos = photos[: args.max_count]

    total = len(photos)
    print(f"アルバム「{args.album}」: {total} 枚{'（最大 ' + str(args.max_count) + ' 枚）' if args.max_count else ''}")
    if args.dry_run:
        print("[dry-run モード: ファイルは保存されません]")
    print(f"出力先: {args.output.resolve()}")
    print()

    counts = {"processed": 0, "skipped": 0, "error": 0, "dry_run": 0}
    for i, photo in enumerate(photos, 1):
        print(f"[{i}/{total}] {photo.original_filename}", end="  ")
        result = process_photo(photo, args.output, ratio, args.dry_run)
        counts[result] += 1

    print()
    if args.dry_run:
        print(f"完了(dry-run): 処理対象 {counts['dry_run']} 枚 / スキップ {counts['skipped']} 枚 / エラー {counts['error']} 枚")
    else:
        print(f"完了: 処理済み {counts['processed']} 枚 / スキップ {counts['skipped']} 枚 / エラー {counts['error']} 枚")


if __name__ == "__main__":
    main()

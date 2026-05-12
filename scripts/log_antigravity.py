#!/usr/bin/env python3
"""
Mô-đun script để tự động bắt log / ghi log riêng cho trợ lý Antigravity (Gemini).
Tương thích với định dạng của .ai-log/session.jsonl
"""
import json
import os
import argparse
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

VN_TZ = timezone(timedelta(hours=7))

def git(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""

def find_latest_log():
    """Giả lập hàm quét tìm prompt tự động từ log nội bộ của Antigravity nếu cần"""
    return "Antigravity prompt execution / auto-sync"

def log_antigravity(auto=False, dry_run=False):
    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "session.jsonl"
    
    ts = datetime.now(VN_TZ).isoformat()
    prompt_text = find_latest_log() if auto else "Manual Antigravity Sync"
    
    entry = {
        "ts": ts,
        "tool": "antigravity",
        "event": "auto_sync" if auto else "manual_log",
        "session_id": "antigravity-" + datetime.now().strftime("%Y%m%d"),
        "model": "Gemini",
        "repo": git("git remote get-url origin").split("/")[-1].replace(".git", ""),
        "branch": git("git rev-parse --abbrev-ref HEAD"),
        "commit": git("git rev-parse --short HEAD"),
        "student": git("git config user.email"),
        "prompt": prompt_text,
    }
    
    if dry_run:
        print(f"[DRY-RUN] Will log: {json.dumps(entry, ensure_ascii=False, indent=2)}")
        return

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"[OK] Logged Antigravity session to {log_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Antigravity AI Logger")
    parser.add_argument("--auto", action="store_true", help="Tự động dò tìm lịch sử và log")
    parser.add_argument("--dry-run", action="store_true", help="Chạy giả lập (Không lưu file)")
    args = parser.parse_args()
    
    log_antigravity(auto=args.auto, dry_run=args.dry_run)

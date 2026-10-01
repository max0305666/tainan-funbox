import json, os
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
DATA=BASE/"data"
shops_file=DATA/"shops.json"
status_file=DATA/"feed-status.json"

TW=timezone(timedelta(hours=8))
now=datetime.now(TW).isoformat(timespec="seconds")

status={
  "updatedAt":now,
  "mode":"manual",
  "message":"",
  "sources_checked":0
}

token=os.getenv("META_ACCESS_TOKEN")
if not token:
    status["message"]="META_ACCESS_TOKEN 未設定；保留現有資料。請使用合法的 Meta/Facebook API 權限後再啟用自動同步。"
    status_file.write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding="utf-8")
    raise SystemExit(0)

# Intentionally no guessed/private scraping endpoint here.
# Plug the officially authorized Meta Graph API implementation into this section.
status["mode"]="api-ready"
status["message"]="已偵測到 META_ACCESS_TOKEN；請依粉專實際可用的 Meta API 權限接入 Graph API。"
status_file.write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding="utf-8")

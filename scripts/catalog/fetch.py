"""Fetch manufacturer pages politely for catalog verification. Python 3 standard library + curl.

- Honors robots.txt; if robots.txt cannot be read (5xx/429/network), the site is treated as disallowed.
- Identifies itself with a descriptive User-Agent; waits DELAY seconds (default 5) between requests.
- Backs off on HTTP 429 (30s, 60s) and never retries more than twice.
- Saves <name>.html (raw) and <name>.txt (first line "URL: <final url>") into OUT_DIR; skips URLs already saved.

usage: DELAY=5 python3 -I scripts/catalog/fetch.py OUT_DIR URL [URL ...]
Then extract product regions with scripts/catalog/region.py.
"""
import hashlib, html, os, re, subprocess, sys, time, urllib.parse, urllib.robotparser

UA = "Mozilla/5.0 (compatible; PumpPath-research/0.1; hackathon product research)"
DELAY = float(os.environ.get("DELAY", "5"))
_robots = {}


def curl(url, timeout):
    r = subprocess.run(
        ["curl", "-sL", "-m", str(timeout), "-A", UA, "-H", "Accept-Language: en-US", "-w", "\n__STATUS__%{http_code} %{url_effective}", url],
        capture_output=True, text=True, errors="ignore",
    )
    body, _, meta = r.stdout.rpartition("\n__STATUS__")
    code, _, final = meta.partition(" ")
    return code, body, final


def allowed(url):
    p = urllib.parse.urlparse(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in _robots:
        code, body, _ = curl(base + "/robots.txt", 20)
        rp = urllib.robotparser.RobotFileParser()
        if code == "200":
            rp.parse(body.splitlines())
        elif code.startswith("4") and code != "429":
            rp.parse([])  # no robots.txt: everything allowed
        else:
            rp = None  # unreachable robots.txt: be conservative
        _robots[base] = rp
    rp = _robots[base]
    return rp is not None and rp.can_fetch("*", url)


def to_text(raw):
    t = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", raw)
    t = re.sub(r"(?i)<br\s*/?>|</(p|li|div|h\d|tr|td|th)>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    lines = [re.sub(r"[ \t ]+", " ", l).strip() for l in t.splitlines()]
    return "\n".join(l for l in lines if l)


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for url in sys.argv[2:]:
        parsed = urllib.parse.urlparse(url)
        name = re.sub(r"[^a-z0-9]+", "_", parsed.netloc + parsed.path.lower()).strip("_")[:120]
        name += "_" + hashlib.sha1(url.encode()).hexdigest()[:6]
        if os.path.exists(os.path.join(out, name + ".txt")):
            print(f"SKIP {url}", flush=True)
            continue
        if not allowed(url):
            print(f"BLOCKED {url}", flush=True)
            continue
        raw, final = None, url
        for attempt in range(3):
            code, body, final = curl(url, 40)
            if code == "200":
                raw = body
                break
            if code != "429":
                print(f"ERROR {url} HTTP {code}", flush=True)
                break
            time.sleep(30 * (attempt + 1))
        if raw is not None:
            open(os.path.join(out, name + ".html"), "w").write(raw)
            open(os.path.join(out, name + ".txt"), "w").write(f"URL: {final}\n\n" + to_text(raw))
            print(f"OK {name}.txt {final}", flush=True)
        else:
            print(f"FAILED {url}", flush=True)
        time.sleep(DELAY)


if __name__ == "__main__":
    main()

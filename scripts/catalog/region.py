"""Extract the product-specific region of saved manufacturer pages (v2 extractor).

Replaces the v1 rules that hid real specifications: dropping lines shared by >=50% of a
brand's pages, and keeping at most 3 lines per attribute tag. v2 keeps every line in the
product region — including specs a brand repeats on many pages — and excludes:
  - <nav>, <header>, <footer>, <aside>, scripts and styles;
  - everything outside <main> (or, when a page has no <main>, everything before its <h1>);
  - related-product / "frequently bought together" blocks, until the next FAQ or spec heading;
  - customer-review blocks, until the next brand-voice product section.
The page <title> and meta description are kept as the first lines (section "page-title" /
"page-metadata" in the catalog).

usage: python3 -I scripts/catalog/region.py PAGES_DIR OUT_DIR
Reads <name>.html + <name>.txt pairs from scripts/catalog/fetch.py. Writes OUT_DIR/<name>.txt
with "URL: <url>" on line 1 and the skipped block headings on line 2, for auditing.
Point SOURCE_SNAPSHOTS at OUT_DIR to run lib/products/verify-sources.test.ts.
"""
import glob, html, os, re, sys

DROP_BLOCKS = r"script|style|noscript|svg|template|nav|header|footer|aside"
# Headings that start content about other products or customer opinions.
STOP = re.compile(
    r"(?i)^(you may also like|you might also like|customers also (bought|viewed)|related products?|"
    r"frequently bought together|recommended( for you| products)?|complete (the|your) (set|routine)|"
    r"pairs? (well )?with|shop (the|related)|more from|similar products|compare (pumps|models)|"
    r"customer reviews|reviews|ratings? (&|and) reviews|what (moms|customers) are saying|"
    r"real moms, real reviews|write a review|recently viewed|still have questions\??|store owner replied)\b.{0,30}$"
    r"|^(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}, \d{4}$"
)

# Product-owned sections that may follow a skipped block.
RESUME = re.compile(r"(?i)^(faqs?|frequently asked questions|questions\??|q&a|product faqs?|specifications?|tech(nical)? spec(ification)?s|what.?s in(cluded| the box)|in the box)\b.{0,30}$")

REVIEW_STOP = re.compile(r"(?i)^(customer reviews|reviews|ratings? (&|and) reviews|what (moms|customers) are saying|real moms, real reviews|write a review|store owner replied|(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}, \d{4}$)")
REVIEW_UI = re.compile(r"(?i)review|stars?\b|verified|helpful|sort by|filter|read more|load more|\d+ (days?|weeks?|months?) ago|^\d|out of 5")
FIRST_PERSON = re.compile(r"(?i)\b(i|i'm|i've|i'd|my|me|mine)\b")

def product_section_starts(lines, i):
    """A short heading followed by brand-voice copy (not first-person) ends a review block."""
    if i + 1 >= len(lines):
        return False
    head, body = lines[i], lines[i + 1]
    return len(head) < 50 and not REVIEW_UI.search(head) and len(body) >= 40 and not FIRST_PERSON.search(body) and not REVIEW_UI.search(body)

def to_lines(fragment):
    t = re.sub(rf"(?is)<({DROP_BLOCKS})\b[^>]*>.*?</\1>", " ", fragment)
    t = re.sub(r"(?i)<br\s*/?>|</(p|li|div|h\d|tr|td|th|dt|dd|section|span)>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    out = []
    for line in t.splitlines():
        line = re.sub(r"[ \t ]+", " ", line).strip()
        # Leaked attribute fragments from malformed markup are not content.
        if not line or re.match(r'^(aria-|data-|class=|role=|tabindex|c-[a-z-]+#)|="', line):
            continue
        out.append(line)
    return out

def region(raw):
    raw = re.sub(r"(?is)<(script|style|noscript|template)\b[^>]*>.*?</\1>", " ", raw)
    mains = re.findall(r"(?is)<main\b[^>]*>(.*?)</main>", raw)
    if mains:
        return to_lines(" ".join(mains)), "main"
    body = re.search(r"(?is)<body\b[^>]*>(.*)</body>", raw)
    fragment = body.group(1) if body else raw
    # Without <main>, site menus live in the body; product content starts at the page's <h1>.
    h1 = re.search(r"(?is)<h1\b", fragment)
    return to_lines(fragment[h1.start():] if h1 else fragment), "body-from-h1" if h1 else "body-minus-chrome"

def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, "*.html"))):
        txt = f[:-5] + ".txt"
        url = open(txt).readline()[5:].strip() if os.path.exists(txt) else ""
        lines, mode = region(open(f, encoding="utf-8", errors="ignore").read())
        title = re.search(r"(?is)<title[^>]*>(.*?)</title>", open(f, encoding="utf-8", errors="ignore").read())
        meta = re.search(r'(?is)<meta\s+name="description"\s+content="([^"]*)"', open(f, encoding="utf-8", errors="ignore").read())
        kept = [re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() for m in (title, meta) if m]
        skipping, review_zone, markers = False, False, []
        for i, l in enumerate(lines):
            if i > 20 and STOP.match(l):
                skipping, review_zone = True, bool(REVIEW_STOP.match(l))
                markers.append(l[:30])
                continue
            if skipping and (RESUME.match(l) or (review_zone and product_section_starts(lines, i))):
                skipping = False
            if not skipping:
                kept.append(l)
        marker = "; ".join(markers) or "(none)"
        name = os.path.basename(txt)
        open(os.path.join(dst, name), "w").write(f"URL: {url}\nCUT: {marker}\n\n" + "\n".join(kept))
        print(f"{name[:60]:60} {mode:18} kept={len(kept):4}/{len(lines):4} cut={marker[:40]}")

if __name__ == "__main__":
    main()

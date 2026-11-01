#!/usr/bin/env python3
"""Generate initial native block documents from the immutable Bordeaux reference.
No database writes. Runtime content lives in WordPress after the one-time seed.
"""
from html.parser import HTMLParser
from html import escape
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[2]


class Node:
    def __init__(self, tag="", attrs=(), children=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = children or []

    def find(self, p):
        if p(self):
            return self
        return next(
            (r for c in self.children if isinstance(c, Node) for r in [c.find(p)] if r),
            None,
        )

    def render(self):
        if self.tag == "":
            return "".join(render(c) for c in self.children)
        attrs = "".join(
            " " + k + '="' + escape(v or "", quote=True) + '"'
            for k, v in self.attrs.items()
        )
        return (
            "<"
            + self.tag
            + attrs
            + ">"
            + (
                ""
                if self.tag in ["img", "br", "meta", "link", "input"]
                else "".join(render(c) for c in self.children) + "</" + self.tag + ">"
            )
        )


def render(c):
    return c.render() if isinstance(c, Node) else escape(c, quote=False)


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, t, a):
        n = Node(t, a)
        self.stack[-1].children.append(n)
        if t not in ["img", "br", "meta", "link", "input", "hr", "source"]:
            self.stack.append(n)

    def handle_endtag(self, t):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == t:
                del self.stack[i:]
                break

    def handle_data(self, d):
        self.stack[-1].children.append(d)


def parse(file):
    p = Parser()
    p.feed(file.read_text())
    return p.root


def block(name, attrs, html):
    return (
        "<!-- wp:"
        + name
        + (
            " " + json.dumps(attrs, ensure_ascii=False, separators=(",", ":"))
            if attrs
            else ""
        )
        + " -->\n"
        + html
        + "\n<!-- /wp:"
        + name
        + " -->\n"
    )


def group(content, cls="", tag="div", anchor=None):
    a = {"tagName": tag, "layout": {"type": "default"}}
    if cls:
        a["className"] = cls
    if anchor:
        a["anchor"] = anchor
    return block(
        "group",
        a,
        "<"
        + tag
        + ' class="wp-block-group'
        + (" " + cls if cls else "")
        + '"'
        + (' id="' + anchor + '"' if anchor else "")
        + ">"
        + content
        + "</"
        + tag
        + ">",
    )


def para(content, cls=""):
    return block(
        "paragraph",
        (
            {
                "className": cls,
                **(
                    {
                        "metadata": {
                            "name": {
                                "book-status": "Buchstatus (optional)",
                                "book-description": "Buchbeschreibung (optional)",
                            }[cls]
                        }
                    }
                    if cls in ["book-status", "book-description"]
                    else {}
                ),
            }
            if cls
            else {}
        ),
        "<p" + (' class="' + cls + '"' if cls else "") + ">" + content + "</p>",
    )


def image(n):
    name = Path(n.attrs["src"]).name
    token = re.sub("[^a-z0-9]", "_", name.lower())
    cls = n.attrs.get("class", "")
    attrs = {
        "id": "__ID_" + token + "__",
        "sizeSlug": "full",
        "linkDestination": "none",
    }
    if cls:
        attrs["className"] = cls
    html = (
        '<figure class="wp-block-image size-full'
        + (" " + cls if cls else "")
        + '"><img src="__URL_'
        + token
        + '__" alt="'
        + escape(n.attrs.get("alt", ""), quote=True)
        + '" class="wp-image-__ID_'
        + token
        + '__"/></figure>'
    )
    return block("image", attrs, html).replace(
        '"__ID_' + token + '__"', "__ID_" + token + "__"
    )


def convert(n):
    if isinstance(n, str):
        return "" if not n.strip() else para(escape(n))
    tag = n.tag
    cls = n.attrs.get("class", "")
    anchor = n.attrs.get("id")
    if tag in ["script", "dialog", "noscript"]:
        return ""
    if tag == "img":
        return image(n)
    if tag in ["h1", "h2", "h3", "h4"]:
        return block(
            "heading",
            {"level": int(tag[1]), **({"className": cls} if cls else {})},
            "<"
            + tag
            + ' class="wp-block-heading'
            + (" " + cls if cls else "")
            + '">'
            + "".join(render(c) for c in n.children)
            + "</"
            + tag
            + ">",
        )
    if tag in ["p", "address"]:
        return para(
            "".join(render(c) for c in n.children),
            cls or ("legal-address" if tag == "address" else ""),
        )
    if tag == "a":
        if "footer-facebook" in cls:
            return (
                '<!-- wp:social-links {"className":"footer-social","openInNewTab":true} -->\n<ul class="wp-block-social-links footer-social"><!-- wp:social-link '
                + json.dumps(
                    {
                        "url": n.attrs["href"],
                        "service": "facebook",
                        "label": "Andreas spricht auf Facebook",
                    },
                    ensure_ascii=False,
                )
                + " /--></ul>\n<!-- /wp:social-links -->\n"
            )
        if "brand" in cls:
            return para(
                '<a href="'
                + n.attrs["href"]
                + '">andreas<br>spricht<span class="brand-dot">.</span></a>',
                "brand",
            )
        return para(
            n.render(),
            "link-wrap"
            + (
                " book-link-wrap"
                if "book-link" in cls
                else (
                    " contact-button-wrap"
                    if "contact-button" in cls
                    else " nav-contact-wrap" if "nav-contact" in cls else ""
                )
            ),
        )
    if tag == "span":
        return para("".join(render(c) for c in n.children), cls)
    if tag == "ul":
        items = "".join(
            block(
                "list-item",
                {},
                "<li>" + "".join(render(c) for c in li.children) + "</li>",
            )
            for li in n.children
            if isinstance(li, Node) and li.tag == "li"
        )
        return block("list", {}, '<ul class="wp-block-list">' + items + "</ul>")
    content = "".join(convert(c) for c in n.children)
    if cls == "hero-visual__caption":
        return para("".join(render(c) for c in n.children), cls)
    return group(
        content,
        cls,
        (
            tag
            if tag in ["section", "main", "header", "footer", "nav", "article"]
            else "div"
        ),
        anchor,
    )


def sample(title, desc, name, index):
    token = re.sub("[^a-z0-9]", "_", name.lower())
    audio = block(
        "audio",
        {"id": "__ID_" + token + "__", "className": "sample-audio"},
        '<figure class="wp-block-audio sample-audio"><audio controls src="__URL_'
        + token
        + '__" preload="none"></audio></figure>',
    ).replace('"__ID_' + token + '__"', "__ID_" + token + "__")
    heading = block(
        "heading", {"level": 3}, '<h3 class="wp-block-heading">' + title + "</h3>"
    )
    return group(
        para(f"{index:02}", "sample-number")
        + group(heading + para(desc), "sample-copy")
        + group(audio, "player"),
        "sample",
        "article",
    )


home = parse(ROOT / "bordeaux/index.html")
body = home.find(lambda n: n.tag == "body")
# Fill the three actual current samples; do not migrate the obsolete noscript placeholder.
for card_class in ["studio-book", "released-book"]:
    card = home.find(lambda n: card_class in n.attrs.get("class", "").split())
    copy = next(
        c for c in reversed(card.children) if isinstance(c, Node) and c.tag == "div"
    )
    copy.children[-1:-1] = [
        Node("p", [("class", "book-status")]),
        Node("p", [("class", "book-description")]),
    ]
samplelist = home.find(lambda n: n.attrs.get("id") == "sample-list")
rows = [
    ("Beim Tanz des Gefreiten", "Roman · Ernst Scharrer", "hoerprobe-kap1-kurz.mp3"),
    (
        "Die Geschichte von den Watschlawanen",
        "Fantastische Geschichte · Ernst Scharrer",
        "hoerprobe-watschlawanen-kapitel-4.mp3",
    ),
    (
        "Die letzte Vorstellung",
        "Romantische Kurzgeschichte · Simon Harth",
        "hoerprobe-letzte-vorstellung.mp3",
    ),
]
for name in ["home", "impressum", "datenschutz"]:
    doc = home if name == "home" else parse(ROOT / f"bordeaux/{name}/index.html")
    body = doc.find(lambda n: n.tag == "body")
    parts = []
    for n in body.children:
        if not isinstance(n, Node) or (
            n.tag not in ["header", "main", "footer"]
            and not (n.tag == "a" and n.attrs.get("class") == "skip")
        ):
            continue
        parts.append(convert(n))
    content = "".join(parts)
    if name == "home":
        content = content.replace(
            group("", anchor="sample-list"),
            group(
                "".join(sample(*row, i) for i, row in enumerate(rows, 1)),
                anchor="sample-list",
            ),
        )
    # Local WordPress links are resolved by seed, never hardcode a production origin.
    content = (
        content.replace('href="impressum/"', 'href="__IMPRINT_URL__"')
        .replace('href="datenschutz/"', 'href="__PRIVACY_URL__"')
        .replace('href="../#kontakt"', 'href="__HOME_URL__#kontakt"')
        .replace('href="../"', 'href="__HOME_URL__"')
    )
    content = group(content, "as-site")
    (ROOT / f"wordpress/content/{name}.html").write_text(content)
# Presentation snapshot only, provenance recorded in README. Never import content scripts.
css = "\n".join(
    (ROOT / f"bordeaux/{f}").read_text()
    for f in ["styles.css", "hero-image-v2.css", "impressum.css", "datenschutz.css"]
)


def scope(m):
    selectors = m.group(1)
    if selectors.strip().startswith("@"):
        return m.group(0)
    out = []
    for s in selectors.split(","):
        s = s.strip()
        out.append(
            ".as-site"
            if s in [":root", "body"]
            else s if s == "html" else ".as-site " + s
        )
    return ",".join(out) + "{"


css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
css = re.sub(r"(?:(?<=\{)|(?<=\})|\A)([^{}]+)\{", scope, css)
(ROOT / "wordpress/theme/andreas-spricht-bordeaux/reference.css").write_text(
    "/* Scoped presentation snapshot of bordeaux/ at Phase-2 base; no content. */\n"
    + css
)

"""Tests for the Flexbox Navigation lesson."""
import os
import re

SCAFFOLDS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scaffolds')


def read(filename):
    with open(os.path.join(SCAFFOLDS, filename)) as f:
        return f.read()


def normalize(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    return re.sub(r'\s+', ' ', css).lower()


def all_blocks_for(css, selector):
    norm = normalize(css)
    result = []
    for m in re.finditer(re.escape(selector) + r'\s*\{([^}]*)\}', norm):
        result.append(m.group(1))
    return ' '.join(result)


# ── Task 1: nav display flex ──────────────────────────────────────────────────

def test_nav_display_flex():
    block = all_blocks_for(read('flexbox-nav-styles.css'), 'nav')
    assert re.search(r'display\s*:\s*flex', block), (
        "Add 'display: flex' inside the nav rule in flexbox-nav-styles.css. "
        "This turns the nav into a flex container so the items line up horizontally."
    )


# ── Task 2: justify-content ───────────────────────────────────────────────────

def test_nav_justify_content():
    block = all_blocks_for(read('flexbox-nav-styles.css'), 'nav')
    assert re.search(r'justify-content\s*:', block), (
        "Add justify-content to the nav rule in flexbox-nav-styles.css"
    )


def test_nav_justify_content_space_around():
    block = all_blocks_for(read('flexbox-nav-styles.css'), 'nav')
    assert re.search(r'justify-content\s*:\s*space-around', block), (
        "Set justify-content to 'space-around' to spread the nav items evenly"
    )


# ── Task 3: height + align-items ─────────────────────────────────────────────

def test_nav_has_height():
    block = all_blocks_for(read('flexbox-nav-styles.css'), 'nav')
    assert re.search(r'height\s*:', block), (
        "Give the nav a fixed height (e.g. height: 80px) so align-items has space to work with"
    )


def test_nav_align_items_center():
    block = all_blocks_for(read('flexbox-nav-styles.css'), 'nav')
    assert re.search(r'align-items\s*:\s*center', block), (
        "Add 'align-items: center' to vertically centre the nav text within the bar"
    )

"""Tests for the Flexbox Basics lesson."""
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
    """Return concatenated content of every { } block whose selector matches."""
    norm = normalize(css)
    result = []
    for m in re.finditer(re.escape(selector) + r'\s*\{([^}]*)\}', norm):
        result.append(m.group(1))
    return ' '.join(result)


# ── Task 1: display flex ──────────────────────────────────────────────────────

def test_section_display_flex():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'display\s*:\s*flex', block), (
        "Add 'section { display: flex; }' to flex-styles.css"
    )


# ── Task 2: justify-content ───────────────────────────────────────────────────

def test_section_justify_content():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'justify-content\s*:', block), (
        "Add 'justify-content: space-around' to your section rule in flex-styles.css"
    )


def test_section_justify_content_value():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'justify-content\s*:\s*space-around', block), (
        "Set justify-content to 'space-around' on the section element"
    )


# ── Task 3: align-items ───────────────────────────────────────────────────────

def test_section_align_items():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'align-items\s*:', block), (
        "Add 'align-items: center' to your section rule in flex-styles.css"
    )


def test_section_align_items_center():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'align-items\s*:\s*center', block), (
        "Set align-items to 'center' — this vertically centres the flex items"
    )


def test_section_has_height():
    block = all_blocks_for(read('flex-styles.css'), 'section')
    assert re.search(r'height\s*:', block), (
        "align-items: center needs a height on section to have any effect — add height: 300px"
    )

"""Tests for the CSS Float and Position lesson."""
import os
import re

SCAFFOLDS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scaffolds')


def read(filename):
    with open(os.path.join(SCAFFOLDS, filename)) as f:
        return f.read()


def normalize(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    return re.sub(r'\s+', ' ', css).lower()


def block_for(css, selector):
    """Return concatenated content of ALL { } blocks whose selector contains `selector`.
    Handles compound selectors like 'div, p' when searching for 'div'."""
    norm = normalize(css)
    result = []
    pos = 0
    while True:
        idx = norm.find(selector, pos)
        if idx == -1:
            break
        brace = norm.find('{', idx)
        if brace == -1:
            break
        close = norm.find('}', brace)
        if close == -1:
            break
        result.append(norm[brace + 1:close])
        pos = close + 1
    return ' '.join(result)


# ── Task 1: base CSS ──────────────────────────────────────────────────────────

def test_base_css_has_border():
    css = normalize(read('float-styles.css'))
    assert 'border' in css and '1px' in css and 'solid' in css and 'red' in css, (
        "Add 'border: 1px solid red' to the div, p rule in float-styles.css"
    )


def test_base_css_div_width():
    css = normalize(read('float-styles.css'))
    block = block_for(css, 'div')
    assert 'width' in block and '50px' in block, (
        "Give div a width of 50px in float-styles.css"
    )


def test_base_css_div_height():
    css = normalize(read('float-styles.css'))
    block = block_for(css, 'div')
    assert 'height' in block and '200px' in block, (
        "Give div a height of 200px in float-styles.css"
    )


def test_base_css_div_margin():
    css = normalize(read('float-styles.css'))
    block = block_for(css, 'div')
    assert 'margin' in block and '5px' in block, (
        "Give div a margin of 5px in float-styles.css"
    )


# ── Task 2: HTML float classes ────────────────────────────────────────────────

def test_float_html_left_classes():
    html = read('float-index.html').lower()
    left_count = len(re.findall(r'class=["\']left["\']', html))
    assert left_count >= 2, (
        f"Expected at least 2 divs with class='left', found {left_count}. "
        "Add class=\"left\" to the first two <div> elements in float-index.html."
    )


def test_float_html_right_class():
    html = read('float-index.html').lower()
    assert re.search(r'class=["\']right["\']', html), (
        "Add class=\"right\" to the third <div> element in float-index.html."
    )


# ── Task 3: float CSS rules ───────────────────────────────────────────────────

def test_float_left_rule():
    css = read('float-styles.css')
    block = block_for(css, '.left')
    assert re.search(r'float\s*:\s*left', block), (
        "Add a .left rule with 'float: left' to float-styles.css"
    )


def test_float_right_rule():
    css = read('float-styles.css')
    block = block_for(css, '.right')
    assert re.search(r'float\s*:\s*right', block), (
        "Add a .right rule with 'float: right' to float-styles.css"
    )

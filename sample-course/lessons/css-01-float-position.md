---
id: css-01-float-position
title: CSS Float and Position
language: css
releaseDate: "2026-01-01"
prerequisites: []
---

# CSS Float and Position

Before we tackle Flexbox, we need to understand why it was invented. The older tools — `float` and `position` — were used for layout long before Flexbox existed. Understanding their behaviour makes it clear what problem Flexbox solves.

Open `float-index.html` in the preview to see where we start: three numbered `<div>` elements and a paragraph, all stacked vertically. This is **normal flow** — block elements stack top to bottom by default.

## Task 1 — Add base styles

First we give the elements a visible size and border so we can see what's happening as we experiment.

Open `float-styles.css` and add the following:

```css
div, p {
    border: 1px solid red;
}

div {
    margin: 5px;
    width: 50px;
    height: 200px;
}
```

Save the file (`Cmd+S`) then click **Run tests** to check.

::: task id=base-css kind=scaffold marking=auto
**Add base CSS rules to `float-styles.css` giving `div` a `border`, `width: 50px`, `height: 200px`, and `margin: 5px`.**

scaffold: scaffolds/float-styles.css
validator: python3 -m pytest tests/test_css_float.py::test_base_css_has_border tests/test_css_float.py::test_base_css_div_width tests/test_css_float.py::test_base_css_div_height tests/test_css_float.py::test_base_css_div_margin -v
:::

## Task 2 — Add float classes to the HTML

Now tell the browser which elements should float. Floated elements are pulled out of normal flow and pushed left or right, letting other content wrap around them.

Edit `float-index.html` and add CSS classes to the three `<div>` elements:

```html
<div class="left">1</div>
<div class="left">2</div>
<div class="right">3</div>
```

Save then run the tests.

::: task id=float-html-classes kind=scaffold marking=auto
**Add `class="left"` to the first two `<div>` elements and `class="right"` to the third in `float-index.html`.**

scaffold: scaffolds/float-index.html
validator: python3 -m pytest tests/test_css_float.py::test_float_html_left_classes tests/test_css_float.py::test_float_html_right_class -v
:::

## Task 3 — Write the float CSS rules

Adding a class to the HTML doesn't do anything on its own — we need CSS rules that use those classes to apply the float property.

Add these rules to the bottom of `float-styles.css`:

```css
.left {
    float: left;
}

.right {
    float: right;
}
```

After saving, divs 1 and 2 should sit side-by-side on the left and div 3 should jump to the far right. Notice how the paragraph text wraps underneath — this is the defining behaviour of floats, and also why they cause problems at page-layout scale.

::: task id=float-css-rules kind=scaffold marking=auto
**Add `.left { float: left; }` and `.right { float: right; }` rules to `float-styles.css`.**

scaffold: scaffolds/float-styles.css
validator: python3 -m pytest tests/test_css_float.py::test_float_left_rule tests/test_css_float.py::test_float_right_rule -v
:::

## What you've seen

- Block elements follow **normal flow** by default (top to bottom).
- `float` pulls an element out of flow and lets content wrap around it.
- Floats were widely misused for full-page layouts before Flexbox existed — they were never designed for that.

Move on to the next lesson to meet the tool that replaced them.

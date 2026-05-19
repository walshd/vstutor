---
id: css-02-flexbox-basics
title: Flexbox Basics
language: css
releaseDate: "2026-01-01"
prerequisites: [css-01-float-position]
---

# Flexbox Basics

Flexbox — the Flexible Box Module — is a CSS layout model designed for distributing space and aligning items in one dimension at a time (either a row or a column).

The Mozilla Foundation defines it well:

> *"Flexbox was designed as a one-dimensional layout model and as a method that could offer space distribution between items in an interface and powerful alignment capabilities."*

We will work with `flex-index.html` and `flex-styles.css`. Open `flex-styles.css` — you will see the same base styles from the previous lesson are already in place. Your job is to add three Flexbox properties, one task at a time.

## Task 1 — Turn the section into a flex container

Flexbox always starts by declaring a **flex container** — the parent element. Add a `section` rule to `flex-styles.css`:

```css
section {
    display: flex;
}
```

This single line causes all direct children of `<section>` (the three divs and the paragraph) to become **flex items** that arrange themselves in a row.

::: task id=display-flex kind=scaffold marking=auto
**Add `section { display: flex; }` to `flex-styles.css`.**

scaffold: scaffolds/flex-styles.css
validator: python3 -m pytest tests/test_css_flexbox.py::test_section_display_flex -v
:::

## Task 2 — Distribute items with justify-content

Right now the items are packed against the left edge. `justify-content` controls how leftover space is distributed **along the main axis** (horizontal, in our case).

Add `justify-content: space-around` to your `section` rule:

```css
section {
    display: flex;
    justify-content: space-around;
}
```

`space-around` puts equal space on both sides of each item. Other values worth trying: `space-between`, `center`, `flex-end`.

::: task id=justify-content kind=scaffold marking=auto
**Add `justify-content: space-around` to the `section` rule in `flex-styles.css`.**

scaffold: scaffolds/flex-styles.css
validator: python3 -m pytest tests/test_css_flexbox.py::test_section_justify_content tests/test_css_flexbox.py::test_section_justify_content_value -v
:::

## Task 3 — Centre items vertically with align-items

`align-items` controls alignment on the **cross axis** (vertical, in our case). To see it work, the container needs a height that is taller than its content.

Update the `section` rule:

```css
section {
    display: flex;
    justify-content: space-around;
    height: 300px;
    align-items: center;
}
```

The items should now be vertically centred within the 300px container.

::: task id=align-items kind=scaffold marking=auto
**Add `height: 300px` and `align-items: center` to the `section` rule in `flex-styles.css`.**

scaffold: scaffolds/flex-styles.css
validator: python3 -m pytest tests/test_css_flexbox.py::test_section_align_items tests/test_css_flexbox.py::test_section_align_items_center tests/test_css_flexbox.py::test_section_has_height -v
:::

## What you've seen

| Property | Controls |
|---|---|
| `display: flex` | Turns the element into a flex container |
| `justify-content` | Distributes space along the main axis (row) |
| `align-items` | Aligns items on the cross axis (column) |
| `flex-direction` | Switches between row (default) and column |

In the next lesson you will apply this to a real navigation bar.

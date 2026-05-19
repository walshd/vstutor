---
id: css-03-flexbox-nav
title: Flexbox Navigation Bar
language: css
releaseDate: "2026-01-01"
prerequisites: [css-02-flexbox-basics]
---

# Flexbox Navigation Bar

Time to apply what you have learned to a real component you will build many times in your career — a navigation bar.

Open `flexbox-nav.html`. You will see a `<nav>` containing three `<p>` tags (Home, About, Contact). As it stands the items stack vertically in normal flow.

Open `flexbox-nav-styles.css` alongside it. The base styles are already there: a black border on the nav and coloured backgrounds on each item. Your job is to add three Flexbox properties to make it a proper horizontal navigation bar.

## Task 1 — Declare the flex container

**Always declare the flex container first.** This gives you all the default flex behaviour immediately and avoids writing redundant code.

The `<nav>` is the parent of the three `<p>` items, so it becomes the flex container. Add `display: flex` inside the existing `nav` rule:

```css
nav {
    border: 5px solid #000000;
    display: flex;
}
```

Save (`Cmd+S`) and run the tests. The three items should now be in a horizontal row.

::: task id=nav-display-flex kind=scaffold marking=auto
**Add `display: flex` to the `nav` rule in `flexbox-nav-styles.css`.**

scaffold: scaffolds/flexbox-nav-styles.css
validator: python3 -m pytest tests/test_css_flexbox_nav.py::test_nav_display_flex -v
:::

## Task 2 — Space the items out

The items are currently packed to the left. Use `justify-content: space-around` to spread them evenly across the nav bar:

```css
nav {
    border: 5px solid #000000;
    display: flex;
    justify-content: space-around;
}
```

::: task id=nav-justify-content kind=scaffold marking=auto
**Add `justify-content: space-around` to the `nav` rule in `flexbox-nav-styles.css`.**

scaffold: scaffolds/flexbox-nav-styles.css
validator: python3 -m pytest tests/test_css_flexbox_nav.py::test_nav_justify_content tests/test_css_flexbox_nav.py::test_nav_justify_content_space_around -v
:::

## Task 3 — Set a height and centre the text vertically

A typical navigation bar has a fixed height. Give the nav an explicit height, then use `align-items: center` to vertically centre the link text within that height:

```css
nav {
    border: 5px solid #000000;
    display: flex;
    justify-content: space-around;
    height: 80px;
    align-items: center;
}
```

::: task id=nav-align-items kind=scaffold marking=auto
**Add `height: 80px` and `align-items: center` to the `nav` rule in `flexbox-nav-styles.css`.**

scaffold: scaffolds/flexbox-nav-styles.css
validator: python3 -m pytest tests/test_css_flexbox_nav.py::test_nav_has_height tests/test_css_flexbox_nav.py::test_nav_align_items_center -v
:::

## What you have built

You now have a fully functional horizontal navigation bar controlled entirely by three Flexbox properties. Compare this to what float-based navigation required — extra clearfix hacks, negative margins, and fragile width calculations.

## Going further (optional)

If you finish early, try these extensions in `flexbox-nav-styles.css`:

- Change `justify-content` to `flex-end` — what happens?
- Add `margin-left: auto` to only the last `<p>` — what does that push to the right?
- Try `flex-direction: column` on the nav — when would that be useful?

Mozilla also has an interactive Flexbox skills testbed worth bookmarking.

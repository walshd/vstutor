---
id: py-01-hello
title: Hello World
language: python
releaseDate: "2026-01-01"
---

# Hello World

Every programming journey begins with a function that greets the world.

In Python, a function is defined with the `def` keyword:

```python
def my_function():
    return "something"
```

Call it by writing its name followed by parentheses:

```python
result = my_function()
print(result)  # "something"
```

## Why functions?

Functions package behaviour so it can be reused and tested. Even a simple
`say_hello()` teaches you the three parts of every function:

- the **name** — how you call it
- the **parameters** — data you pass in (none here)
- the **return value** — data you get back

## Your task

Open the scaffold file, replace `pass` with a `return` statement, then click
**Run tests** to check your work.

::: task id=say-hello kind=scaffold marking=auto
**Write a function `say_hello()` that returns the string `"Hello, World!"`.**

The function takes no arguments. The return value must be exactly the string
`"Hello, World!"` — capital H, capital W, comma, space, exclamation mark.

scaffold: scaffolds/hello.py
validator: python3 -m pytest tests/test_hello.py -v
:::

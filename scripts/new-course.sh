#!/usr/bin/env bash
# Usage: ./scripts/new-course.sh CIS1234 "Course Title" git@github.com:walshd/CIS1234.git
# Creates a ready-to-push course repo directory at ~/Repositories/<courseId>

set -e

COURSE_ID="${1:?Usage: $0 COURSE_ID 'Course Name' git@github.com:org/repo.git}"
COURSE_NAME="${2:?Usage: $0 COURSE_ID 'Course Name' git@github.com:org/repo.git}"
REMOTE="${3:-}"
DEST="$HOME/Repositories/$COURSE_ID"

if [ -d "$DEST" ]; then
  echo "Error: $DEST already exists" >&2
  exit 1
fi

mkdir -p "$DEST"/{lessons,scaffolds,tests}

cat > "$DEST/tutor.config.json" <<JSON
{
  "courseId": "$COURSE_ID",
  "courseName": "$COURSE_NAME",
  "releaseMode": "date"
}
JSON

cat > "$DEST/.gitignore" <<IGNORE
__pycache__/
.pytest_cache/
.mypy_cache/
*.pyc
.DS_Store
IGNORE

cat > "$DEST/lessons/week01-01-example.md" <<MD
---
id: week01-01-example
title: Example Lesson
language: python
releaseDate: "$(date +%Y-%m-%d)"
prerequisites: []
---

# Example Lesson

Replace this with your lesson content.

::: task id=example-task kind=scaffold marking=auto
**Task description goes here.**

scaffold: scaffolds/example.py
validator: python3 -m pytest tests/test_example.py::test_example -v
:::
MD

cat > "$DEST/scaffolds/example.py" <<PY
def example():
    # TODO: implement this function
    pass
PY

cat > "$DEST/tests/test_example.py" <<PY
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scaffolds.example import example

def test_example():
    assert example() is not None, "Function should return something other than None"
PY

cd "$DEST"
git init
git add .
git commit -m "Scaffold: $COURSE_NAME"

if [ -n "$REMOTE" ]; then
  git remote add origin "$REMOTE"
  git push -u origin main
  echo ""
  echo "Pushed to $REMOTE"
fi

echo ""
echo "Course created at $DEST"
echo "Next steps:"
echo "  1. Edit lessons/, scaffolds/, tests/"
echo "  2. Set releaseDate in each lesson's frontmatter"
echo "  3. git push  (or pass the remote URL as the 3rd argument next time)"

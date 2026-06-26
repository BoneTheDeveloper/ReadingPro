HEAD_REPO="repo"
BASE_REPO="repo"
HEAD_BRANCH="preview-12345"
if [ "$HEAD_REPO" != "$BASE_REPO" ] || [[ "$HEAD_BRANCH" != preview* ]]; then
  echo "Failed"
else
  echo "Passed"
fi

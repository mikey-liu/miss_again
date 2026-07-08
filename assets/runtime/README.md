# Runtime Image Assets

These images are sliced from the approved concept boards in `assets/concepts`.

Regenerate them with:

```bash
python scripts/slice_runtime_assets.py
```

The game renderer loads this directory directly. Concept boards remain useful for review, but runtime code should not depend on full board images.

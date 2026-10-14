# SlickNet

Satellite imagery machine learning project scaffold.

## Windows setup

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

CPU PyTorch is used for local development. Training is not part of this setup.
Keep satellite datasets in data/ (ignored by Git), and never commit large datasets.

## Structure

- notebooks/: exploration and training notebooks
- src/: dataset, model, losses, metrics, and inference modules
- backend/: backend entry point
- frontend/: reserved for the future Next.js app
- models/: local model weights (PT/PTH files ignored)
- outputs/: generated results

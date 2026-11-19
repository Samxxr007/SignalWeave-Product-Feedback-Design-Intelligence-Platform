Set-Location d:\Projects\Personal\SignalWeave\backend
Write-Host "Starting SignalWeave Backend on http://localhost:8000" -ForegroundColor Green
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

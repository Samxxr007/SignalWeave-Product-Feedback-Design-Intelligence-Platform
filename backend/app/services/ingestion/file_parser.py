import io
import pandas as pd
from typing import Tuple, Optional, List

try:
    import chardet
except ImportError:
    try:
        import charset_normalizer as chardet
    except ImportError:
        chardet = None


def parse_file(file_content: bytes, filename: str) -> Tuple[Optional[pd.DataFrame], List[str], Optional[str]]:
    """
    Parse CSV, Excel, or JSON file content.
    Returns (DataFrame, detected_columns, error_or_none)
    """
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''

    try:
        if ext in ('csv', 'txt'):
            # Auto-detect encoding
            encoding = 'utf-8'
            if chardet is not None:
                detected = chardet.detect(file_content)
                encoding = detected.get('encoding') or 'utf-8'

            # Strip BOM if present
            if file_content.startswith(b'\xef\xbb\xbf'):
                file_content = file_content[3:]
                encoding = 'utf-8'

            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, encoding_errors='replace')
            except Exception:
                df = pd.read_csv(io.BytesIO(file_content), encoding='utf-8', encoding_errors='replace')

        elif ext in ('xlsx', 'xls'):
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')

        elif ext == 'json':
            import json
            data = json.loads(file_content.decode('utf-8', errors='replace'))
            if isinstance(data, list):
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                if 'records' in data:
                    df = pd.DataFrame(data['records'])
                elif 'data' in data:
                    df = pd.DataFrame(data['data'])
                else:
                    df = pd.DataFrame([data])
            else:
                return None, [], "Unsupported JSON structure"
        else:
            return None, [], f"Unsupported file extension: {ext}"

        # Clean column names
        df.columns = [str(c).strip() for c in df.columns]
        detected_columns = list(df.columns)
        return df, detected_columns, None

    except Exception as e:
        return None, [], str(e)

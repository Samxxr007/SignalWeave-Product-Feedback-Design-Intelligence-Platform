import re
import html


def clean_text(text: str) -> dict:
    original = text
    # Strip HTML entities and tags
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', ' ', text)
    # Remove URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)
    # Normalize apostrophes
    text = text.replace('\u2019', "'").replace('\u2018', "'")
    # Remove special chars except apostrophes, periods, commas, exclamation, question, hyphen
    text = re.sub(r"[^a-zA-Z0-9\s'.,!?-]", ' ', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    operations = ["html_stripped", "url_removed", "special_chars_removed", "whitespace_normalized"]
    return {"original": original, "cleaned": text, "operations": operations}

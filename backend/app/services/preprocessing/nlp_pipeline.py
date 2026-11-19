import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

STOP_WORDS = set(stopwords.words('english')) | {'product', 'item', 'one', 'bought', 'get', 'got'}
lemmatizer = WordNetLemmatizer()


def process_text(cleaned_text: str) -> dict:
    tokens = word_tokenize(cleaned_text.lower())
    operations = ["tokenized"]

    tokens_no_stop = [t for t in tokens if t.isalpha() and t not in STOP_WORDS and len(t) > 2]
    operations.append("stopwords_removed")

    lemmatized = [lemmatizer.lemmatize(t) for t in tokens_no_stop]
    operations.append("lemmatized")

    return {
        "tokens": tokens,
        "tokens_filtered": tokens_no_stop,
        "lemmatized": lemmatized,
        "keywords": lemmatized[:20],
        "operations": operations,
        "word_count": len(tokens),
        "processed_word_count": len(lemmatized),
    }

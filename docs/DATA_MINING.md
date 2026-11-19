# SignalWeave Data Mining Algorithms & Methodology
## Technical Implementation, Hyperparameters, Rationale & Limitations

SignalWeave covers Module 4 (Text Mining & Pattern Discovery) of the CSA1606 curriculum by combining supervised and unsupervised learning algorithms:

```
                                  +---------------------------------------+
                                  |         Raw Preprocessed Text         |
                                  +-------------------+-------------------+
                                                      |
                 +------------------------------------+------------------------------------+
                 |                                                                         |
                 v                                                                         v
+----------------------------------+                                      +----------------------------------+
|      Lexical & Rule-Based        |                                      |      Vector Space Modeling       |
|                                  |                                      |                                  |
| 1. VADER Sentiment Analysis      |                                      | TF-IDF Vectorizer                |
|    - Lexicon + Heuristics        |                                      | - sublinear_tf=True              |
| 2. Aspect Extraction             |                                      | - min_df=3, max_df=0.85          |
|    - Seed Dictionary & POS       |                                      | - ngram_range=(1, 2)             |
| 3. Linguistic Regex Patterns     |                                      +-----------------+----------------+
|    - Feature Requests            |                                                        |
+----------------------------------+                                +-----------------------+-----------------------+
                                                                    |                                               |
                                                                    v                                               v
                                                   +---------------------------------+             +---------------------------------+
                                                   |     Topic Discovery (NMF)       |             |     Partitioning (K-Means)      |
                                                   |                                 |             |                                 |
                                                   | - Non-Negative Matrix Fact.     |             | - k-means++ initialization      |
                                                   | - Frobenius norm loss           |             | - n_init=10, max_iter=300       |
                                                   | - Coherence & Keyword ranking   |             | - Silhouette Score validation   |
                                                   +---------------------------------+             +---------------------------------+
                                                                                                                    |
                                                                                                                    v
                                                                                                   +---------------------------------+
                                                                                                   |   Association Rules (Apriori)   |
                                                                                                   |                                 |
                                                                                                   | - Aspect transaction matrix     |
                                                                                                   | - Min Support / Min Confidence  |
                                                                                                   | - Lift correlation metric       |
                                                                                                   +---------------------------------+
```

---

## 1. Sentiment Analysis: VADER Lexicon

### Algorithm & Rationale
VADER (Valence Aware Dictionary and sEntiment Reasoner) is chosen over black-box deep learning for feedback mining because:
- It requires no domain re-training and runs deterministically with near-zero latency.
- It incorporates syntactic and grammatical rules:
  - **Punctuation amplification** (e.g., "Great!!!" has higher intensity than "Great").
  - **Capitalization emphasis** (e.g., "AMAZING" vs "amazing").
  - **Degree adverbs / intensifiers** (e.g., "extremely bad", "barely functional").
  - **Contrastive conjunction handling** (e.g., "The sound is good, BUT the app crashes").

### Thresholding Strategy
Standard academic cutoffs are applied to compound scores ($S \in [-1.0, 1.0]$):
- **Positive**: $S \ge +0.05$
- **Neutral**: $-0.05 < S < +0.05$
- **Negative**: $S \le -0.05$

### Limitations
- Can misclassify subtle irony or domain-specific technical praise (e.g., "dead quiet" background noise in ANC headphones).

---

## 2. Topic Modeling: TF-IDF + NMF

### Algorithm & Rationale
Non-Negative Matrix Factorization (NMF) decomposes the term-document matrix $V \approx W \times H$:
- $V \in \mathbb{R}_{\ge 0}^{n \times m}$ (Documents $\times$ Terms)
- $W \in \mathbb{R}_{\ge 0}^{n \times k}$ (Document-Topic loadings)
- $H \in \mathbb{R}_{\ge 0}^{k \times m}$ (Topic-Term distributions)

Why NMF over Latent Dirichlet Allocation (LDA) for this capstone:
- NMF provides significantly crisper, non-overlapping topic interpretations on short customer feedback documents.
- NMF is deterministic and converges faster than Gibbs-sampled LDA.

### Hyperparameters
- `sublinear_tf=True`: Applies logarithmic term frequency scaling ($1 + \ln(\text{tf})$) to dampen repeated words.
- `max_df=0.85`: Excludes ubiquitous domain terms.
- `min_df=3`: Filters out rare typos and hapax legomena.
- `ngram_range=(1, 2)`: Captures meaningful bigrams (e.g., "battery drain", "customer service").
- `n_components`: Configurable from 3 to 10 (default 5).

---

## 3. Document Clustering: K-Means with Silhouette Validation

### Algorithm & Rationale
K-Means partitions documents into $k$ disjoint clusters minimizing within-cluster sum of squares (WCSS):

$$\arg\min_S \sum_{i=1}^k \sum_{x \in S_i} ||x - \mu_i||^2$$

### Implementation Details
- **Initialization**: `k-means++` to avoid sub-optimal local minima.
- **Centroid Labeling**: Top TF-IDF terms closest to each cluster center $\mu_i$ are extracted to provide human-readable cluster themes.
- **Evaluation**: The Silhouette Coefficient $s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$ is computed across all samples to provide objective cluster validity metrics.

### Limitations
- Assumes spherical, equally-sized clusters in Euclidean space.
- Sparse high-dimensional text vectors can suffer from the curse of dimensionality; TF-IDF dimension capping (`max_features=1000`) mitigates this.

---

## 4. Association Rule Mining: Apriori

### Algorithm & Rationale
Customer complaints often co-occur (e.g., users complaining about battery drain simultaneously report device overheating). SignalWeave uses the Apriori algorithm via `mlxtend` to find actionable associations across extracted aspects and categories.

### Transaction Representation
Each review is treated as a transaction $T$, containing the set of detected negative aspects:
$$T_j = \{\text{aspect}_a, \text{aspect}_b, \dots\}$$

### Metrics & Formulas
1. **Support**:
   $$\text{Support}(A \implies B) = P(A \cup B) = \frac{\text{Count}(A \cup B)}{|D|}$$
2. **Confidence**:
   $$\text{Confidence}(A \implies B) = P(B \mid A) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)}$$
3. **Lift**:
   $$\text{Lift}(A \implies B) = \frac{\text{Confidence}(A \implies B)}{\text{Support}(B)} = \frac{P(A \cap B)}{P(A) \cdot P(B)}$$
   - $\text{Lift} > 1.0$: Indicates a positive correlation (aspect $A$ and aspect $B$ co-occur far more frequently than expected by chance).

### Hyperparameters
- `min_support`: Default 0.03 (3% of reviews).
- `min_confidence`: Default 0.25 (25% conditional probability).
- `min_lift`: Filtered for rules with $\text{Lift} > 1.1$.

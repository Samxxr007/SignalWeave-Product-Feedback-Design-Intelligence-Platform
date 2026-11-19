# SignalWeave Innovation Layer
## Detailed Technical Specification & Academic Methodology

SignalWeave builds upon classical data warehousing and data mining techniques (CSA1606) by introducing five advanced analytical innovations. These capabilities transform raw warehouse facts and text mining outputs into operational product engineering decisions.

---

### 1. Product Pain Index (PPI)

#### Concept & Motivation
Traditional feedback dashboards report basic average ratings or negative review counts. This is flawed:
- A product with 10 reviews (all 1-star) appears identically problematic to one with 10,000 reviews (all 1-star), ignoring blast radius and volume.
- Old historical complaints dilute recent product regressions.
- Raw rating averages fail to capture sentiment intensity in text.

The **Product Pain Index (PPI)** provides a normalized, mathematically transparent 0–100 score indicating urgent engineering attention.

#### Mathematical Formulation
The PPI is computed as a weighted linear combination of four normalized sub-indicators:

$$\text{PPI} = 100 \times \left( w_{\text{neg}} \cdot N + w_{\text{vol}} \cdot V + w_{\text{rec}} \cdot R + w_{\text{drop}} \cdot D \right)$$

Subject to constraint:
$$w_{\text{neg}} + w_{\text{vol}} + w_{\text{rec}} + w_{\text{drop}} = 1.0 \quad (w_i \ge 0)$$

Default weights:
- $w_{\text{neg}} = 0.35$ (Negative Feedback Ratio)
- $w_{\text{vol}} = 0.25$ (Normalized Complaint Volume)
- $w_{\text{rec}} = 0.25$ (Temporal Recency Decay Factor)
- $w_{\text{drop}} = 0.15$ (Rating Degradation Factor)

#### Sub-indicator Definitions:
1. **Negative Feedback Ratio ($N$)**:
   $$N = \frac{\text{Count of reviews with negative sentiment (compound } < -0.05\text{)}}{\text{Total reviews for product}}$$
2. **Normalized Complaint Volume ($V$)**:
   Log-scaled to prevent extreme volume outliers from dominating:
   $$V = \frac{\ln(1 + \text{negative\_reviews})}{\ln(1 + \max(\text{negative\_reviews across all products}))}$$
3. **Temporal Recency Decay Factor ($R$)**:
   Exponential decay weighting recent complaints more heavily:
   $$R = \frac{1}{|K_{\text{neg}}|} \sum_{i \in K_{\text{neg}}} e^{-\lambda \cdot \Delta t_i}$$
   where $\Delta t_i$ is age in days, and half-life is typically calibrated to 30 days ($\lambda = \frac{\ln 2}{30}$).
4. **Rating Degradation Factor ($D$)**:
   Measures divergence from max rating:
   $$D = \frac{5.0 - \overline{\text{Rating}}}{4.0}$$

#### Limitations & Boundary Cases
- **Cold start**: When a product has $< 5$ reviews, PPI is clamped or flagged as low-confidence to prevent small sample size bias.
- **Extreme volumes**: Log-normalization flattens differences between massive enterprise products.

---

### 2. Aspect-Based Sentiment Intelligence (ABSI)

#### Concept & Motivation
Document-level sentiment models miss granular product nuance (e.g., "The camera is stunning, but the battery life is appalling" scores neutral overall). ABSI decomposes customer statements into feature-level evaluations mapped to a curated taxonomy of 10 standard hardware and software aspects.

#### Algorithm Architecture
1. **Sentence Boundary Disambiguation**: Text is split into discrete propositional clauses using NLTK sentence tokenization.
2. **Aspect Taxonomy Mapping**: Seed dictionary of aspect keywords with lemmatized synonyms and n-grams:
   - `battery`: battery, charge, charging, power, drain, mah, runtime
   - `performance`: speed, lag, freeze, crash, stutter, processor, latency, cpu
   - `build_quality`: hinge, glass, plastic, durability, scratch, dent, creak
   - `sound_quality`: audio, speaker, bass, treble, volume, mic, noise
   - `display`: screen, brightness, oled, resolution, glare, pixel
   - `connectivity`: wifi, bluetooth, pairing, disconnect, cellular, signal
   - `camera`: lens, photo, video, zoom, sensor, shutter, low-light
   - `price_value`: expensive, affordable, worth, price, cost, rip-off
   - `comfort`: fit, ergonomic, heavy, lightweight, ear, wrist, strap
   - `customer_support`: warranty, rma, agent, representative, refund, replacement
3. **Targeted Sentiment Assignment**: Sentence-level VADER compound scoring evaluates only the clause mentioning the aspect keyword.
4. **Aggregation**: Fact entries recorded in `fact_aspect_sentiment` enable multidimensional OLAP slicing across aspects, time, and products.

#### Limitations
- Rule-based keyword matching cannot detect complex implicit aspects (e.g., "It slips right out of my hands" implies grip/ergonomics without mentioning "comfort").
- Sarcasm and double negatives across clause boundaries can mislead lexical scorers.

---

### 3. Emerging Complaint Radar

#### Concept & Motivation
Sudden product defects (e.g., a buggy firmware update, defective batch of hinges) must be identified before they accumulate high aggregate totals. The Emerging Complaint Radar tracks acceleration rather than raw volume.

#### Methodology & Mathematical Formulation
The algorithm utilizes dual sliding time windows:
- **Evaluation Window ($W_e$)**: Last 14 days (configurable 7–30 days).
- **Baseline Window ($W_b$)**: Preceding period of equal duration (14 days prior).

For each product and aspect:
1. **Complaint Frequency**:
   $$f_e = \frac{C_e}{|W_e|}, \quad f_b = \frac{C_b}{|W_b|}$$
2. **Velocity Multiplier ($M$)**:
   $$M = \frac{C_e}{\max(C_b, 1)}$$
3. **Statistical Significance Guard**:
   To eliminate false alarms caused by Poisson noise (e.g., jumping from 1 complaint to 3 complaints):
   - Threshold requirement: $C_e \ge C_{\text{min}}$ (typically $\ge 5$).
   - Absolute percentage surge: $\Delta \% = \frac{C_e - C_b}{C_b + 1} \times 100\%$.
   - Flagged as `EMERGING_CRITICAL` if $M \ge 2.5$ and $C_e \ge 5$.
   - Flagged as `EMERGING_WARNING` if $1.5 \le M < 2.5$ and $C_e \ge 3$.
   - Flagged as `INSUFFICIENT_DATA` if baseline or evaluation counts fall below sample minimums.

---

### 4. Feature Request Intelligence

#### Concept & Motivation
Customer reviews frequently contain explicit suggestions and wishlist items alongside complaints. Traditional sentiment and topic models treat these as noise. Feature Request Intelligence extracts actionable product requests using linguistic pattern matching paired with human-in-the-loop analyst confirmation.

#### Linguistic Extraction Patterns
SignalWeave scans feedback text using compiled regular expression heuristics:
- `wish / if only`: `(I wish (that)?|if only|would be great if|it would be nice if)\s+([^.,;!?]+)`
- `please add / implement`: `(please (add|include|support|implement)|bring back)\s+([^.,;!?]+)`
- `needs / missing`: `(needs (a|an|to have)?|lacks|missing|does not have (a|an)?)\s+([^.,;!?]+)`
- `suggestion / idea`: `(my suggestion is|would love to see|hope you can add)\s+([^.,;!?]+)`

#### Workflow & Analyst Curation
1. Extracted phrases are matched against product dimensions and stored in `feature_requests` with status `pending`.
2. Analysts inspect snippets in the Feature Request Intelligence Studio.
3. Review actions: `confirmed`, `rejected`, or `assigned_theme`.
4. High-frequency confirmed themes feed directly into the Product Opportunity Matrix.

---

### 5. Product Roadmap Simulator

#### Concept & Motivation
Product managers often struggle to justify refactoring or bug fixes against new feature work. The Roadmap Simulator is an evidence-backed what-if decision engine that estimates the quantitative business impact of resolving specific aspect complaints.

#### Simulation Model
1. **User Action**: The analyst selects target aspects to "fix" (e.g., resolve `battery` issues for Product X by $70\%$).
2. **Remediation Calibration**:
   - Remediation Rate ($\alpha \in [0.1, 1.0]$): Proportion of negative aspect mentions resolved.
   - Effort Estimation: Low (1 pt / 2 weeks), Medium (3 pts / 6 weeks), High (5 pts / 12 weeks), or custom story points.
3. **Simulated State Computation**:
   - Adjusted negative review count:
     $$K'_{\text{neg}} = K_{\text{neg}} - (\alpha \cdot K_{\text{aspect\_neg}})$$
   - Projected average rating:
     $$\overline{\text{Rating}}' = \frac{\sum R_i + \alpha \cdot \sum_{j \in \text{fixed}} (4.0 - R_j)}{\text{Total Reviews}}$$
   - Projected Product Pain Index: Recomputed through the full PPI formula using projected parameters.
4. **ROI / Efficiency Ratio**:
   $$\text{Efficiency} = \frac{\Delta \text{PPI}}{\text{Total Effort Points}}$$
   Enables ranking scenarios by highest customer sentiment recovery per engineering unit of effort.

---

### Academic Integrity & Synthetic Data Statement
All models and logic documented here are implemented in production Python/SQL/TypeScript code within SignalWeave. All demonstration data utilized in tests and live demos is generated synthetically (`is_synthetic=true`) using realistic domain distributions to uphold academic research standards.

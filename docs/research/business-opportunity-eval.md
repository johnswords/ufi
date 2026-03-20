# Brainstorming the business opportunity for this app

---

## My read (GPT-5.4 Pro)

There is a real business here, but the winning first product is narrower than the pitch. I would not start with a generic black-box “surgical approval predictor.” I would start with an **orthopedic pre-submission documentation readiness engine** that keeps raw notes local, extracts a rigid structured schema, and shows staff exactly which criteria appear met, missing, or ambiguous. Prior authorization pain is clearly large enough to fund a business: AMA says practices complete about **39 prior authorizations per physician per week**, and MGMA says **92%** of medical groups reported hiring or reassigning staff to handle prior auth workload. ([American Medical Association][1])

Your on-prem design is **genuinely strong**, but it is **not** a magic HIPAA escape hatch. HHS says that merely selling software does **not** make a vendor a business associate if the vendor does not access PHI. HHS also says that if a vendor creates, receives, maintains, or transmits ePHI—**including cloud “no-view” storage of encrypted ePHI**—that vendor is in business associate territory. ([HHS.gov][2])

### What I think is solid, what is shaky, and what needs counsel

* **Solid:** local note processing plus a strict outbound schema can materially shrink your HIPAA surface area. HHS’s software-vendor guidance supports that basic architecture. ([HHS.gov][3])
* **Shaky:** “we removed names, dates, and MRNs, so we’re outside HIPAA” is too naive. HHS de-identification guidance allows only two routes—**Safe Harbor** and **Expert Determination**—and Safe Harbor still requires removal of the prescribed identifiers plus **no actual knowledge** that the remaining data can identify a person. ([HHS.gov][4])
* **Needs counsel:** your exact outbound schema, support workflow, incident handling, and contract language. That is where this design either stays clean or quietly becomes a BA model in practice. ([HHS.gov][5])

---

## 1. Business model and value proposition

### Ideal first customer

My ranking:

1. **Independent orthopedic groups / ortho MSOs**
   Best first buyer. They own the note quality problem, feel the scheduling pain directly, and are faster than hospitals.

2. **Ortho-heavy ASC chains**
   Strong economics, but they often depend on surgeon-office notes upstream, so they are slightly farther from the root input.

3. **Ortho-focused RCM firms**
   Best as a channel after you have proof. They feel denial pain, but they do not always control the clinical note quality or local deployment environment.

4. **Hospitals / health systems**
   Valuable later, but slower procurement, more integration politics, and more security review.

5. **Payer-side**
   Different product, different incentives, harder buyer, crowded by incumbents.

### Pricing

I would use a **hybrid model**, not pure SaaS and not pure usage:

* one-time deployment / validation fee
* annual platform fee per site or per surgeon
* usage band tied to authorization volume
* premium support / SLA tier
* optional approved hardware bundle, but I would strongly prefer **customer-provided hardware with a validated BOM** over shipping appliances yourself

Pure per-transaction makes budgeting harder for customers. Pure seat pricing ignores the fact that prior-auth value scales with volume. On-prem support costs also argue for a meaningful fixed fee.

### TAM: orthopedic-only first, broader surgery later

Using AAMC’s orthopaedic surgery count of **19,291** physicians in 2022 and **82.2% office-based practice**, the office-based orthopaedic pool is about **15,857** surgeons. At an assumed **$5k–$10k annual revenue per office-based surgeon**, that is roughly **$79M–$159M** before site fees, ASC upsell, or analytics layers. Using the ACS/AAMC figure of about **155,549 surgeons** overall as a rough outer bound, the same math becomes roughly **$778M–$1.56B** across surgical specialties. Those are rough top-down envelopes, not market-report TAMs. The practical point is: **orthopedics is a strong wedge, but probably not the forever-market unless you expand scope.** ([AAMC][6])

### What dollar pain does this solve?

Using AMA’s **39 PA requests per physician per week** benchmark, a **6-surgeon** group would handle about **12,168** PAs per year and a **10-surgeon** group about **20,280**. Using CAQH’s provider-side cost figures for prior auth, the direct administrative delta between manual and fully electronic processing is large enough to imply roughly **$63k/year** in direct admin savings for the 6-surgeon example and roughly **$105k/year** for the 10-surgeon example, before counting fewer denials, fewer resubmissions, or faster surgery scheduling. Using CAQH’s **14-minute** savings estimate, that is about **2,839** and **4,732** staff hours per year, respectively. These are illustrative averages, not ortho-specific forecasts, but they show the order of magnitude. ([American Medical Association][1])

### Does on-prem help or hurt sales?

Both.

The market evidence says the scaled incumbents are mostly **cloud/API or managed-service**. Cohere, Rhyme, Waystar, Honey, Infinitus, and Humata all publicly position around centralized platforms, payer/provider connectivity, or automation services rather than “the model runs entirely on your box.” CMS is also pushing the market toward structured prior-auth APIs, with API requirements primarily due by **January 1, 2027** for impacted payers. So on-prem is **not** the center of market gravity. But for privacy-sensitive providers, “we never see your patient data” can absolutely be a door-opener. My synthesis: **easier first meeting, harder deployment.** ([Cohere Health][7])

---

## 2. HIPAA avoidance architecture: strong idea, brittle execution

### Are you outside HIPAA if you only ship local software?

**In principle, yes. In operation, maybe not.**

HHS’s FAQ is favorable to your premise: a vendor that merely sells or provides software is **not** automatically a business associate if it does **not** access the covered entity’s PHI. But once your company needs PHI access to provide its service, you are in BA territory. That means your architecture only stays clean if your company truly never creates, receives, maintains, or transmits PHI. ([HHS.gov][3])

### Is your outbound schema safe?

Not automatically.

HHS says there are only two HIPAA de-identification paths: **Safe Harbor** and **Expert Determination**. Safe Harbor is not just “remove names, dates, and MRNs.” It also requires removal of the specified identifier classes and **no actual knowledge** that the remaining data could identify the person. A payload like **CPT + ICD-10 + plan type + clinical flags + approval outcome** may be fine in some contexts, but it can also be identifying in small cohorts, rare procedures, or narrow geographies. I would not self-certify this. I would use **Expert Determination** and design the cloud schema to be even more conservative than you think you need. ([HHS.gov][4])

Concretely, I would prefer cloud fields like:

* normalized diagnosis clusters instead of full rare ICD-10 codes where possible
* threshold flags like `pt_failed_6w = true` instead of note text
* BMI bucket or threshold flag rather than an exact value unless exactness is essential
* month or quarter bucket instead of exact dates
* no free text at all
* small-cell suppression or batching for rare combinations

### The exact places you accidentally become a BA

The common failure modes are boring, not exotic:

* remote troubleshooting on a live chart
* crash logs or telemetry that contain prompt text or note fragments
* screenshots sent to support
* cloud backups of local note data
* centralized model fine-tuning on customer notes
* a proxy/API layer that receives notes “just for inference”
* cloud storage of encrypted ePHI with no decryption key
* human review queues containing denial letters or attachments with PHI

Those are exactly the kinds of flows that turn a clean software distribution model into a PHI-processing service. ([HHS.gov][8])

### What if the customer misconfigures and PHI reaches your cloud?

Contract language helps, but it does not erase exposure after the fact. If your systems receive or maintain ePHI, HHS’s cloud guidance is the problem, not your intentions. Architecturally, I would make the cloud boundary **reject-by-default**:

* only an allowlisted schema can egress
* unknown fields are dropped and alarmed
* free-text fields are forbidden
* local PHI egress scanner runs before sync
* outbound sync is off by default
* suspected PHI gets quarantined and purged automatically
* customer sees a local error and remediation path

Contractually, you want a **responsibility matrix**, a clear prohibition on PHI export, incident notice terms, limitation of liability, and a **BAA-ready fallback** even if your go-to-market position is “we do not process PHI.” ([HHS.gov][5])

### Even outside HIPAA, other privacy rules can still matter

If you ever handle **identifiable** health data outside HIPAA workflows, other laws can bite. The FTC’s Health Breach Notification Rule applies to vendors of personal health records and related entities after breaches. Washington’s My Health My Data Act and Connecticut’s consumer health data rules extend protections to health-related data outside HIPAA, and the California Attorney General has emphasized that CMIA can apply to some health apps storing medical information. For your current B2B provider-side design, these are most relevant if your cloud ever ingests identifiable health data, or if you later add patient-facing workflows. ([Federal Trade Commission][9])

### Is there precedent for customer-side processing?

Yes, but the public precedent is mostly **automation**, not “HIPAA-free AI.” Innobot publicly describes bots operating over customer **RDP/VPN** and customer-side VMs, and it also markets HIPAA/SOC 2/BAA readiness. That tells me customer-environment deployment is commercially real. It also tells me that serious healthcare vendors often end up **BAA-capable anyway**, because support and operations get messy in real life. ([Innobot Health][10])

---

## 3. On-prem LLM technical architecture

### The right technical shape

Do **not** make the LLM the whole product.

The durable architecture is:

1. **Local deterministic preprocessing**
   CPT/ICD extraction, sectioning, medication/duration/BMI/therapy heuristics.

2. **Local schema-constrained extractor**
   Small LLM turns note text into a fixed JSON structure.

3. **Policy/contract graph**
   Separate engine maps extracted facts to payer criteria.

4. **Outcome model**
   A probabilistic layer predicts first-pass success or “needs more docs.”

5. **Local evidence trace**
   Keep note spans and PHI-bearing explanations local so humans can review the basis.

That keeps the model’s job narrow and auditable.

### Which open models fit this job?

I would benchmark these first:

* **Gemma 3** family for structured local inference and efficient deployment
* **Qwen3** family for strong instruction following and local serving options
* **Phi-4** as a compact generalist option
* **Mistral Small 3.1** if you can justify the heavier box for better quality

The reason is practical, not ideological: these models are designed or documented for local use on workstations and support the kind of constrained extraction workload you actually need. Mistral says Small 3.1 can run on a single RTX 4090 or 32 GB RAM Mac when quantized. Google’s Gemma 3 materials say the 27B int4 fits a single RTX 3090-class 24 GB card and the 12B int4 fits 8 GB laptop-class VRAM. Microsoft positions Phi-4 as a 14B small model, and Qwen’s docs support local runs via `llama.cpp`. ([Mistral AI][11])

My bias: **benchmark strong generalist small models first**, then see whether specialty tuning actually helps. I would not assume a “medical” checkpoint wins by default.

### Can this run on a $2k–$5k box?

Yes, **if** you constrain the task.

A practical target is a validated workstation with:

* 64–128 GB RAM
* fast NVMe
* a 12–24 GB consumer GPU
* containerized local serving stack
* no attempt to run giant frontier models

That budget is plenty for a narrow **note-to-JSON extractor**. It is not enough if you expect frontier-model behavior across long, messy chart bundles.

### Latency and throughput

For a fixed-schema extraction task, **under 10 seconds per note is a realistic engineering target** on a consumer-GPU workstation. I would not promise it until you benchmark on real note lengths and real prompts, but it is plausible. A single device should comfortably support a typical specialty group’s prior-auth volume because the workload is bursty and low-frequency relative to generic chatbot traffic.

### Updating models without pulling data back

Use **signed container and model packages**, customer-initiated pulls, staged rollout rings, and a non-PHI health-check channel. For strict customers, offer offline update bundles. Keep telemetry to version numbers, uptime, queue depth, and schema error counts—nothing from the notes themselves.

### Improving the model without seeing raw notes

Start simple:

* local evaluation harness that runs at the customer site
* de-identified structured error tags sent back to you
* synthetic note generation from policy criteria
* aggregated outcome feedback
* optional customer-approved redacted exemplars under a separate workflow

I would **not** start with federated learning. It is complex, operationally heavy, and muddies the clean story you are trying to tell.

### Support burden

This is one of your biggest hidden taxes. Hundreds of on-prem deployments mean:

* driver drift
* EDR / antivirus conflicts
* local IT variance
* limited observability
* slower root-cause analysis
* hardware replacement issues
* version skew across customers

That is survivable, but only if your ACV supports it. It is one more reason to avoid broad, low-price SMB SaaS economics.

### Hybrid architecture?

Yes. In fact, I think **hybrid is the best version**: local LLM for note extraction, cloud-hosted policy graph and analytics for **de-identified** structured records, and an optional fully local rules pack for strict accounts. That gives you central rule updates without central PHI.

---

## 4. Data sources and training reality

### What public data exists?

There is enough public and de-identified data to build a serious **starting point**:

* CMS **Basic Stand Alone** Medicare claims PUFs are de-identified public-use files
* CMS **SynPUFs** are synthetic claims for development and training
* HCUP **NASS** is the largest all-payer ambulatory surgery database in the U.S.
* HCUP state datasets and APCD ecosystems exist for broader claims work
* **MIMIC-IV** and **n2c2/i2b2** provide de-identified clinical note corpora and annotations

But there is an important caveat: MIMIC explicitly says derived datasets or models should be treated as **sensitive** and shared under the same agreement as the source data. So even some “de-identified” academic pipelines come with use constraints. ([CMS][12])

### Are payer policies publicly accessible enough to scrape?

Yes. This part is actually favorable.

* CMS’s **Medicare Coverage Database** is searchable and downloadable for LCD/NCD content
* EviCore publishes clinical guideline materials
* Aetna publishes clinical policy bulletins

So the raw material for a real rules engine is there. ([CMS][13])

### The real data gap: contracts and operational behavior

Public policy is not the whole truth. EviCore explicitly notes that a health plan’s own policies may take precedence over EviCore’s core guidelines. Aetna likewise says its clinical policy bulletins define clinical policy, but medical-necessity determinations are made **case by case**. That is the heart of your modeling gap: **public policy tells you the visible rules; it does not fully tell you the actual approval behavior for a plan-product-provider combination.** ([eviCore][14])

So customers will likely need to supply some combination of:

* plan product mappings
* delegated UM relationships
* contract carve-outs
* denial letters / appeal rationale
* historical outcomes

I would keep raw contract text local where possible and upload only normalized rule deltas.

### Can public/de-identified notes get you to production quality?

For **baseline extraction**, yes. For **production-grade orthopedic approval intelligence**, probably not by themselves.

My inference: public note corpora skew toward ICU, discharge, and academic documentation, while orthopedic prior-auth value often lives in ambulatory shorthand, templated physical therapy histories, imaging references, conservative-treatment narratives, and payer-specific evidence patterns. Public claims data also do **not** give you clean prior-auth labels. So a PHI-free training pipeline can get you a strong extractor and policy engine, but the last mile of approval prediction will need local customer feedback loops, local evaluation, or customer-provided redacted examples.

---

## 5. Regulatory, procurement, and liability

### Do you still need SOC 2 / HITRUST?

Nothing in HIPAA says a non-BA software vendor automatically needs SOC 2 or HITRUST. But healthcare procurement will still treat you as a third-party risk vendor. AICPA defines SOC 2 as an examination of controls relevant to security, availability, processing integrity, confidentiality, or privacy; Shared Assessments’ SIG is a standard vendor-risk questionnaire; HITRUST positions certification as third-party validation of security practices. Translation: even if you avoid PHI, **SOC 2 is still the likely minimum trust artifact** for serious buyers. HITRUST helps, but I would not make it day-one mandatory. ([AICPA & CIMA][15])

### FDA CDS risk

I think the FDA risk is **lower than your HIPAA risk**, but not zero. FDA’s January 2026 CDS guidance says non-device CDS should enable healthcare professionals to **independently review the basis** for the recommendation and avoid primary reliance on the software. That pushes your UI in a clear direction: show the extracted facts, the matching policy clauses, the missing criteria, and the known unknowns. Do **not** present an opaque “82% approve—schedule it” workflow that effectively directs clinical decision-making. ([U.S. Food and Drug Administration][16])

### Liability of an “82% approval likelihood” score

I would worry less about classic malpractice and more about **negligent misrepresentation, contract claims, marketing claims, and operational reliance risk**. The more precise and directive the score looks, the more people will over-trust it. Early product should probably use **green / yellow / red readiness bands with reasons** rather than faux-precision percentages.

### Contractual protections you need

At minimum:

* MSA with clear scope and disclaimers
* security / deployment addendum
* explicit “no PHI export” outbound data exhibit
* support procedures that prohibit PHI sharing
* incident-response terms
* limitation of liability
* customer responsibility for local PHI handling and infrastructure
* final authorization / treatment decision remains with provider and payer
* **BAA template ready**, even if you try not to use it

---

## 6. Competitive landscape and whitespace

### Current map

* **Cohere Health**: payer/provider prior-auth automation at scale; public materials cite millions of annual requests. ([Cohere Health][7])
* **Rhyme**: “touchless” prior auth network; public materials cite over 4M prior auths annually. ([Get Rhyme][17])
* **Waystar**: provider-side authorization and RCM automation; clearly cloud/platform oriented. ([Waystar][18])
* **Infinitus**: voice/call automation for prior-auth follow-up tasks. ([Infinitus][19])
* **Honey Health**: end-to-end prior-auth lifecycle automation. ([Honey Health][20])
* **Humata Health**: aggressive PA automation player; publicly tied to CMS WISeR activity in Oklahoma. ([CMS][21])
* **eviCore / Evernorth**: payer-side guideline / medical benefit management infrastructure and a major rules source. ([eviCore][22])
* **Innobot**: customer-environment automation precedent via RDP/VPN and on-prem VM patterns. ([Innobot Health][10])
* **Olive AI**: sold remaining assets and shut down in October 2023. ([Axios][23])

### What nobody seems to be doing well enough

The whitespace is **not** “AI for prior auth.” That already exists.

The whitespace is:

* **provider-side**
* **specialty-specific**
* **pre-submission**
* **evidence-traceable**
* **privacy-preserving / local-first**

In other words: “before you submit this orthopedic case, here is exactly what is missing, exactly which policy criteria appear satisfied, and exactly why this is risky”—without shipping the note to a vendor cloud.

From the public materials I reviewed, I do **not** see a major vendor whose core positioning is “we never see patient data because the extraction model runs on your hardware.” That is a real differentiator. It is just not a moat by itself.

### What is defensible?

Not the local LLM wrapper. That will commoditize.

The likely moat is:

* normalized payer-policy / contract graph
* specialty-specific workflow design
* trusted evidence trace
* historical outcome calibration
* distribution into practice/MSO/ASC workflows
* local deployment that is actually painless

---

## 7. Go-to-market and fastest path to revenue

### The best wedge

Yes: **orthopedics + top 3–5 payers + 5–10 high-volume elective procedures** is the right starting shape.

### Fastest paying pilot

The fastest first pilot is probably an **independent ortho group, ortho MSO, or ortho-heavy ASC operator** with acute auth pain and manageable procurement. The fastest second move is an **ortho-focused RCM or MSO channel**, once you have one strong proof point. I would not start with hospitals, and I definitely would not start payer-side.

### What the customer needs to see

Not just a demo. They need:

* a retrospective bake-off on **their own historical cases**, run locally
* extraction accuracy by field
* false-positive rate for “ready to submit”
* side-by-side policy citations
* measured reduction in missing-document resubmissions
* a simple ROI model using their auth volume
* a one-page architecture diagram proving no PHI leaves the environment

### Should you launch a lookup tool first?

Yes, but I would **rename the promise**.

Do not launch “approval likelihood from public data alone.” That overclaims. Launch a **Policy Navigator**:

* CPT / payer / plan / site-of-service lookup
* whether PA is usually required
* public policy criteria
* documentation checklist
* citations to source policy
* obvious risk flags

That can be a real product with **zero note ingestion** and basically no HIPAA drama. Then upsell the on-prem extraction layer. Public policy data is good enough for a rules navigator; it is not honest enough for high-confidence approval prediction across contract variants. ([CMS][13])

### Timeline I would plan against

My estimate, assuming brutal scope discipline:

* **8–12 weeks**: cloud Policy Navigator MVP
* **3–6 months**: local extractor for one specialty + one design partner
* **6–12 months**: first meaningful paid pilot
* **12+ months**: outcome-calibrated scoring that deserves trust

---

## Biggest risks

1. **Label risk**
   Claims paid is not the same thing as prior auth approved. Your label definition can quietly poison the model.

2. **Contract nuance risk**
   Public policy is necessary but not sufficient. Product, network, delegated UM, site-of-service, and local payer behavior matter.

3. **HIPAA leakage risk**
   Support, logs, telemetry, screenshots, and backups are the real places the no-PHI story breaks. ([HHS.gov][8])

4. **De-identification overconfidence**
   “No 18 identifiers” is not the same thing as “safe enough in context.” Expert Determination is the adult move. ([HHS.gov][4])

5. **On-prem ops risk**
   Support cost and version drift can crush margin if ACV is too low.

6. **Commercial positioning risk**
   “Approval predictor” is exciting language but also the most legally and commercially fragile version of the product.

---

## My recommendation

Build this in **three stages**:

1. **Policy Navigator**
   Cloud, no PHI, public-policy-based, citation-heavy, fast to ship.

2. **Authorization Readiness Engine**
   Local note extraction + local evidence trace + missing-criteria detection.

3. **Outcome Calibration Layer**
   De-identified analytics and only later a probabilistic score.

So the short version of the strategy is:

* keep raw notes local
* keep the cloud schema ruthlessly narrow
* use expert de-identification, not vibes
* sell **documentation readiness**, not magical prediction
* start with ortho
* be **BAA-ready anyway**, even if your goal is to stay outside it

That is where the architecture is genuinely strong, where the legal story stays coherent, and where the fastest revenue path lives.

[1]: https://www.ama-assn.org/practice-management/prior-authorization/fixing-prior-auth-nearly-40-prior-authorizations-week-way?utm_source=chatgpt.com "Fixing prior auth: Nearly 40 prior authorizations a week is ..."
[2]: https://www.hhs.gov/hipaa/for-professionals/faq/256/is-software-vendor-business-associate/index.html?utm_source=chatgpt.com "Is a software vendor a business associate of a covered ..."
[3]: https://www.hhs.gov/hipaa/for-professionals/faq/256/is-software-vendor-business-associate/index.html "https://www.hhs.gov/hipaa/for-professionals/faq/256/is-software-vendor-business-associate/index.html"
[4]: https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html "https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html"
[5]: https://www.hhs.gov/hipaa/for-professionals/faq/2075/may-a-hipaa-covered-entity-or-business-associate-use-cloud-service-to-store-or-process-ephi/index.html "https://www.hhs.gov/hipaa/for-professionals/faq/2075/may-a-hipaa-covered-entity-or-business-associate-use-cloud-service-to-store-or-process-ephi/index.html"
[6]: https://www.aamc.org/media/75391/download "https://www.aamc.org/media/75391/download"
[7]: https://www.coherehealth.com/news/cohere-health-medical-mutual-and-rhyme-partner-on-utilization-management-transformation "https://www.coherehealth.com/news/cohere-health-medical-mutual-and-rhyme-partner-on-utilization-management-transformation"
[8]: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html "https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html"
[9]: https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule "https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule"
[10]: https://innobothealth.com/automated-prior-authorization/ "https://innobothealth.com/automated-prior-authorization/"
[11]: https://mistral.ai/news/mistral-small-3-1 "https://mistral.ai/news/mistral-small-3-1"
[12]: https://www.cms.gov/data-research/statistics-trends-and-reports/basic-stand-alone-medicare-claims-public-use-files?utm_source=chatgpt.com "Basic Stand Alone (BSA) Medicare Claims Public Use Files ..."
[13]: https://www.cms.gov/medicare-coverage-database/downloads/downloads.aspx "https://www.cms.gov/medicare-coverage-database/downloads/downloads.aspx"
[14]: https://www.evicore.com/taxonomy/term/152 "https://www.evicore.com/taxonomy/term/152"
[15]: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2 "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2"
[16]: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software"
[17]: https://www.getrhyme.com/ "https://www.getrhyme.com/"
[18]: https://www.waystar.com/our-platform/financial-clearance/authorizations/ "https://www.waystar.com/our-platform/financial-clearance/authorizations/"
[19]: https://www.infinitus.ai/solutions/prior-authorization/ "https://www.infinitus.ai/solutions/prior-authorization/"
[20]: https://www.honeyhealth.ai/platform/prior-authorization-management-5lwwb "https://www.honeyhealth.ai/platform/prior-authorization-management-5lwwb"
[21]: https://www.cms.gov/priorities/innovation/innovation-models/wiser "https://www.cms.gov/priorities/innovation/innovation-models/wiser"
[22]: https://www.evicore.com/provider/clinical-guidelines "https://www.evicore.com/provider/clinical-guidelines"
[23]: https://www.axios.com/pro/health-tech-deals/2023/10/31/olive-ai-is-shutting-down "https://www.axios.com/pro/health-tech-deals/2023/10/31/olive-ai-is-shutting-down"

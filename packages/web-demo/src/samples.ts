export interface SampleNote {
  id: string;
  title: string;
  cptCode: string;
  carrier: string;
  noteText: string;
}

export const sampleNotes: SampleNote[] = [
  {
    id: "tkr-medicare-approval",
    title: "TKR — Medicare Approval Case",
    cptCode: "27447",
    carrier: "Medicare",
    noteText: `ORTHOPEDIC SURGERY CONSULTATION
Date: 03/15/2026
Patient: [SYNTHETIC — NOT A REAL PATIENT]

CHIEF COMPLAINT: Severe right knee pain, progressive over the past 18 months, now limiting ambulation to less than one block.

HISTORY OF PRESENT ILLNESS:
This is a 72-year-old male presenting with worsening right knee pain consistent with advanced osteoarthritis. Patient reports pain rated 8/10 on the Visual Analog Scale (VAS) at rest and 10/10 with activity. Pain is constant, worst with weight-bearing, and significantly disrupts sleep. He has been using a cane for the past 6 months and reports increasing difficulty with stairs, getting in/out of chairs, and performing basic ADLs including dressing and bathing.

CONSERVATIVE TREATMENT HISTORY:
- Physical therapy: Completed 14 weeks of formal in-person PT (2x/week) at Summit Rehabilitation from 09/2025 through 12/2025. Minimal improvement in pain or function. PT discharge notes document plateau in progress.
- Medications: Tried acetaminophen 1000mg TID, meloxicam 15mg daily, and topical diclofenac gel without adequate relief. Discontinued meloxicam due to GI side effects.
- Injections: Received series of 3 hyaluronic acid injections (Synvisc-One) completed 11/2025. Temporary relief of approximately 3 weeks, then return to baseline pain.
- Activity modification and weight management counseling provided. BMI 32.1 (height 5'10", weight 224 lbs). Patient lost 8 lbs over past 6 months through dietary modification.
- Assistive devices: Using single-point cane for ambulation x 6 months.

PHYSICAL EXAMINATION:
Right knee: Moderate effusion noted. Crepitus with passive and active ROM. Flexion limited to 95 degrees (normal 135). Extension lacks 8 degrees of full extension. Valgus deformity of approximately 8 degrees. Tenderness along medial and lateral joint lines. Ligaments stable. No erythema or warmth suggesting infection.

IMAGING:
Weight-bearing AP, lateral, and sunrise radiographs of right knee dated 02/28/2026:
- Kellgren-Lawrence Grade III osteoarthritis with near-complete loss of medial compartment joint space
- Moderate osteophyte formation along medial femoral condyle and tibial plateau
- Subchondral sclerosis of medial tibial plateau
- Moderate patellofemoral narrowing

ASSESSMENT:
Primary osteoarthritis of right knee, KL Grade III, with significant functional limitation despite exhaustive conservative management over 5+ months. Patient meets criteria for total knee arthroplasty.

PLAN:
1. Recommend right total knee arthroplasty (CPT 27447)
2. Pre-operative medical clearance with PCP
3. Pre-operative labs, EKG
4. Discussed risks, benefits, alternatives, and expected recovery. Patient wishes to proceed.`
  },
  {
    id: "acl-cigna-approval",
    title: "ACL Reconstruction — Cigna Approval",
    cptCode: "29888",
    carrier: "Cigna",
    noteText: `ORTHOPEDIC SURGERY — INITIAL EVALUATION
Date: 03/10/2026
Patient: [SYNTHETIC — NOT A REAL PATIENT]

CHIEF COMPLAINT: Left knee injury sustained during soccer game 10 days ago. Reports hearing a "pop" with immediate swelling and inability to bear weight.

HISTORY OF PRESENT ILLNESS:
This is a 28-year-old female competitive recreational soccer player who presents following acute left knee injury. The injury occurred during a cutting maneuver when she planted her left foot and rotated. She heard an audible pop, experienced immediate pain and swelling, and was unable to continue playing. She has been using crutches since the injury. She denies any prior knee injuries or surgeries. She reports persistent knee instability with the knee "giving way" during attempted ambulation, even with a brace. She is highly motivated to return to full athletic activity.

PHYSICAL EXAMINATION:
Left knee: Moderate effusion. ROM limited to 10-110 degrees (guarding). Positive Lachman test (Grade 2, soft endpoint). Positive anterior drawer test with 8mm anterior translation and no firm endpoint. Positive pivot shift test. Negative valgus/varus stress testing at 0 and 30 degrees (MCL/LCL intact). Negative posterior drawer. McMurray test equivocal due to guarding. Neurovascularly intact distally. No joint line tenderness suggesting isolated meniscal injury.

IMAGING:
MRI left knee dated 03/05/2026:
- Complete disruption of the anterior cruciate ligament at its femoral attachment. Ligament fibers are lax and irregular with surrounding edema.
- Bone bruise pattern involving the lateral femoral condyle and posterolateral tibial plateau, consistent with pivot-shift mechanism.
- Medial and lateral menisci intact bilaterally. No evidence of meniscal tear.
- MCL, LCL, and PCL intact.
- Small joint effusion.

ASSESSMENT:
Acute complete ACL tear, left knee, confirmed on MRI with positive clinical examination findings (Lachman, anterior drawer, pivot shift). Concomitant bone bruising consistent with pivot-shift mechanism. Patient is a young, active individual with documented functional instability and desire to return to cutting/pivoting sports. Given the acute complete tear with documented instability and need to return to cutting/pivoting activities, the acute injury exception to conservative management applies per Cigna/eviCore CMM-312.

PLAN:
1. Arthroscopic ACL reconstruction with hamstring autograft (CPT 29888)
2. Allow acute edema to resolve — target surgery in 3-4 weeks
3. Pre-operative prehabilitation protocol: ROM exercises, quad strengthening
4. Discussed graft options, rehabilitation timeline (9-12 months to full sport return), risks including re-tear, stiffness, and infection. Patient understands and wishes to proceed.`
  },
  {
    id: "rotator-cuff-aetna-needs-docs",
    title: "Rotator Cuff — Needs More Documentation",
    cptCode: "29827",
    carrier: "Aetna",
    noteText: `ORTHOPEDIC SURGERY — FOLLOW-UP VISIT
Date: 03/12/2026
Patient: [SYNTHETIC — NOT A REAL PATIENT]

CHIEF COMPLAINT: Right shoulder pain, worsening over the past 2 months. Difficulty reaching overhead and sleeping on the affected side.

HISTORY OF PRESENT ILLNESS:
This is a 55-year-old right-hand-dominant male construction worker presenting with progressive right shoulder pain over approximately 2 months. He does not recall a specific injury but notes that the pain has gradually worsened, particularly with overhead activities at work. Pain is rated 6/10 at rest and 8/10 with overhead reaching or lifting. He has difficulty sleeping on his right side. He reports weakness when trying to lift objects above shoulder height.

CONSERVATIVE TREATMENT HISTORY:
- Physical therapy: Completed 4 weeks of PT (2x/week) at Riverside Physical Therapy from 02/10/2026 through 03/08/2026. Reports minimal improvement.
- Medications: Taking ibuprofen 800mg TID with mild relief. No other medications tried.
- No injections administered to date.

PHYSICAL EXAMINATION:
Right shoulder: No visible deformity. Mild tenderness over the greater tuberosity. Active forward flexion to 140 degrees with pain (normal 180). Active abduction to 130 degrees with pain. External rotation strength 4/5. Internal rotation strength 4+/5. Positive Neer impingement sign. Positive Hawkins-Kennedy test. Jobe/Empty Can test not performed. Drop arm test not performed. No evidence of instability.

IMAGING:
MRI right shoulder dated 03/01/2026:
- Partial-thickness articular-sided tear of the supraspinatus tendon, approximately 40% thickness involvement, measuring 8mm in AP dimension. Ellman Grade 2.
- Mild subacromial bursitis.
- Intact infraspinatus, subscapularis, and teres minor tendons.
- No significant muscle atrophy or fatty infiltration.
- Mild acromioclavicular joint osteoarthritis with small inferior osteophyte.

ASSESSMENT:
Partial-thickness rotator cuff tear (supraspinatus), right shoulder, Ellman Grade 2. Currently with functional limitation affecting work duties.

PLAN:
1. Continue conservative management — extend PT program
2. Consider subacromial corticosteroid injection for pain relief
3. If no improvement after extended conservative treatment course, will discuss surgical options including arthroscopic rotator cuff repair (CPT 29827)
4. Return in 8 weeks for reassessment`
  },
  {
    id: "lumbar-fusion-cigna-denial",
    title: "Lumbar Fusion — Cigna Denial Case",
    cptCode: "22612",
    carrier: "Cigna",
    noteText: `SPINE SURGERY CONSULTATION
Date: 03/08/2026
Patient: [SYNTHETIC — NOT A REAL PATIENT]

CHIEF COMPLAINT: Low back pain with bilateral leg pain for 3 months.

HISTORY OF PRESENT ILLNESS:
This is a 48-year-old male presenting with low back pain and bilateral lower extremity radicular symptoms for approximately 3 months. The pain began insidiously without a specific injury. He describes constant low back pain rated 7/10, with radiation into both legs, worse on the left, extending to the calf. He reports numbness in the left L5 dermatome. Symptoms are aggravated by prolonged standing and walking, and partially relieved by sitting and lying down. He works as a warehouse supervisor and has been on modified duty for the past 6 weeks.

SOCIAL HISTORY:
Current smoker — 1 pack per day for 25 years. Denies alcohol or recreational drug use. Lives with wife and two children. No prior surgical history. No history of mental health treatment.

CONSERVATIVE TREATMENT HISTORY:
- Physical therapy: Attended 8 sessions of PT over 6 weeks from 01/2026 through 02/2026. Reports some improvement in flexibility but no significant pain reduction.
- Medications: Gabapentin 300mg TID with mild relief. Cyclobenzaprine 10mg QHS PRN. NSAIDs (naproxen 500mg BID) with partial relief.
- Injections: One L4-5 epidural steroid injection on 02/15/2026 with approximately 40% temporary relief lasting 2 weeks.
- No CBT or behavioral health referral to date.

PHYSICAL EXAMINATION:
Lumbar spine: Paravertebral muscle spasm bilateral. Tenderness over L4-5 spinous process. Forward flexion limited to 40 degrees (pain). Extension limited to 10 degrees. Positive straight leg raise at 45 degrees on the left, negative on the right. Motor strength 5/5 bilateral lower extremities. Sensation decreased to light touch in left L5 dermatome. Reflexes 2+ and symmetric. Negative Babinski. Negative ankle clonus. Gait antalgic, favoring right.

IMAGING:
MRI lumbar spine dated 02/01/2026:
- L4-5: Moderate degenerative disc disease with loss of disc height and desiccation. Broad-based disc protrusion with annular tear. Mild bilateral foraminal stenosis. Mild central canal stenosis without significant cord compression.
- L3-4: Mild disc bulge without stenosis.
- L5-S1: Mild degenerative changes without stenosis.
- No spondylolisthesis identified at any level.

ASSESSMENT:
Degenerative disc disease at L4-5 with bilateral radiculopathy, predominantly left-sided. Only 3 months of symptom duration. Limited conservative treatment course to date.

PLAN:
1. Would consider single-level posterior lumbar fusion at L4-5 (CPT 22612) given disc pathology and radicular symptoms
2. However, acknowledge that Cigna precertification requires 12 months of unremitting symptoms and 6 months of structured conservative management including CBT
3. Recommend continued and expanded conservative management: extend PT to include core stabilization program, refer to behavioral health for CBT/pain psychology, strongly counsel smoking cessation (required for surgical candidacy)
4. Repeat imaging in 6 months if symptoms persist
5. Return in 3 months for reassessment`
  },
  {
    id: "carpal-tunnel-uhc-approval",
    title: "Carpal Tunnel — UHC Approval",
    cptCode: "64721",
    carrier: "UnitedHealthcare",
    noteText: `HAND SURGERY CONSULTATION
Date: 03/14/2026
Patient: [SYNTHETIC — NOT A REAL PATIENT]

CHIEF COMPLAINT: Progressive numbness and tingling in both hands, worse on the right, for the past 8 months. Dropping objects frequently.

HISTORY OF PRESENT ILLNESS:
This is a 52-year-old right-hand-dominant female office worker presenting with progressive bilateral hand numbness, tingling, and weakness, right worse than left, over the past 8 months. Symptoms involve the thumb, index, middle, and radial half of the ring finger bilaterally. She reports waking at night 3-4 times per week with hand numbness that requires shaking her hands for relief. During the day, she experiences numbness while typing, driving, and gripping objects. She has been dropping objects (cups, utensils) approximately 2-3 times per week over the past 2 months. She notes difficulty with fine motor tasks including buttoning clothing and opening jars.

CONSERVATIVE TREATMENT HISTORY:
- Wrist splinting: Wore bilateral neutral wrist splints nightly for 8 weeks (01/2026 through 02/2026). Provided mild temporary relief of nighttime symptoms but no improvement in daytime symptoms or weakness.
- Medications: NSAIDs (ibuprofen 400mg TID) for 6 weeks with no improvement in neurological symptoms.
- Injection: Right carpal tunnel corticosteroid injection (40mg triamcinolone) on 02/01/2026. Provided approximately 3 weeks of partial symptom relief, then return to baseline.
- Activity modification and ergonomic workstation assessment completed.
- No improvement in weakness or functional limitation despite 8+ weeks of conservative measures.

PHYSICAL EXAMINATION:
Bilateral hands:
- Right hand: Visible thenar atrophy compared to left. Grip strength 18 kg (left 26 kg). Positive Phalen's test at 15 seconds. Positive Tinel's sign over carpal tunnel. Decreased two-point discrimination in median nerve distribution (8mm, normal <6mm). Thumb abduction strength 3+/5. Flattening of thenar eminence on inspection.
- Left hand: No visible atrophy. Grip strength 26 kg. Positive Phalen's test at 25 seconds. Equivocal Tinel's sign. Two-point discrimination normal. Thumb abduction strength 4+/5.
- No signs of cervical radiculopathy. Negative Spurling's test. Normal shoulder and elbow examination bilaterally.

ELECTRODIAGNOSTIC STUDIES:
NCS/EMG dated 02/20/2026 (performed by Dr. Martinez, Board-Certified Neurologist):
RIGHT:
- Median motor distal latency 5.8 ms (normal <4.2). Median sensory distal latency 4.6 ms (normal <3.5). Median SNAP amplitude reduced at 8 µV (normal >20).
- Ulnar motor and sensory conductions normal.
- EMG: Fibrillation potentials and positive sharp waves in abductor pollicis brevis. Chronic neurogenic MUP changes in APB.
- Interpretation: Severe right carpal tunnel syndrome with axonal loss.

LEFT:
- Median motor distal latency 4.8 ms. Median sensory distal latency 3.9 ms. Median SNAP amplitude 15 µV.
- Ulnar motor and sensory conductions normal.
- EMG: No denervation in APB.
- Interpretation: Moderate left carpal tunnel syndrome, primarily demyelinating.

ASSESSMENT:
Bilateral carpal tunnel syndrome — severe on the right with electrodiagnostic evidence of axonal loss and clinical thenar atrophy, moderate on the left. Failed conservative management including splinting, NSAIDs, and corticosteroid injection over 8+ weeks.

PLAN:
1. Right carpal tunnel release (CPT 64721) — recommend proceeding promptly given evidence of axonal loss and thenar atrophy (delay risks permanent nerve damage)
2. Left carpal tunnel release to be considered as staged procedure 4-6 weeks after right
3. Pre-operative labs
4. Discussed risks (scar tenderness, pillar pain, incomplete relief, recurrence, infection) and benefits. Patient understands and wishes to proceed with right side first.`
  }
];

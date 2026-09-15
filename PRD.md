# Product Requirements Document (PRD)
## Project: "ExamVault" (VaultJRF) — Exam Revision & Mastery App

> [!info] **Executive Summary**
> A lightweight, mobile-first revision app built for UGC-NET (English Literature & Paper 1) aspirants to bridge their scores to **210+ / 300** (guaranteed JRF and top percentile). 
> It replaces bulky 400-page PDFs with a distraction-free, 1-tap phone drill designed around a busy aspirant's daily routine (10–15 minute commute and break sessions).

---

## 1. Why We Are Building This (The Problem)

| Real-Life Bottleneck | How This App Solves It |
| :--- | :--- |
| **No Time for Long Study Hours:** Working professionals and busy aspirants cannot sit for 6 continuous hours every day. | **Bite-sized micro-drills:** Designed for 5–10 minute sessions (10 questions at a time during bus rides or lunch breaks). |
| **Repeated Mistakes (The Plateau):** Candidates often miss cutoffs by 2 to 4 marks repeatedly because they stumble on the same 4–5 trap question patterns. | **The Mistake Vault:** Automatically collects every question answered incorrectly and prompts the candidate to re-attempt them until mastered. |
| **High Friction of Books & PDFs:** Scrolling through PDFs, writing answers on paper, and checking keys manually causes fatigue. | **Instant 1-Tap Interaction:** Read question $\to$ tap option $\to$ immediate green/red feedback with the exact cheat-sheet rule. |

---

## 2. Core Target User Profile

* **Target Audience:** UGC-NET & JRF Aspirants (Subject: English Literature, Code 30 + General Paper 1)
* **Baseline Score Range:** **~160–175 / 300**
* **Target Score:** **204 to 216+ / 300** (Guaranteed JRF + Top All India Rank)
* **Primary Device:** Mobile Phone (Android / iOS) & Desktop Web

---

## 3. Key Features & How They Help Candidates

### Feature 1: The "Commute Drill & Custom Test Builder" (Maximum Flexibility)
* **What it does:** 
  * **Quick 1-Tap Commute Drills:** Pre-set 5, 10, or 15-question bursts for quick daily habit building.
  * **Unit-Wise Selection:** Drill questions strictly from any single chosen unit (e.g., *Drama* or *Logical Reasoning*).
  * **Combine Multiple Units:** Freely select and combine multiple units into a unified session (e.g., combine *Drama + Poetry + Criticism*, or *Logical Reasoning + ICT + Higher Education*).
  * **Time-Targeted Drills (e.g., 25-Minute Session):** Set a specific time budget (e.g., 10, 15, 20, 25, 30, or 45 mins). The app automatically provisions the optimal question count matching the NTA pace (~1.2 mins/question, so 25 mins $\implies$ ~20 questions), or allows custom question limits.
  * **Dual Modes:**
    * *Practice Mode:* Instant green/red feedback + 1-line Master Table cheat-sheet rule after each question.
    * *Exam Mode:* Live countdown timer, NTA question palette, no answers revealed until final scorecard submission.
* **Why it helps:** Gives candidates full autonomy to adapt practice to their exact time window (a 25-minute break) or weak unit combinations without rigid constraints.


### Feature 2: Instant "Cheat Sheet" Explanations (No Long Paragraphs)
* **What it does:** When the candidate answers a question, it doesn't just say *"Correct"* or *"Wrong"*. 
* **The Magic:** If a question on *Indian Logic* or *Criticism* is missed, the app shows a **1-line rule from our Master Tables**:
  > *Example Rule:* *"Exam Rule: Gilbert Ryle coined 'Thick Description' (1949); Clifford Geertz popularized it (1973)."*
* **Why it helps:** Teaches the exact examiner trap immediately while the question is fresh in mind.

### Feature 3: The "Mistake Vault" (Mastery Weapon)
* **What it does:** Every question answered incorrectly across any quiz is automatically saved into a dedicated bucket called **"My Mistakes"**.
* **The "Clear My Mistakes" Mode:**
  * A button on the home screen says: **"Practice My Mistakes (X Questions Waiting)"**.
  * The candidate can practice *only* these failed questions.
  * Once a mistake is answered correctly twice in a row, it disappears from the vault.
* **Why it helps:** Directly eliminates the leaky bucket of marks that costs candidates the exam cutoff.

### Feature 4: The Unit "Health Meter" (Visual Confidence Dashboard)
* **What it does:** A clean, color-coded dashboard showing mastery across all 10 units of Paper 1 and 10 units of Paper 2:
  * 🟢 **Green (Above 80% Accuracy):** "Exam Ready — Safe!"
  * 🟡 **Yellow (60% – 80% Accuracy):** "Good, Needs 1 More Drill."
  * 🔴 **Red (Below 60% Accuracy):** "Leak Detected — Practice This Unit Today!"
* **Why it helps:** Removes anxiety. The candidate always knows *exactly* which topic needs 10 minutes of attention today.

### Feature 5: The "Sunday Mock Simulator" (Real CBT Exam Feel)
* **What it does:** Full-length test mode (50 questions for Paper 1 with a 60-minute countdown; 100 questions for Paper 2 with 120 minutes).
* **Features:**
  * Real NTA-style palette: Green (Answered), Orange (Marked for Review), Gray (Unattempted).
  * Comprehensive scorecard at the end showing marks out of 100/200, time spent per question, and weak areas.

### Feature 6: "Star for Revision" (Doubt Basket)
* **What it does:** A star icon on every question.
* **Why it helps:** If a question has an interesting quote, confusing wording, or an important author to discuss or review later, tapping the star saves it to the **Starred List**.

---

## 4. How Cloud Storage & Sync Work (Without Passwords)

To make it effortless, candidates will **never have to log in or create a password**:
* **Silent Cloud Sync:** 
  * The first time the candidate opens the app on a phone, the app creates a secure personal profile linked to that device.
  * Every answer, mistake, and star is automatically backed up.
* **Multi-Device Support:**
  * To practice on a laptop on weekends, a simple 1-click sync link (or QR code) transfers the exact progress to the computer screen.
* **Zero Data Loss:**
  * Even if browser history is cleared or a new phone is used, the entire question history and mistake bank are retained.

---

## 5. Daily Routine Blueprint for Candidates

| Time of Day | Duration | What The Candidate Does in the App |
| :--- | :---: | :--- |
| **Morning Commute / Start of Day** | **10 mins** | Opens app $\to$ Completes **10 Quick Questions** in a single Paper 1 unit. |
| **Midday Recess / Lunch Break** | **5 mins** | Opens **Mistake Vault** $\to$ Re-attempts 5 previously failed questions. |
| **Evening Commute / Post-Dinner** | **15 mins** | Completes **15 Questions** in Paper 2 English Literature (Theory / Criticism). |
| **Weekend Practice** | **60 mins** | Full timed Paper 1 Mock Simulation $\to$ Reviews detailed scorecard. |

---

## 6. Development & Deployment Plan

1. **Step 1:** Build the mobile-first frontend with clean, large cards and instant feedback sounds/visuals.
2. **Step 2:** Bundle the complete question bank (1,295 Paper 2 questions + Paper 1 high-yield sets).
3. **Step 3:** Hook up the Mistake Vault and cloud database for automatic progress saving.
4. **Step 4:** Deploy with a custom, memorable URL (`examvault.vercel.app`).
5. **Step 5:** Add to phone home screen in 5 seconds via PWA install.

import fs from 'fs';

const testBlock = `### Q[2019-2020]-147. [JUNE 2006 | Q.3]

(C) Article 30
(D) Article 31
48. Match List - I (Institutions) with List - II (Functions) and select the correct answer by
using the code given below:
List - I (Institutions) List - II (Functions)
(a) Parliament (i) Formulation of Budget
(b) C & A.G. (ii) Enactment of Budget
(c) Ministry of Finance (iii) Implementation of Budget
(d) Executing Departments (iv) Legality of expenditure
(v) Justification of Income
Code:
(a) (b) (c) (d)
(A) (iii) (iv) (ii) (i)
(B) (ii) (iv) (i) (iii)
(C) (v) (iii) (iv) (ii)
(D) (iv) (ii) (iii) (v)
49. Foundation training to the newly recruited IAS (Probationers) is imparted by:
(A) Indian Institute of Public Administration
(B) Administrative Staff College of India
(C) L.B.S. National Academy of Administration
(D) Centre for Advanced Studies
50. Electoral disputes arising out of Presidential and Vice-Presidential Elections are settled by:
(A) Election Commission of India
(B) Joint Committee of Parliament
(C) Supreme Court of India
(D) Central Election Tribunal

> **Official NTA Answer:** ==**D**==
`;

// Test splitting multi-question block
function splitMultiQuestions(block) {
  // Find lines starting with question numbers like "48. ", "49. ", "50. "
  const parts = block.split(/(?=\n\s*\d+\.\s+[A-Z])/);
  return parts;
}

const parts = splitMultiQuestions(testBlock);
console.log(`Split into ${parts.length} parts:`);
for (let i = 0; i < parts.length; i++) {
  console.log(`\n--- PART ${i + 1} ---`);
  console.log(parts[i].trim().slice(0, 150));
}

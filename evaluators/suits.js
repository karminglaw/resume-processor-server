const EXCLUSION_KEYWORDS = [
  // Job titles
  'finance admin', 'accounts assistant', 'accounting clerk',
  'admin assistant', 'billing clerk', 'payroll executive',
  'accounting executive', 'bookkeeper', 'finance executive',

  // Finance tasks
  'accounts payable', 'accounts receivable', 'AP/AR',
  'bank reconciliation', 'invoice processing', 'payment processing',
  'data entry (finance)', 'petty cash', 'credit note', 'debit note',
  'full set of accounts', 'general ledger', 'GL', 'audit schedule',
  'payment voucher', 'cash flow statement', 'journal entries',
  'tax computation', 'EPF', 'SOCSO', 'EIS', 'LHDN', 'PCB',

  // Software tools
  'SQL Accounting', 'UBS', 'Autocount', 'MYOB', 'QuickBooks',
  'Xero', 'Million Accounting', 'Wave Accounting', 'Financio'
];

function detectExclusionFlags(text) {
  if (!text) {
    console.log('⚠️ Warning: No text content provided for exclusion detection');
    return new Set();
  }
  
  const lowerText = text.toLowerCase();
  const detectedExclusions = new Set();

  EXCLUSION_KEYWORDS.forEach(keyword => {
    // Create a regex pattern with word boundaries
    const pattern = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
    if (pattern.test(lowerText)) {
      detectedExclusions.add(keyword);
      console.log(`🚫 Detected exclusion flag: ${keyword}`);
    }
  });
  
  return detectedExclusions;
}

function generatePrompt(applications) {
  const processedApps = applications.map(app => ({
    ...app,
    exclusionFlags: Array.from(detectExclusionFlags(app.text))
  }));

  return {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a precise client servicing/account management resume evaluator. Focus on client-facing skills and business development experience. These candidates are applying for FULLTIME positions in client servicing. Evaluate based on professional client management experience and business development skills. IMPORTANT: Candidates with heavy finance/accounting backgrounds should be ranked lower as this role focuses on client relationships, not financial tasks."
      },
      {
        role: "user",
        content: `Evaluate these client servicing resumes based on their suitability for client-facing roles. 
For each resume, I've provided a list of exclusion flags that indicate finance/accounting background.

Important rules:
1. Candidates with MORE exclusion flags should be ranked LOWER
2. Prioritize candidates with client management, sales, and business development experience
3. Penalize candidates with extensive finance/accounting backgrounds
4. Focus on communication skills, relationship building, and business growth experience
5. These are FULLTIME position applicants for CLIENT SERVICING roles

Rate each candidate on a scale of 1-5 stars where:
1 ⭐ - Basic client service skills OR heavy finance/accounting background
2 ⭐⭐ - Working knowledge of client communication with some finance experience
3 ⭐⭐⭐ - Solid account management professional with minimal finance background
4 ⭐⭐⭐⭐ - Senior client servicing manager with proven track record
5 ⭐⭐⭐⭐⭐ - Expert account director/client relationship strategist

EXCLUSION PENALTY SYSTEM:
- 0 exclusion flags: No penalty
- 1-2 exclusion flags: Minor penalty (-0.5 to -1 star)
- 3-5 exclusion flags: Moderate penalty (-1 to -2 stars)
- 6+ exclusion flags: Major penalty (-2 to -3 stars)

Return a JSON object with this structure:
{
  "rankings": [
    {
      "id": number,
      "rating": number (1-5),
      "summary": "Concise overview focusing on client servicing suitability",
      "keySkills": ["client-facing", "skills", "identified"],
      "strengths": ["client servicing", "strengths"],
      "improvements": ["areas for growth in client management"]
    }
  ]
}

Candidates with exclusion flags: ${JSON.stringify(processedApps)}`
      }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };
}

module.exports = {
  detectExclusionFlags,
  generatePrompt
};
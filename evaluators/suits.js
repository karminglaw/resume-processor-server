const EXCLUSION_KEYWORDS = [
	// Job titles
	"finance admin",
	"accounts assistant",
	"accounting clerk",
	"admin assistant",
	"billing clerk",
	"payroll executive",
	"accounting executive",
	"bookkeeper",
	"finance executive",

	// Finance tasks
	"accounts payable",
	"accounts receivable",
	"AP/AR",
	"bank reconciliation",
	"invoice processing",
	"payment processing",
	"data entry (finance)",
	"petty cash",
	"credit note",
	"debit note",
	"full set of accounts",
	"general ledger",
	"GL",
	"audit schedule",
	"payment voucher",
	"cash flow statement",
	"journal entries",
	"tax computation",
	"EPF",
	"SOCSO",
	"EIS",
	"LHDN",
	"PCB",

	// Software tools
	"SQL Accounting",
	"UBS",
	"Autocount",
	"MYOB",
	"QuickBooks",
	"Xero",
	"Million Accounting",
	"Wave Accounting",
	"Financio",
];

function detectExclusionFlags(text) {
	if (!text) {
		console.log("⚠️ Warning: No text content provided for exclusion detection");
		return new Set();
	}

	const lowerText = text.toLowerCase();
	const detectedExclusions = new Set();

	EXCLUSION_KEYWORDS.forEach((keyword) => {
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
	const processedApps = applications.map((app) => ({
		...app,
		detectedExclusionFlags: Array.from(detectExclusionFlags(app.text)),
	}));

	return {
		model: "gpt-4-turbo-preview",
		messages: [
			{
				role: "system",
				content:
					"You are a client servicing role evaluator. You focus on identifying candidates suitable for client-facing roles while flagging those with finance backgrounds.",
			},
			{
				role: "user",
				content: `Evaluate these candidates for client servicing roles. I've detected exclusion flags (finance-related keywords) for each candidate.
  
  Important rules:
  1. Rate candidates based on client-facing experience and communication skills
  2. Apply penalties for candidates with finance backgrounds (detected exclusion flags)
  3. In keySkills, list ONLY the detected exclusion flags (finance-related keywords found)
  4. In strengths, list client-facing strengths and positive attributes
  5. Lower rating if many exclusion flags are present
  
  Rating system with penalties:
  - Base rating 1-5 based on client servicing suitability
  - Apply -0.5 to -2 penalty for exclusion flags:
    - 1-2 flags: -0.5 penalty
    - 3-4 flags: -1.0 penalty  
    - 5+ flags: -2.0 penalty
  
  Return JSON:
  {
    "rankings": [
      {
        "id": number,
        "rating": number (1-5, after penalty),
        "summary": "Client servicing suitability assessment",
        "keySkills": ["list", "of", "detected", "exclusion", "flags"],
        "strengths": ["client-facing", "communication", "strengths"],
        "improvements": ["areas", "for", "development"]
      }
    ]
  }
  
  Candidates: ${JSON.stringify(processedApps)}`,
			},
		],
		temperature: 0.1,
		response_format: { type: "json_object" },
	};
}

module.exports = {
	detectExclusionFlags,
	generatePrompt,
};

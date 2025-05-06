const SKILL_KEYWORDS = {
    design: [
      'photoshop', 'illustrator', 'indesign',
      'figma', 'sketch', 'xd',
      'adobe creative suite', 'creative cloud',
      'canva', 'procreate'
    ],
    multimedia: [
      'after effects', 'premiere pro',
      'final cut pro', 'davinci resolve',
      'motion graphics', 'animation',
      'video editing', 'sound design',
      'photography', 'videography'
    ],
    fundamentals: [
      'typography', 'color theory',
      'layout design', 'composition',
      'branding', 'logo design',
      'visual design', 'graphic design',
      'ui design', 'ux design'
    ],
    digital: [
      'social media design',
      'web design', 'responsive design',
      'digital marketing', 'content creation',
      'email design', 'banner design',
      'instagram', 'tiktok'
    ],
    collaboration: [
      'art direction', 'creative direction',
      'project management',
      'client communication',
      'team collaboration',
      'stakeholder management',
      'creative brief'
    ]
  };
  
  function detectSkills(text) {
    if (!text) {
      console.log('⚠️ Warning: No text content provided for skill detection');
      return new Set();
    }
    
    const lowerText = text.toLowerCase();
    const detectedSkills = new Set();
  
    Object.entries(SKILL_KEYWORDS).forEach(([category, skills]) => {
      skills.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase())) {
          detectedSkills.add(skill);
          console.log(`✓ Detected ${category} skill: ${skill}`);
        }
      });
    });
    
    return detectedSkills;
  }
  
  function generatePrompt(applications, position_type = 'fulltime') {
    const processedApps = applications.map(app => ({
      ...app,
      detectedSkills: Array.from(detectSkills(app.text))
    }));
  
    // Adjust rating criteria based on position_type
    const ratingCriteria = position_type === 'intern' 
      ? `Rate each candidate on a scale of 1-5 stars where:
        1 ⭐ - Very basic creative skills
        2 ⭐⭐ - Some understanding of design principles
        3 ⭐⭐⭐ - Good foundation in creative work
        4 ⭐⭐⭐⭐ - Strong intern candidate with portfolio samples
        5 ⭐⭐⭐⭐⭐ - Exceptional intern with advanced creative skills`
      : `Rate each candidate on a scale of 1-5 stars where:
        1 ⭐ - Basic creative skills
        2 ⭐⭐ - Working knowledge of design tools and principles
        3 ⭐⭐⭐ - Solid creative professional
        4 ⭐⭐⭐⭐ - Senior creative professional
        5 ⭐⭐⭐⭐⭐ - Expert creative director level`;
  
    const positionContext = position_type === 'intern'
      ? "These candidates are applying for INTERN positions. Consider their potential and foundational creative skills rather than extensive professional experience."
      : "These candidates are applying for FULLTIME positions. Evaluate based on professional experience and creative skill level.";
  
    return {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a precise creative professional resume evaluator. Only mention skills and experience that are explicitly stated in the resume. Do not assume or infer skills that aren't directly mentioned. ${positionContext}`
        },
        {
          role: "user",
          content: `Evaluate these creative professional resumes based ONLY on explicitly mentioned skills and experience. 
For each resume, I've provided a list of verified skills that were found in the text.

Important rules:
1. Only mention skills that are in the detectedSkills array
2. Rate candidates based on verified experience only
3. Do not infer or assume additional skills
4. Focus on concrete examples, portfolio work, and projects mentioned
5. Remember these are ${position_type.toUpperCase()} position applicants

${ratingCriteria}

Return a JSON object with this structure:
{
  "rankings": [
    {
      "id": number,
      "rating": number (1-5),
      "summary": "Concise overview using only verified information",
      "keySkills": ["only", "skills", "from", "detectedSkills"],
      "strengths": ["verified", "strengths"],
      "improvements": ["suggested", "areas", "for", "growth"]
    }
  ]
}

Candidates with verified skills: ${JSON.stringify(processedApps)}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    };
  }
  
  module.exports = {
    detectSkills,
    generatePrompt
  }; 
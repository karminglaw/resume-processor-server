const SKILL_KEYWORDS = {
    frameworks: [
      'react', 'reactjs', 'react.js',
      'vue', 'vuejs', 'vue.js',
      'angular', 'angularjs',
      'next.js', 'nextjs',
      'laravel', 'vite',
    ],
    animation: [
      'gsap', 'greensock',
      'framer motion', 'framer-motion',
      'three.js', 'threejs',
      'canvas', 'html5 canvas',
      'webgl', 'web-gl',
      'css animation', 'css3 animation',
      'animation', 'animations'
    ],
    core: [
      'javascript', 'js', 'es6',
      'typescript', 'ts',
      'html', 'html5',
      'css', 'css3',
      'sass', 'scss',
      'git', 'github'
    ],
    state: [
      'redux', 'redux toolkit',
      'mobx', 'mobx-state-tree',
      'recoil',
      'zustand',
      'context api', 'react context'
    ],
    testing: [
      'jest', 'testing library',
      'cypress', 'cypress.io',
      'playwright',
      'unit test', 'integration test'
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
        // Create a regex pattern with word boundaries
        const pattern = new RegExp(`\\b${skill.toLowerCase()}\\b`);
        if (pattern.test(lowerText)) {
          detectedSkills.add(skill);
          console.log(`✓ Detected ${category} skill: ${skill}`);
        }
      });
    });
    
    return detectedSkills;
  }
  
  function generatePrompt(applications) {
    const processedApps = applications.map(app => ({
      ...app,
      detectedSkills: Array.from(detectSkills(app.text))
    }));
  
    return {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a precise frontend developer resume evaluator. Only mention skills that are explicitly stated in the resume. Do not assume or infer skills that aren't directly mentioned."
        },
        {
          role: "user",
          content: `Evaluate these developer resumes based ONLY on explicitly mentioned skills and experience. 
  For each resume, I've provided a list of verified skills that were found in the text.
  
  Important rules:
  1. Only mention skills that are in the detectedSkills array
  2. Rate candidates based on verified experience only
  3. Do not infer or assume additional skills
  4. Focus on concrete examples and projects mentioned
  
  Rate each candidate on a scale of 1-5 stars where:
  1 ⭐ - Basic frontend skills
  2 ⭐⭐ - Working knowledge of React/modern JS
  3 ⭐⭐⭐ - Solid frontend developer
  4 ⭐⭐⭐⭐ - Senior frontend developer
  5 ⭐⭐⭐⭐⭐ - Expert frontend developer
  
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
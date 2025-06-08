require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import evaluators
const developerEvaluator = require('./evaluators/developer');
const creativeEvaluator = require('./evaluators/creative');
const suitsEvaluator = require('./evaluators/suits');

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Resume analysis server is running!');
});

// Debug utilities for application data
function debugApplicationData(applications, evaluator, category) {
  console.log('\n=== Debug: Application Data Analysis ===\n');
  
  applications.forEach((app, index) => {
    console.log(`\n📄 Application ${index + 1} (ID: ${app.id})`);
    console.log('----------------------------------------');
    console.log('Name:', app.name);
    console.log('Text Content Length:', app.text?.length || 0);

    if (app.text) {
      console.log('\nFirst 500 chars:');
      console.log(app.text.substring(0, 500));
      console.log('\n...text continues...\n');
    }

    // Handle different evaluator types
    if (category === 'suits') {
      // For suits evaluator, use detectExclusionFlags
      const exclusionFlags = evaluator.detectExclusionFlags(app.text);
      console.log('🚫 Detected Exclusion Flags:', exclusionFlags);
    } else {
      // For developer/creative evaluators, use detectSkills
      const skills = evaluator.detectSkills(app.text);
      console.log('🔍 Detected Skills:', skills);
    }

    console.log('\n📊 Data Structure:');
    console.log(JSON.stringify({
      id: app.id,
      name: app.name,
      email: app.email,
      textAvailable: Boolean(app.text),
      textLength: app.text?.length || 0,
      ...(category === 'suits' 
        ? { detectedExclusionFlags: Array.from(evaluator.detectExclusionFlags(app.text)) }
        : { detectedSkills: Array.from(evaluator.detectSkills(app.text)) }
      )
    }, null, 2));
    console.log('----------------------------------------\n');
  });
}

// Resume analysis endpoint
app.post('/api/filter-resumes', async (req, res) => {
  // Extract position_type from the first application if not provided directly
  const { applications, category = 'developer' } = req.body;
  const position_type = applications.length > 0 && applications[0].position_type 
    ? applications[0].position_type 
    : 'fulltime';

  console.log('\n=== New Resume Analysis Request ===\n');
  console.log(`Received ${applications?.length || 0} applications for ${category} category (${position_type})`);

  if (!applications?.length) {
    return res.status(400).json({ 
      error: 'Invalid input',
      details: 'No applications provided'
    });
  }

  try {
    // Select evaluator based on category
    let evaluator;
    switch (category) {
      case 'developer':
        evaluator = developerEvaluator;
        break;
      case 'creative':
        evaluator = creativeEvaluator;
        break;
      case 'suits':
        evaluator = suitsEvaluator;
        break;
      default:
        return res.status(400).json({
          error: 'Invalid category',
          details: 'Unsupported job category'
        });
    }

    // Debug incoming data
    debugApplicationData(applications, evaluator, category);
    
    // Pass position_type to the evaluator
    const completion = await openai.chat.completions.create(
      category === 'suits' 
        ? evaluator.generatePrompt(applications)
        : evaluator.generatePrompt(applications, position_type)
    );

    console.log('\n=== GPT Response ===\n');
    console.log(JSON.stringify(completion.choices[0].message.content, null, 2));

    const rankings = JSON.parse(completion.choices[0].message.content);
    
    // Verify skills in GPT response
    const verifiedRankings = {
      rankings: rankings.rankings.map(ranking => {
        const app = applications.find(a => a.id === ranking.id);
        
        if (category === 'suits') {
          // For suits, we don't filter keySkills since it uses exclusion logic
          return ranking;
        } else {
          // For developer/creative, filter keySkills as before
          const detectedSkills = Array.from(evaluator.detectSkills(app.text));
          return {
            ...ranking,
            keySkills: ranking.keySkills.filter(skill => 
              detectedSkills.includes(skill.toLowerCase())
            )
          };
        }
      })
    };

    console.log('\n=== Final Verified Output ===\n');
    console.log(JSON.stringify(verifiedRankings, null, 2));

    res.json(verifiedRankings);

  } catch (error) {
    console.error('\n❌ Server Error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

module.exports = app;
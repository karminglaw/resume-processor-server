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

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Resume analysis server is running!');
});

// Debug utilities for application data
function debugApplicationData(applications, evaluator) {
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

    // Detected skills analysis
    const skills = evaluator.detectSkills(app.text);
    console.log('🔍 Detected Skills:', skills);

    console.log('\n📊 Data Structure:');
    console.log(JSON.stringify({
      id: app.id,
      name: app.name,
      email: app.email,
      textAvailable: Boolean(app.text),
      textLength: app.text?.length || 0,
      detectedSkills: Array.from(skills)
    }, null, 2));
    console.log('----------------------------------------\n');
  });
}

// Resume analysis endpoint
app.post('/api/filter-resumes', async (req, res) => {
  const { applications, category = 'developer' } = req.body;

  console.log('\n=== New Resume Analysis Request ===\n');
  console.log(`Received ${applications?.length || 0} applications for ${category} category`);

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
      default:
        return res.status(400).json({
          error: 'Invalid category',
          details: 'Unsupported job category'
        });
    }

    // Debug incoming data
    debugApplicationData(applications, evaluator);
    
    const completion = await openai.chat.completions.create(
      evaluator.generatePrompt(applications)
    );

    console.log('\n=== GPT Response ===\n');
    console.log(JSON.stringify(completion.choices[0].message.content, null, 2));

    const rankings = JSON.parse(completion.choices[0].message.content);
    
    // Verify skills in GPT response
    const verifiedRankings = {
      rankings: rankings.rankings.map(ranking => {
        const app = applications.find(a => a.id === ranking.id);
        const detectedSkills = Array.from(evaluator.detectSkills(app.text));
        
        return {
          ...ranking,
          keySkills: ranking.keySkills.filter(skill => 
            detectedSkills.includes(skill.toLowerCase())
          )
        };
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
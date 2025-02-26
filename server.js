const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Resume analysis server is running!');
});

// Resume analysis endpoint
app.post('/api/filter-resumes', async (req, res) => {
  try {
    const { applications } = req.body;
    
    if (!applications || !Array.isArray(applications)) {
      return res.status(400).json({ error: 'Invalid request body. Expected an array of applications.' });
    }
    
    console.log(`Received ${applications.length} applications for analysis`);
    
    // Process each application
    const rankings = [];
    for (const app of applications) {
      console.log(`Processing application ${app.id} for ${app.name}`);
      
      // Skip if no text content
      if (!app.text || app.text.length < 50) {
        console.log(`Insufficient text for application ${app.id}, skipping analysis`);
        rankings.push({
          id: app.id,
          rating: 1,
          summary: "Unable to analyze (insufficient text)",
          keySkills: [],
          strengths: [],
          improvements: ["Could not extract enough text from resume to analyze"]
        });
        continue;
      }
      
      // Prepare the resume text (trim if too long)
      const maxTextLength = 6000; // Limit text to avoid exceeding token limits
      const resumeText = app.text.substring(0, maxTextLength);
      
      try {
        // Call OpenAI for analysis
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo", // or "gpt-3.5-turbo" if cost is a concern
          messages: [
            { 
              role: "system", 
              content: `You are an expert HR assistant that analyzes resumes for job applications.
              The candidate is applying for a position in the ${app.team || "unspecified"} team.
              Provide a fair and objective assessment of the resume.`
            },
            { 
              role: "user", 
              content: `Analyze this resume carefully and rate the candidate:
              
              ${resumeText}`
            }
          ],
          functions: [
            {
              name: "analyze_resume",
              description: "Analyze a resume and provide ratings and feedback",
              parameters: {
                type: "object",
                properties: {
                  rating: {
                    type: "number",
                    description: "Rating from 1-5 where 1 is poor fit and 5 is excellent fit"
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of the candidate (max 200 characters)"
                  },
                  keySkills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of key skills identified in the resume (max 5)"
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of candidate strengths (max 3)"
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Areas where the candidate could improve or lacks experience (max 3)"
                  }
                },
                required: ["rating", "summary", "keySkills", "strengths", "improvements"]
              }
            }
          ],
          function_call: { name: "analyze_resume" },
          temperature: 0.5 // Lower temperature for more consistent ratings
        });
        
        // Parse the response
        const functionCall = aiResponse.choices[0].message.function_call;
        const analysis = JSON.parse(functionCall.arguments);
        
        // Add to results with the application ID
        rankings.push({
          id: app.id,
          rating: analysis.rating,
          summary: analysis.summary,
          keySkills: analysis.keySkills,
          strengths: analysis.strengths,
          improvements: analysis.improvements
        });
        
        console.log(`Successfully analyzed application ${app.id} with rating ${analysis.rating}`);
      } catch (aiError) {
        console.error(`Error analyzing application ${app.id}:`, aiError);
        
        // Add a fallback rating if AI analysis fails
        rankings.push({
          id: app.id,
          rating: 1,
          summary: "Error during analysis",
          keySkills: [],
          strengths: [],
          improvements: ["An error occurred during AI analysis"]
        });
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Return the results
    console.log(`Analysis complete. Returning ${rankings.length} rankings.`);
    return res.status(200).json({ rankings });
    
  } catch (error) {
    console.error('Error in filter-resumes function:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze applications', 
      message: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
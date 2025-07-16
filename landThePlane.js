const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Lands the plane by processing completed DataForSEO tasks and extracting SERP results
 * @param {Object} dataForSeoConfig - Configuration object containing Authorization token
 * @returns {Object} Object with same structure as takeoff-output.json but with ranking data instead of task IDs
 */
async function landThePlane(dataForSeoConfig) {
  // Read the Take Off JSON file
  const takeOffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'takeoff-output.json'), 'utf-8'));
  console.log('📖 Loaded Take Off data from file');
  
  // Initialize results with same structure as takeoff-output.json
  const results = {};

  // Process each location
  for (const [location, items] of Object.entries(takeOffData)) {
    console.log(`Processing results for location: ${location}`);
    results[location] = [];
    
    // Process each item within the location
    for (const item of items) {
      const { service, keywords } = item;
      console.log(`Processing ${service} results...`);
      
      // Create new item with same structure
      const newItem = { service, keywords: {} };

      // Process each keyword
      for (const [keyword, keywordData] of Object.entries(keywords)) {
        const { task_id, status } = keywordData;
        
        if (status === "submitted" && task_id) {
          console.log(`Checking results for keyword: "${keyword}" (Task ID: ${task_id})`);
          
          try {
            // Poll for task completion and get results
            const serpResults = await getSerpResults(task_id, dataForSeoConfig);
            
            if (serpResults && serpResults.length > 0) {
              // Extract ranking data
              const rankingData = extractRankingData(serpResults);
              
              // Add ranking data to keywords object (replacing task_id/status)
              newItem.keywords[keyword] = {
                status: "completed",
                rankings: rankingData
              };
              
              console.log(`✅ Successfully processed "${keyword}" - found ${rankingData.length} results`);
            } else {
              console.log(`⚠️ No results found for keyword: "${keyword}"`);
              newItem.keywords[keyword] = {
                status: "completed",
                rankings: []
              }; // Empty array for no results
            }
            
          } catch (error) {
            console.log(`❌ Error processing keyword "${keyword}": ${error.message}`);
            newItem.keywords[keyword] = {
              status: "error",
              rankings: []
            }; // Empty array for errors
          }
        } else {
          console.log(`⚠️ Skipping keyword "${keyword}" - status: ${status}`);
          newItem.keywords[keyword] = {
            status: "skipped",
            rankings: []
          }; // Empty array for skipped keywords
        }
      }
      
      // Add the processed item to the location
      results[location].push(newItem);
    }
  }

  return results;
}

/**
 * Polls DataForSEO API for task completion and retrieves SERP results
 * @param {string} taskId - The DataForSEO task ID
 * @param {Object} config - DataForSEO configuration
 * @returns {Array} SERP results array
 */
async function getSerpResults(taskId, config) {
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `https://api.dataforseo.com/v3/serp/google/organic/task_get/regular/${taskId}`,
        {
          headers: {
            'Authorization': config.Authorization
          }
        }
      );

      const task = response.data.tasks[0];
      
      if (task.result && task.result.length > 0) {
        console.log(`Task ${taskId} completed successfully`);
        return task.result;
      } else {
        console.log(`Task ${taskId} not ready yet, polling again... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        attempts++;
      }
    } catch (error) {
      console.log(`Error polling task ${taskId}: ${error.message}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  throw new Error(`Task ${taskId} did not complete within the expected time`);
}

/**
 * Extracts ranking data from SERP results, filtering for aaacwildliferemoval.com domain
 * @param {Array} serpResults - Raw SERP results from DataForSEO
 * @returns {Array} Array of ranking objects with rank and URL (only for our domain)
 */
function extractRankingData(serpResults) {
  const rankings = [];
  let totalResults = 0;
  let ourDomainResults = 0;
  
  for (const result of serpResults) {
    if (result.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        // Look for organic results with rank_group and url
        if (item.type === "organic" && item.rank_group && item.url) {
          totalResults++;
          
          // Filter for our domain (any subdomain of aaacwildliferemoval.com)
          if (item.url.includes('aaacwildliferemoval.com')) {
            rankings.push({
              rank: item.rank_group,
              url: item.url
            });
            ourDomainResults++;
          }
        }
      }
    }
  }
  
  console.log(`📊 Found ${totalResults} total results, ${ourDomainResults} from our domain`);
  
  return rankings;
}

// Run landing if this file is executed directly
if (require.main === module) {
  // Read DataForSEO configuration
  const dataForSeoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_for_seo.json'), 'utf-8'));
  
  // Landing phase execution
  async function landing() {
    try {
      console.log('🛬 Starting LANDING phase...');
      
      // Check if takeoff file exists
      if (!fs.existsSync(path.join(__dirname, 'takeoff-output.json'))) {
        console.error('❌ No takeoff-output.json found. Please run takeoff phase first.');
        return;
      }
      
      // Land the plane and get SERP results
      const serpResults = await landThePlane(dataForSeoConfig);
      fs.writeFileSync(path.join(__dirname, 'landing-results.json'), JSON.stringify(serpResults, null, 2));
      console.log('✅ LANDING COMPLETE! SERP results written to landing-results.json');
      
    } catch (error) {
      console.error('Error in landing phase:', error);
    }
  }
  
  // Run landing
  landing();
}

module.exports = landThePlane; 
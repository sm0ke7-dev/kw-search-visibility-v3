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
  
  // Load existing checkpoint if available
  const results = loadCheckpoint(takeOffData);
  const totalKeywords = countTotalKeywords(takeOffData);
  let processedCount = countProcessedKeywords(results);
  
  console.log(`🔄 Starting landing phase - ${processedCount}/${totalKeywords} keywords already processed`);
  
  // Process each location
  for (const [location, items] of Object.entries(takeOffData)) {
    console.log(`Processing results for location: ${location}`);
    
    if (!results[location]) {
      results[location] = [];
    }
    
    // Process each item within the location
    for (const item of items) {
      const { service, keywords } = item;
      console.log(`Processing ${service} results...`);
      
      // Find existing item or create new one
      let newItem = results[location].find(existing => existing.service === service);
      if (!newItem) {
        // Get the original item data from takeoff to preserve all fields
        const originalItem = items.find(item => item.service === service);
        newItem = { 
          location: originalItem.location,
          service: originalItem.service,
          intended_url: originalItem.intended_url,
          geo_coordinate: originalItem.geo_coordinate,
          keywords: {} 
        };
        results[location].push(newItem);
      }

      // Process each keyword
      for (const [keyword, keywordData] of Object.entries(keywords)) {
        const { task_id, status } = keywordData;
        
        // Skip if already completed
        if (newItem.keywords[keyword] && newItem.keywords[keyword].status === "completed") {
          continue;
        }
        
        if (status === "submitted" && task_id) {
          console.log(`Checking results for keyword: "${keyword}" (Task ID: ${task_id})`);
          
          try {
            // Poll for task completion and get results
            const serpResults = await getSerpResults(task_id, dataForSeoConfig);
            
            if (serpResults && serpResults.length > 0) {
              // Extract ranking data
              const rankingData = extractRankingData(serpResults);
              
              // Add ranking data to keywords object
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
              };
            }
            
          } catch (error) {
            console.log(`❌ Error processing keyword "${keyword}": ${error.message}`);
            newItem.keywords[keyword] = {
              status: "error",
              rankings: []
            };
          }
          
          processedCount++;
          
          // Display progress for every keyword
          const percentage = ((processedCount / totalKeywords) * 100).toFixed(1);
          console.log(`📊 Progress: ${processedCount}/${totalKeywords} keywords (${percentage}%)`);
          
          // Save checkpoint every 20 keywords
          if (processedCount % 20 === 0) {
            saveCheckpoint(results, processedCount, totalKeywords);
          }
          
        } else {
          console.log(`⚠️ Skipping keyword "${keyword}" - status: ${status}`);
          newItem.keywords[keyword] = {
            status: "skipped",
            rankings: []
          };
          processedCount++;
          
          // Display progress for skipped keywords too
          const percentage = ((processedCount / totalKeywords) * 100).toFixed(1);
          console.log(`📊 Progress: ${processedCount}/${totalKeywords} keywords (${percentage}%)`);
        }
      }
    }
  }

  // Final save
  saveCheckpoint(results, processedCount, totalKeywords);
  console.log(`🎉 Landing complete! Processed ${processedCount}/${totalKeywords} keywords`);
  
  return results;
}

/**
 * Loads existing checkpoint data if available
 * @param {Object} takeOffData - Original takeoff data structure
 * @returns {Object} Merged results with existing checkpoint data
 */
function loadCheckpoint(takeOffData) {
  const checkpointPath = path.join(__dirname, 'landing-results.json');
  
  if (fs.existsSync(checkpointPath)) {
    try {
      const existingResults = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
      console.log('📂 Found existing checkpoint - resuming from previous state');
      return existingResults;
    } catch (error) {
      console.log('⚠️ Error reading checkpoint, starting fresh');
    }
  }
  
  // Initialize empty structure matching takeoff data with all required fields
  const results = {};
  for (const [location, items] of Object.entries(takeOffData)) {
    results[location] = [];
    // Pre-populate with the structure and fields from takeoff data
    for (const item of items) {
      results[location].push({
        location: item.location,
        service: item.service,
        intended_url: item.intended_url,
        geo_coordinate: item.geo_coordinate,
        keywords: {}
      });
    }
  }
  
  return results;
}

/**
 * Saves current progress to checkpoint file
 * @param {Object} results - Current results data
 * @param {number} processedCount - Number of keywords processed
 * @param {number} totalKeywords - Total number of keywords
 */
function saveCheckpoint(results, processedCount, totalKeywords) {
  const checkpointPath = path.join(__dirname, 'landing-results.json');
  fs.writeFileSync(checkpointPath, JSON.stringify(results, null, 2));
  
  const percentage = ((processedCount / totalKeywords) * 100).toFixed(1);
  console.log(`💾 Checkpoint saved: ${processedCount}/${totalKeywords} keywords (${percentage}%)`);
}

/**
 * Counts total keywords in takeoff data
 * @param {Object} takeOffData - Takeoff data structure
 * @returns {number} Total keyword count
 */
function countTotalKeywords(takeOffData) {
  let count = 0;
  for (const [location, items] of Object.entries(takeOffData)) {
    for (const item of items) {
      count += Object.keys(item.keywords).length;
    }
  }
  return count;
}

/**
 * Counts already processed keywords in results
 * @param {Object} results - Current results data
 * @returns {number} Count of completed keywords
 */
function countProcessedKeywords(results) {
  let count = 0;
  for (const [location, items] of Object.entries(results)) {
    for (const item of items) {
      for (const [keyword, keywordData] of Object.entries(item.keywords)) {
        if (keywordData.status === "completed") {
          count++;
        }
      }
    }
  }
  return count;
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
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Lands the plane by processing completed DataForSEO tasks and extracting SERP results
 * @param {Object} takeOffData - The Take Off JSON object containing task IDs
 * @param {Object} dataForSeoConfig - Configuration object containing Authorization token
 * @returns {Array} Array of keyword results with rankings and URLs
 */
async function landThePlane(takeOffData, dataForSeoConfig) {
  const results = [];

  // Process each location
  for (const [location, items] of Object.entries(takeOffData)) {
    console.log(`Processing results for location: ${location}`);
    
    // Process each item within the location
    for (const item of items) {
      const { service, keywords } = item;
      console.log(`Processing ${service} results...`);

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
              
              // Add to results in the desired format
              results.push({
                [keyword]: rankingData
              });
              
              console.log(`✅ Successfully processed "${keyword}" - found ${rankingData.length} results`);
            } else {
              console.log(`⚠️ No results found for keyword: "${keyword}"`);
            }
            
          } catch (error) {
            console.log(`❌ Error processing keyword "${keyword}": ${error.message}`);
          }
        } else {
          console.log(`⚠️ Skipping keyword "${keyword}" - status: ${status}`);
        }
      }
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
 * Extracts ranking data from SERP results
 * @param {Array} serpResults - Raw SERP results from DataForSEO
 * @returns {Array} Array of ranking objects with rank and URL
 */
function extractRankingData(serpResults) {
  const rankings = [];
  
  for (const result of serpResults) {
    if (result.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        // Look for organic results with rank_group and url
        if (item.type === "organic" && item.rank_group && item.url) {
          rankings.push({
            rank: item.rank_group,
            url: item.url
          });
        }
      }
    }
  }
  
  return rankings;
}

module.exports = landThePlane; 
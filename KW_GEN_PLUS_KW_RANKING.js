/**
 * Google Apps Script for Keyword Generation + Ranking
 * Generates keyword combinations using templates from spreadsheet data
 * and checks rankings using DataForSEO API
 * 
 * Usage: Run generateKeywords() or generateKeywordsWithRankings() function from Apps Script editor
 */

// =============================================================================
// DATAFORSEO API CONFIGURATION
// =============================================================================

/**
 * DataForSEO API Configuration
 * Reads API key from Script Properties (Project Settings > Script Properties)
 */
function getDataForSEOConfig() {
  const basicAuth = PropertiesService.getScriptProperties().getProperty('basic');
  
  if (!basicAuth) {
    throw new Error('DataForSEO API key not found! Please add "basic" property in Project Settings > Script Properties');
  }
  
  return {
    Authorization: `Basic ${basicAuth}`,
    baseUrl: 'https://api.dataforseo.com/v3/serp/google/organic',
    taskPostUrl: 'https://api.dataforseo.com/v3/serp/google/organic/task_post',
    taskGetUrl: 'https://api.dataforseo.com/v3/serp/google/organic/task_get/regular'
  };
}

// =============================================================================
// DATAFORSEO RANKING FUNCTIONS
// =============================================================================

/**
 * Submit a single keyword ranking job to DataForSEO
 * @param {string} keyword - The keyword to check
 * @param {string} location - The location for geo-targeting
 * @param {string} geoCoordinate - Latitude,longitude coordinates
 * @returns {string|null} Task ID if successful, null if failed
 */
function submitKeywordRankingJob(keyword, location, geoCoordinate) {
  try {
    const config = getDataForSEOConfig();
    
    // Prepare POST data for desktop ranking
    const postData = [{
      "keyword": keyword,
      "location_coordinate": geoCoordinate,
      "language_code": "en",
      "device": "desktop",
      "os": "windows"
    }];
    
    console.log(`📤 Submitting ranking job for: "${keyword}" in ${location}`);
    
    // Make API call
    const response = UrlFetchApp.fetch(config.taskPostUrl, {
      method: 'POST',
      headers: {
        'Authorization': config.Authorization,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(postData)
    });
    
    const responseData = JSON.parse(response.getContentText());
    const taskId = responseData.tasks[0].id;
    
    console.log(`✅ Ranking job submitted successfully: ${taskId}`);
    return taskId;
    
  } catch (error) {
    console.error(`❌ Failed to submit ranking job for "${keyword}":`, error);
    return null;
  }
}

/**
 * Fetch ranking results from DataForSEO
 * @param {string} taskId - The task ID to fetch results for
 * @returns {Object|null} Ranking results or null if failed
 */
function fetchKeywordRankingResults(taskId) {
  try {
    const config = getDataForSEOConfig();
    
    console.log(`📥 Fetching ranking results for task: ${taskId}`);
    
    // Fetch results for this task
    const response = UrlFetchApp.fetch(
      `${config.taskGetUrl}/${taskId}`,
      {
        headers: { 'Authorization': config.Authorization }
      }
    );
    
    const responseData = JSON.parse(response.getContentText());
    const taskResult = responseData.tasks[0];
    
    if (taskResult.result && taskResult.result.length > 0) {
      // Extract ranking data for aaacwildliferemoval.com domain
      const rankings = extractKeywordRankingData(taskResult.result);
      
      console.log(`✅ Ranking results fetched: Found ${rankings.length} domain matches`);
      return {
        rankings: rankings,
        status: 'completed',
        rawData: taskResult
      };
    } else {
      console.log(`⚠️ No ranking results found for task: ${taskId}`);
      return {
        rankings: [],
        status: 'no_results',
        rawData: taskResult
      };
    }
    
  } catch (error) {
    console.error(`❌ Failed to fetch ranking results for task ${taskId}:`, error);
    return {
      rankings: [],
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Extract ranking data from SERP results, looking for aaacwildliferemoval.com domain
 * @param {Array} serpResults - Raw SERP results from DataForSEO
 * @returns {Array} Array of ranking objects with rank and URL
 */
function extractKeywordRankingData(serpResults) {
  const rankings = [];
  const targetDomain = 'aaacwildliferemoval.com';
  
  console.log(`🔍 Searching for ${targetDomain} in SERP results`);
  
  for (const result of serpResults) {
    if (result.items && Array.isArray(result.items)) {
      for (let i = 0; i < result.items.length; i++) {
        const item = result.items[i];
        
        if (item.type === "organic" && item.rank_group && item.url) {
          // Look for any URL containing the target domain
          if (item.url.includes(targetDomain)) {
            console.log(`✅ MATCH FOUND! Rank ${item.rank_group}: ${item.url}`);
            rankings.push({
              rank: item.rank_group,
              url: item.url
            });
          }
        }
      }
    }
  }
  
  console.log(`📈 Total domain matches found: ${rankings.length}`);
  return rankings;
}

// =============================================================================
// MAIN KEYWORD GENERATION + RANKING FUNCTION
// =============================================================================

/**
 * Generate keywords with ranking checks (row-by-row processing)
 * This is the main function for Milestone 1
 */
function generateKeywordsWithRankings() {
  try {
    console.log('🚀 Starting keyword generation with rankings...');
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Clear previous results if they exist
    clearPreviousResults(sheet);
    
    // Read data from the sheet
    const data = readSheetData(sheet);
    
    if (!data.keywords.length || !data.locations.length || !data.templates.length) {
      SpreadsheetApp.getUi().alert('Error: Missing data. Please ensure you have keywords, locations, and templates in the correct columns.');
      return;
    }
    
    console.log(`📊 Found ${data.keywords.length} keywords, ${data.locations.length} locations, ${data.templates.length} templates`);
    
    // Generate keyword combinations
    const keywordResults = generateKeywordCombinations(data);
    console.log(`✅ Generated ${keywordResults.length} keyword combinations`);
    
    // Process each keyword with ranking (row-by-row)
    const resultsWithRankings = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    // Add limit for testing (set to 0 for no limit)
    const TEST_LIMIT = 20; // 🧪 TEST LIMIT: Change this number (20 = test mode, 0 = process all)
    const keywordsToProcess = TEST_LIMIT > 0 ? keywordResults.slice(0, TEST_LIMIT) : keywordResults;
    
    // Show progress dialog
    const ui = SpreadsheetApp.getUi();
    const totalKeywords = keywordResults.length;
    const processingCount = keywordsToProcess.length;
    
    if (TEST_LIMIT > 0 && totalKeywords > TEST_LIMIT) {
      ui.alert('🧪 Test Mode', `Processing ${processingCount} of ${totalKeywords} keywords (TEST LIMIT: ${TEST_LIMIT}). This will take about ${Math.ceil(processingCount * 1.5)} minutes.`, ui.ButtonSet.OK);
    } else {
      ui.alert('⏳ Processing Keywords', `Starting row-by-row processing of ${processingCount} keywords. This will take about ${Math.ceil(processingCount * 1.5)} minutes.`, ui.ButtonSet.OK);
    }
    
    for (const keywordResult of keywordsToProcess) {
      processed++;
      console.log(`\n🔄 Processing ${processed}/${processingCount}: "${keywordResult.generatedKeyword}"`);
      
      try {
        // For now, use a default geo coordinate (Houston, TX)
        // TODO: In future milestones, we'll add proper geo coordinate lookup
        const geoCoordinate = "29.7604,-95.3698"; // Houston, TX coordinates
        
        // Submit ranking job
        const taskId = submitKeywordRankingJob(
          keywordResult.generatedKeyword, 
          keywordResult.location, 
          geoCoordinate
        );
        
        if (!taskId) {
          console.log(`❌ Failed to submit job for: ${keywordResult.generatedKeyword}`);
          failed++;
          resultsWithRankings.push({
            ...keywordResult,
            ranking: null,
            rankingUrl: null,
            status: 'submission_failed'
          });
          continue;
        }
        
        // Wait 1 minute for DataForSEO to process
        console.log(`⏳ Waiting 1 minute for DataForSEO to process...`);
        Utilities.sleep(1 * 60 * 1000); // 1 minute
        
        // Fetch results
        const rankingResults = fetchKeywordRankingResults(taskId);
        
        if (rankingResults && rankingResults.rankings.length > 0) {
          // Get the best ranking (lowest rank number)
          const bestRanking = rankingResults.rankings.reduce((best, current) =>
            current.rank < best.rank ? current : best
          );
          
          console.log(`✅ Found ranking: Position ${bestRanking.rank} - ${bestRanking.url}`);
          
          resultsWithRankings.push({
            ...keywordResult,
            ranking: bestRanking.rank,
            rankingUrl: bestRanking.url,
            status: 'success'
          });
          successful++;
        } else {
          console.log(`⚠️ No ranking found for: ${keywordResult.generatedKeyword}`);
          resultsWithRankings.push({
            ...keywordResult,
            ranking: 'Not Found',
            rankingUrl: 'Not Found',
            status: 'no_ranking'
          });
          failed++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${keywordResult.generatedKeyword}":`, error);
        resultsWithRankings.push({
          ...keywordResult,
          ranking: 'Error',
          rankingUrl: 'Error',
          status: 'error',
          error: error.message
        });
        failed++;
      }
    }
    
    // Write results to sheet
    writeRankingResultsToSheet(sheet, resultsWithRankings);
    
    // Show completion message
    const summary = `Keyword generation with rankings complete!\n\nProcessed: ${processed}\nSuccessful: ${successful}\nFailed: ${failed}`;
    console.log(`\n✅ ${summary}`);
    ui.alert('✅ Complete!', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('Error in keyword generation with rankings:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Check rankings for existing keywords in the sheet (doesn't regenerate keywords)
 * Reads keywords from Column H and adds ranking data
 */
function checkRankingsOnly() {
  try {
    console.log('📊 Starting ranking check for existing keywords...');
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Read existing keywords from Column H and their location data
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('Error: No keywords found in Column K. Please generate keywords first.');
      return;
    }
    
    // Get keywords from Column K and coordinates from Columns I, J
    const dataRange = sheet.getRange(2, 9, lastRow - 1, 3); // Columns I, J, K
    const dataValues = dataRange.getValues();
    
    // Process each row to get keyword with its coordinates
    const keywordData = [];
    for (let i = 0; i < dataValues.length; i++) {
      const row = dataValues[i];
      const lat = row[0]; // Column I (lat)
      const lng = row[1]; // Column J (long)
      const keyword = row[2]; // Column K
      
      if (keyword && keyword.toString().trim() && 
          lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        keywordData.push({
          keyword: keyword.toString().trim(),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          geoCoordinate: `${lat},${lng}`
        });
      }
    }
    
    if (keywordData.length === 0) {
      SpreadsheetApp.getUi().alert('Error: No valid keywords with coordinates found. Please ensure you have keywords in Column K and valid lat/long in Columns I & J.');
      return;
    }
    
    console.log(`📊 Found ${keywordData.length} keywords with coordinates`);
    
    // Filter out already checked keywords first
    const uncheckedKeywords = [];
    for (let i = 0; i < keywordData.length; i++) {
      const rowNumber = i + 2; // +2 because we start from row 2
      if (!hasRankingData(sheet, rowNumber)) {
        uncheckedKeywords.push({
          ...keywordData[i],
          rowIndex: rowNumber
        });
      }
    }
    
    console.log(`📊 Found ${uncheckedKeywords.length} unchecked keywords out of ${keywordData.length} total`);
    
    if (uncheckedKeywords.length === 0) {
      SpreadsheetApp.getUi().alert('✅ All Done!', 'All keywords have already been checked for rankings.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Add limit for testing
    const TEST_LIMIT = 20; // 🧪 TEST LIMIT: Change this number
    const keywordsToProcess = TEST_LIMIT > 0 ? uncheckedKeywords.slice(0, TEST_LIMIT) : uncheckedKeywords;
    
    // Set up headers first
    setupRankingHeaders(sheet);
    
    // Show progress dialog
    const ui = SpreadsheetApp.getUi();
    const totalKeywords = keywordData.length;
    const uncheckedCount = uncheckedKeywords.length;
    const processingCount = keywordsToProcess.length;
    const batchSize = 10;
    const totalBatches = Math.ceil(processingCount / batchSize);
    
    if (TEST_LIMIT > 0 && uncheckedCount > TEST_LIMIT) {
      ui.alert('🧪 Test Mode - Batch Processing', `Processing ${processingCount} of ${uncheckedCount} unchecked keywords (${totalKeywords} total) in ${totalBatches} batches of ${batchSize} (TEST LIMIT: ${TEST_LIMIT}).\n\n⏱️ This will take about ${totalBatches * 2.5} minutes.`, ui.ButtonSet.OK);
    } else {
      ui.alert('📊 Batch Processing Rankings', `Processing ${processingCount} unchecked keywords (${totalKeywords} total) in ${totalBatches} batches of ${batchSize}.\n\n⏱️ This will take about ${totalBatches * 2.5} minutes.`, ui.ButtonSet.OK);
    }
    
    // Process keywords in batches
    const taskResults = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, processingCount);
      const batchKeywords = keywordsToProcess.slice(startIndex, endIndex);
      
      // Update progress in sheet
      sheet.getRange(1, 12).setValue(`🔄 Processing Batch ${batchIndex + 1}/${totalBatches}...`);
      sheet.getRange(1, 12).setBackground('#fff2cc');
      
      console.log(`\n📦 Processing Batch ${batchIndex + 1}/${totalBatches} (${batchKeywords.length} keywords)`);
      
      // Phase 1: Submit all keywords in this batch (all are unchecked)
      const batchTaskIds = [];
      for (let i = 0; i < batchKeywords.length; i++) {
        const keywordInfo = batchKeywords[i];
        const actualRowNumber = keywordInfo.rowIndex; // Already calculated in filtering
        
        processed++;
        console.log(`📤 Submitting ${processed}/${processingCount}: "${keywordInfo.keyword}" (Row ${actualRowNumber})`);
        
        try {
          const taskId = submitKeywordRankingJob(keywordInfo.keyword, 'Location', keywordInfo.geoCoordinate);
          if (taskId) {
            batchTaskIds.push({
              taskId: taskId,
              keywordInfo: keywordInfo,
              rowIndex: actualRowNumber
            });
            console.log(`✅ Submitted: ${taskId}`);
          } else {
            console.log(`❌ Failed to submit: ${keywordInfo.keyword}`);
            failed++;
            // Write failed result immediately
            writeSingleRankingResult(sheet, actualRowNumber, {
              generatedKeyword: keywordInfo.keyword,
              ranking: null,
              rankingUrl: null
            });
          }
        } catch (error) {
          console.error(`❌ Error submitting "${keywordInfo.keyword}":`, error);
          failed++;
          writeSingleRankingResult(sheet, actualRowNumber, {
            generatedKeyword: keywordInfo.keyword,
            ranking: 'Error',
            rankingUrl: 'Error'
          });
        }
      }
      
      if (batchTaskIds.length === 0) {
        console.log(`⚠️ No successful submissions in batch ${batchIndex + 1}`);
        continue;
      }
      
      // Update progress in sheet
      sheet.getRange(1, 12).setValue(`⏳ Waiting 2 minutes for batch ${batchIndex + 1}...`);
      sheet.getRange(1, 12).setBackground('#ffe6cc');
      
      // Phase 2: Wait 2 minutes for DataForSEO to process this batch
      console.log(`⏳ Waiting 2 minutes for DataForSEO to process batch ${batchIndex + 1}...`);
      Utilities.sleep(2 * 60 * 1000); // 2 minutes
      
      // Phase 3: Fetch results for this batch
      sheet.getRange(1, 12).setValue(`📥 Fetching results for batch ${batchIndex + 1}...`);
      sheet.getRange(1, 12).setBackground('#e6f3ff');
      
      console.log(`📥 Fetching results for batch ${batchIndex + 1}...`);
      
      for (const taskData of batchTaskIds) {
        try {
          const rankingResults = fetchKeywordRankingResults(taskData.taskId);
          
          if (rankingResults && rankingResults.rankings.length > 0) {
            // Get the best ranking (lowest rank number)
            const bestRanking = rankingResults.rankings.reduce((best, current) =>
              current.rank < best.rank ? current : best
            );
            
            console.log(`✅ Found ranking: Position ${bestRanking.rank} - ${bestRanking.url}`);
            
            // Write result immediately
            writeSingleRankingResult(sheet, taskData.rowIndex, {
              generatedKeyword: taskData.keywordInfo.keyword,
              ranking: bestRanking.rank,
              rankingUrl: bestRanking.url
            });
            successful++;
          } else {
            console.log(`⚠️ No ranking found for: ${taskData.keywordInfo.keyword}`);
            
            // Write result immediately
            writeSingleRankingResult(sheet, taskData.rowIndex, {
              generatedKeyword: taskData.keywordInfo.keyword,
              ranking: 'Not Found',
              rankingUrl: 'Not Found'
            });
            failed++;
          }
        } catch (error) {
          console.error(`❌ Error fetching results for "${taskData.keywordInfo.keyword}":`, error);
          
          // Write result immediately
          writeSingleRankingResult(sheet, taskData.rowIndex, {
            generatedKeyword: taskData.keywordInfo.keyword,
            ranking: 'Error',
            rankingUrl: 'Error'
          });
          failed++;
        }
      }
      
      // Update progress in sheet
      sheet.getRange(1, 12).setValue(`✅ Completed batch ${batchIndex + 1}/${totalBatches} (${successful} successful, ${failed} failed, ${skipped} skipped)`);
      sheet.getRange(1, 12).setBackground('#d4edda');
      
      console.log(`✅ Completed batch ${batchIndex + 1}/${totalBatches}`);
    }
    
    // Clear progress cell and show completion message
    sheet.getRange(1, 12).setValue('');
    sheet.getRange(1, 12).setBackground(null);
    
    const summary = `Ranking check complete!\n\nProcessed: ${processed}\nSuccessful: ${successful}\nFailed: ${failed}\nSkipped: ${skipped}`;
    console.log(`\n✅ ${summary}`);
    ui.alert('✅ Complete!', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('Error in ranking check:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Write ranking results starting from Column I (to avoid overwriting existing keywords)
 */
function writeRankingResultsToSheetFromColumnI(sheet, results) {
  // Start from Column I (9) to avoid overwriting keywords in Column H
  const startCol = 9; // Column I
  
  // Create headers for ranking results
  const headers = [
    'Location',
    'Ranking Position',
    'Ranking URL',
    'Status'
  ];
  
  // Write headers
  const headerRange = sheet.getRange(1, startCol, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#28a745'); // Green for ranking results
  headerRange.setFontColor('white');
  
  // Prepare data rows
  const dataRows = results.map(result => [
    result.location,
    result.ranking || 'Not Found',
    result.rankingUrl || 'Not Found',
    result.status || 'Unknown'
  ]);
  
  // Write data
  if (dataRows.length > 0) {
    const dataRange = sheet.getRange(2, startCol, dataRows.length, headers.length);
    dataRange.setValues(dataRows);
    
    // Auto-resize columns
    for (let i = 0; i < headers.length; i++) {
      sheet.autoResizeColumn(startCol + i);
    }
    
    // Add alternating row colors for readability
    const range = sheet.getRange(2, startCol, dataRows.length, headers.length);
    const backgrounds = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      backgrounds.push(new Array(headers.length).fill(rowColor));
    }
    range.setBackgrounds(backgrounds);
    
    // Add color coding for status
    for (let i = 0; i < dataRows.length; i++) {
      const status = results[i].status;
      const statusCol = startCol + 3; // Status column (L)
      
      if (status === 'success') {
        sheet.getRange(i + 2, statusCol).setBackground('#d4edda'); // Light green
      } else if (status === 'no_ranking') {
        sheet.getRange(i + 2, statusCol).setBackground('#fff3cd'); // Light yellow
      } else if (status === 'error' || status === 'submission_failed') {
        sheet.getRange(i + 2, statusCol).setBackground('#f8d7da'); // Light red
      }
    }
  }
  
  console.log(`📝 Ranking results written to columns ${startCol} through ${startCol + headers.length - 1}`);
}

/**
 * Check if a keyword already has ranking data
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to check
 * @returns {boolean} - True if ranking data exists, false otherwise
 */
function hasRankingData(sheet, row) {
  const startCol = 13; // Column M (first ranking result column)
  const numCols = 2; // Columns M, N
  
  // Get the range for ranking data columns
  const range = sheet.getRange(row, startCol, 1, numCols);
  const values = range.getValues()[0];
  
  // Check if any of the ranking columns have data
  return values.some(value => value && value.toString().trim() !== '');
}

/**
 * Set up ranking headers in the sheet
 */
function setupRankingHeaders(sheet) {
  const startCol = 13; // Column M
  const headers = ['Ranking Position', 'Ranking URL'];
  
  // Write headers
  const headerRange = sheet.getRange(1, startCol, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#28a745'); // Green for ranking results
  headerRange.setFontColor('white');
}

/**
 * Write a single ranking result immediately to the sheet
 */
function writeSingleRankingResult(sheet, row, result) {
  const startCol = 13; // Column M
  
  // Write the data for this specific row
  const rowData = [
    result.ranking || 'Not Found',
    result.rankingUrl || 'Not Found'
  ];
  
  // Write to the specific row
  sheet.getRange(row, startCol, 1, rowData.length).setValues([rowData]);
  
  console.log(`📝 Written result for row ${row}: ${result.ranking || 'Not Found'}`);
}

function generateKeywords() {
  try {
    console.log('🚀 Starting keyword generation...');
    
    // Get the active spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Clear previous results if they exist
    clearPreviousResults(sheet);
    
    // Read data from the sheet
    const data = readSheetData(sheet);
    
    if (!data.keywords.length || !data.locations.length || !data.templates.length) {
      SpreadsheetApp.getUi().alert('Error: Missing data. Please ensure you have keywords, locations, and templates in the correct columns.');
      return;
    }
    
    console.log(`📊 Found ${data.keywords.length} keywords, ${data.locations.length} locations, ${data.templates.length} templates`);
    
    // Generate keyword combinations
    const results = generateKeywordCombinations(data);
    
    console.log(`✅ Generated ${results.length} keyword combinations`);
    
    // Write results to sheet
    writeResultsToSheet(sheet, results);
    
    // Show completion message
    SpreadsheetApp.getUi().alert(`Keyword generation complete! Generated ${results.length} keyword combinations.`);
    
  } catch (error) {
    console.error('Error in keyword generation:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Read data from the spreadsheet
 * Assumes:
 * - Column A: Services
 * - Column B: Keywords  
 * - Column D: Locations
 * - Column F: Templates
 */
function readSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  // Get all data from the sheet
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  
  const data = {
    keywords: [],
    locations: [],
    templates: [],
    services: []
  };
  
  // Read keywords from Column B (index 1)
  for (let i = 1; i < values.length; i++) {
    const keyword = values[i][1]; // Column B
    const service = values[i][0]; // Column A
    if (keyword && keyword.toString().trim()) {
      data.keywords.push(keyword.toString().trim());
      data.services.push(service ? service.toString().trim() : '');
    }
  }
  
  // Read locations from Column D (index 3)
  for (let i = 1; i < values.length; i++) {
    const location = values[i][3]; // Column D
    if (location && location.toString().trim()) {
      data.locations.push(location.toString().trim());
    }
  }
  
  // Read templates from Column F (index 5)
  for (let i = 1; i < values.length; i++) {
    const template = values[i][5]; // Column F
    if (template && template.toString().trim()) {
      data.templates.push(template.toString().trim());
    }
  }
  
  // Remove duplicates
  data.keywords = [...new Set(data.keywords)];
  data.locations = [...new Set(data.locations)];
  data.templates = [...new Set(data.templates)];
  
  return data;
}

/**
 * Generate keyword combinations using templates
 * Groups keywords by service, processes all keywords for each service before moving to next service
 */
function generateKeywordCombinations(data) {
  const results = [];
  let combinationCount = 0;
  
  // Group keywords by service
  const serviceGroups = {};
  
  // Get all data to properly group keywords by service
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  
  // Group keywords by service
  for (let i = 1; i < values.length; i++) {
    const service = values[i][0]; // Column A
    const keyword = values[i][1]; // Column B
    
    if (service && keyword && service.toString().trim() && keyword.toString().trim()) {
      const serviceName = service.toString().trim();
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = [];
      }
      serviceGroups[serviceName].push(keyword.toString().trim());
    }
  }
  
  // Remove duplicates within each service group
  Object.keys(serviceGroups).forEach(service => {
    serviceGroups[service] = [...new Set(serviceGroups[service])];
  });
  
  console.log('Service groups:', Object.keys(serviceGroups));
  
  // Process each service group
  Object.keys(serviceGroups).forEach(serviceName => {
    const keywords = serviceGroups[serviceName];
    console.log(`Processing service: ${serviceName} with ${keywords.length} keywords`);
    
    // For each location
    data.locations.forEach((location) => {
      // Priority 1: Keywords without geo (most valuable SEO)
      keywords.forEach((keyword) => {
        const template = data.templates[0]; // First template should be {keyword}
        const generatedKeyword = template
          .replace(/\{keyword\}/gi, keyword)
          .replace(/\{location\}/gi, location.toLowerCase());
        
        results.push({
          service: serviceName,
          originalKeyword: keyword,
          location: location,
          template: template,
          generatedKeyword: generatedKeyword,
          combinationNumber: ++combinationCount,
          priority: 'High - No Geo'
        });
      });
      
      // Priority 2: Keywords + Geo (second most valuable)
      keywords.forEach((keyword) => {
        const template = data.templates[1]; // Second template should be {keyword} {location}
        const generatedKeyword = template
          .replace(/\{keyword\}/gi, keyword)
          .replace(/\{location\}/gi, location.toLowerCase());
        
        results.push({
          service: serviceName,
          originalKeyword: keyword,
          location: location,
          template: template,
          generatedKeyword: generatedKeyword,
          combinationNumber: ++combinationCount,
          priority: 'Medium - Keyword + Geo'
        });
      });
      
      // Priority 3: Geo + Keywords (third priority)
      keywords.forEach((keyword) => {
        const template = data.templates[2]; // Third template should be {location} {keyword}
        const generatedKeyword = template
          .replace(/\{keyword\}/gi, keyword)
          .replace(/\{location\}/gi, location.toLowerCase());
        
        results.push({
          service: serviceName,
          originalKeyword: keyword,
          location: location,
          template: template,
          generatedKeyword: generatedKeyword,
          combinationNumber: ++combinationCount,
          priority: 'Lower - Geo + Keyword'
        });
      });
    });
  });
  
  return results;
}

/**
 * Write results to the spreadsheet
 */
function writeResultsToSheet(sheet, results) {
  // Always output to Column H
  const startCol = 8; // Column H
  
  // Create headers
  const headers = [
    'Generated Keyword'
  ];
  
  // Write headers
  const headerRange = sheet.getRange(1, startCol, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  // Prepare data rows
  const dataRows = results.map(result => [
    result.generatedKeyword
  ]);
  
  // Write data
  if (dataRows.length > 0) {
    const dataRange = sheet.getRange(2, startCol, dataRows.length, headers.length);
    dataRange.setValues(dataRows);
    
    // Auto-resize columns
    for (let i = 0; i < headers.length; i++) {
      sheet.autoResizeColumn(startCol + i);
    }
    
    // Add alternating row colors for readability
    const range = sheet.getRange(2, startCol, dataRows.length, headers.length);
    const backgrounds = [];
    for (let i = 0; i < dataRows.length; i++) {
      backgrounds.push(new Array(headers.length).fill(i % 2 === 0 ? '#f8f9fa' : '#ffffff'));
    }
    range.setBackgrounds(backgrounds);
  }
  
  console.log(`📝 Results written to columns ${startCol} through ${startCol + headers.length - 1}`);
}

/**
 * Write ranking results to the spreadsheet
 * Enhanced version that includes ranking data
 */
function writeRankingResultsToSheet(sheet, results) {
  // Always output to Column H
  const startCol = 8; // Column H
  
  // Create headers for ranking results
  const headers = [
    'Generated Keyword',
    'Location',
    'Ranking Position',
    'Ranking URL',
    'Status'
  ];
  
  // Write headers
  const headerRange = sheet.getRange(1, startCol, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  // Prepare data rows
  const dataRows = results.map(result => [
    result.generatedKeyword,
    result.location,
    result.ranking || 'Not Found',
    result.rankingUrl || 'Not Found',
    result.status || 'Unknown'
  ]);
  
  // Write data
  if (dataRows.length > 0) {
    const dataRange = sheet.getRange(2, startCol, dataRows.length, headers.length);
    dataRange.setValues(dataRows);
    
    // Auto-resize columns
    for (let i = 0; i < headers.length; i++) {
      sheet.autoResizeColumn(startCol + i);
    }
    
    // Add alternating row colors for readability
    const range = sheet.getRange(2, startCol, dataRows.length, headers.length);
    const backgrounds = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      backgrounds.push(new Array(headers.length).fill(rowColor));
    }
    range.setBackgrounds(backgrounds);
    
    // Add color coding for status
    for (let i = 0; i < dataRows.length; i++) {
      const status = results[i].status;
      const statusCol = startCol + 4; // Status column (L)
      
      if (status === 'success') {
        sheet.getRange(i + 2, statusCol).setBackground('#d4edda'); // Light green
      } else if (status === 'no_ranking') {
        sheet.getRange(i + 2, statusCol).setBackground('#fff3cd'); // Light yellow
      } else if (status === 'error' || status === 'submission_failed') {
        sheet.getRange(i + 2, statusCol).setBackground('#f8d7da'); // Light red
      }
    }
  }
  
  console.log(`📝 Ranking results written to columns ${startCol} through ${startCol + headers.length - 1}`);
}

/**
 * Clear previous results to avoid duplicates
 */
function clearPreviousResults(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  // Check if there are existing results (look for "Generated Keyword" header)
  for (let col = 8; col <= lastCol; col++) {
    const headerCell = sheet.getRange(1, col);
    if (headerCell.getValue() === 'Generated Keyword') {
      // Clear the results section
      const clearRange = sheet.getRange(1, col, lastRow, lastCol - col + 1);
      clearRange.clear();
      console.log(`🧹 Cleared previous results from column ${col}`);
      break;
    }
  }
}

/**
 * Generate keywords for a specific service only
 * Usage: generateKeywordsForService('wildlife removal')
 */
function generateKeywordsForService(targetService) {
  try {
    console.log(`🎯 Generating keywords for service: ${targetService}`);
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Read data
    const data = readSheetData(sheet);
    
    // Filter keywords for the specific service
    const filteredData = {
      ...data,
      keywords: [],
      services: []
    };
    
    // Get all data to find service-keyword relationships
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const range = sheet.getRange(1, 1, lastRow, lastCol);
    const values = range.getValues();
    
    for (let i = 1; i < values.length; i++) {
      const service = values[i][0]; // Column A
      const keyword = values[i][1]; // Column B
      
      if (service && keyword && 
          service.toString().toLowerCase().includes(targetService.toLowerCase())) {
        filteredData.keywords.push(keyword.toString().trim());
        filteredData.services.push(service.toString().trim());
      }
    }
    
    if (filteredData.keywords.length === 0) {
      SpreadsheetApp.getUi().alert(`No keywords found for service: ${targetService}`);
      return;
    }
    
    // Generate combinations
    const results = generateKeywordCombinations(filteredData);
    
    // Write results
    writeResultsToSheet(sheet, results);
    
    SpreadsheetApp.getUi().alert(`Generated ${results.length} keywords for ${targetService}`);
    
  } catch (error) {
    console.error('Error in service-specific generation:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Create a menu in the spreadsheet for easy access
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Keyword Generator')
    .addItem('Generate All Keywords', 'generateKeywords')
    .addItem('📊 Check Rankings Only (Existing Keywords)', 'checkRankingsOnly')
    .addSeparator()
    .addItem('🧪 Test DataForSEO Connection', 'testDataForSEOConnection')
    .addToUi();
}

/**
 * Test DataForSEO API connection
 */
function testDataForSEOConnection() {
  try {
    const config = getDataForSEOConfig();
    
    // Make a simple test call to get account info (this endpoint exists)
    const response = UrlFetchApp.fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      headers: { 'Authorization': config.Authorization }
    });
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert('✅ Connection Successful', 'DataForSEO API connection is working!', SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      SpreadsheetApp.getUi().alert('❌ Connection Failed', `API returned status: ${response.getResponseCode()}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Connection Error', `Failed to connect: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function GENERATE_KEYWORDS(templates, niche, niche_placeholder, locations, location_placeholder) {
    const toStr = v => (v === null || v === undefined) ? "" : String(v).trim();
  
    function normalize1D(arg) {
      if (!Array.isArray(arg)) return [toStr(arg)].filter(Boolean);
      const out = [];
      if (Array.isArray(arg[0])) {
        for (let r = 0; r < arg.length; r++) {
          for (let c = 0; c < arg[r].length; c++) {
            const v = toStr(arg[r][c]);
            if (v) out.push(v);
          }
        }
      } else {
        for (let i = 0; i < arg.length; i++) {
          const v = toStr(arg[i]);
          if (v) out.push(v);
        }
      }
      return out;
    }
  
    function normalizeNiche2Cols(arg) {
      if (!Array.isArray(arg)) {
        const v = toStr(arg);
        if (!v) return [];
        throw new Error("The 'niche' parameter must be a 2-column range: [service, core_keyword].");
      }
      const rows = Array.isArray(arg[0]) ? arg : [arg];
      const out = [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row) || row.length < 2) continue;
        const service = toStr(row[0]);
        const core   = toStr(row[1]);
        if (service && core) out.push([service, core]);
      }
      return out;
    }
  
    function replaceAllLiteral(str, find, replace) {
      if (!find) return str;
      return String(str).split(find).join(replace);
    }
  
    const tplList   = normalize1D(templates);
    const locList   = normalize1D(locations);
    const nicheRows = normalizeNiche2Cols(niche);
  
    const nichePh = toStr(niche_placeholder);
    const locPh   = toStr(location_placeholder);
  
    if (!tplList.length)   throw new Error("No templates provided.");
    if (!nicheRows.length) throw new Error("No niche rows provided. Expect two columns: service, core_keyword.");
    if (!locList.length)   throw new Error("No locations provided.");
    if (!nichePh)          throw new Error("niche_placeholder is empty.");
    if (!locPh)            throw new Error("location_placeholder is empty.");
  
    const out = [];
    // out.push(["service", "location", "core_keyword", "keyword"]); // optional header
  
    // Group by Location → Service → Template
    for (let j = 0; j < locList.length; j++) {
      const location = locList[j];
      for (let i = 0; i < nicheRows.length; i++) {
        const [service, core_keyword] = nicheRows[i];
        for (let t = 0; t < tplList.length; t++) {
          const template = tplList[t];
          let keyword = template;
          keyword = replaceAllLiteral(keyword, nichePh, core_keyword);
          keyword = replaceAllLiteral(keyword, locPh, location);
          keyword = keyword.toLowerCase(); // 👈 lowercase final keyword
          out.push([service, location, core_keyword, keyword]);
        }
      }
    }
  
    return out;
  }

// ============================================================================
// RANKING FUNCTIONALITY
// ============================================================================

/**
 * Get DataForSEO API configuration
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

/**
 * Submit a single keyword ranking job to DataForSEO
 */
function submitKeywordRankingJob(keyword, lat, lng) {
  try {
    const config = getDataForSEOConfig();
    
    // Prepare POST data for desktop ranking
    const postData = [{
      "keyword": keyword,
      "location_coordinate": `${lat},${lng}`,
      "language_code": "en",
      "device": "desktop",
      "os": "windows"
    }];
    
    console.log(`📤 Submitting ranking job for: "${keyword}" in Location`);
    
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
 * Submit a batch of keyword ranking jobs to DataForSEO (up to 500 keywords)
 */
function submitBatchRankingJobs(keywordsData) {
  try {
    const config = getDataForSEOConfig();
    
    // Prepare POST data for batch ranking
    const postData = keywordsData.map(item => ({
      "keyword": item.keyword,
      "location_coordinate": `${item.lat},${item.lng}`,
      "language_code": "en",
      "device": "desktop",
      "os": "windows"
    }));
    
    console.log(`📤 Submitting batch of ${keywordsData.length} keywords to DataForSEO`);
    
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
    
    if (responseData.tasks && responseData.tasks.length > 0) {
      const taskIds = responseData.tasks.map(task => task.id);
      console.log(`✅ Batch submitted successfully: ${taskIds.length} task IDs generated`);
      return taskIds;
    } else {
      throw new Error('No tasks returned from DataForSEO');
    }
    
  } catch (error) {
    console.error(`❌ Failed to submit batch ranking jobs:`, error);
    return [];
  }
}

/**
 * Fetch ranking results from DataForSEO
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

/**
 * Check if a row already has ranking data
 */
function hasRankingData(sheet, row) {
  const startCol = 14; // Column N (rank position)
  const numCols = 2;   // Columns N and O
  
  const range = sheet.getRange(row, startCol, 1, numCols);
  const values = range.getValues()[0];
  
  // Check if both position and URL are filled
  return values[0] && values[0] !== '' && values[1] && values[1] !== '';
}

/**
 * Set up ranking headers
 */
function setupRankingHeaders(sheet) {
  const headers = ['Ranking Position', 'Ranking URL'];
  const startCol = 14; // Column N
  
  for (let i = 0; i < headers.length; i++) {
    sheet.getRange(1, startCol + i).setValue(headers[i]);
  }
  
  // Add raw response header (Column R)
  sheet.getRange(1, 18).setValue('Raw Response Data');
  sheet.getRange(1, 18).setFontWeight('bold');
  sheet.getRange(1, 18).setBackground('#6c757d'); // Gray for raw data
  sheet.getRange(1, 18).setFontColor('white');
}

/**
 * Write single ranking result to sheet
 */
function writeSingleRankingResult(sheet, row, result) {
  const startCol = 14; // Column N
  
  // Write ranking position (Column N)
  sheet.getRange(row, startCol).setValue(result.ranking || result.position || 'Not Found');
  
  // Write ranking URL (Column O)
  sheet.getRange(row, startCol + 1).setValue(result.url || 'Not Found');
  
  // Write raw response data (Column R)
  const rawResponseData = result.rawResponse ? JSON.stringify(result.rawResponse, null, 2) : 'No raw data';
  sheet.getRange(row, 18).setValue(rawResponseData); // Column R
}

/**
 * Check rankings for existing keywords in the sheet
 */
function checkRankingsOnly() {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // Read data from sheet
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('❌ No Data', 'No data found in the sheet.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // Read keywords, lat, lng from columns K, L, M
  const dataRange = sheet.getRange(2, 11, lastRow - 1, 3); // Columns K, L, M
  const data = dataRange.getValues();
  
  const keywordsWithCoords = [];
  data.forEach((row, index) => {
    const keyword = row[0]; // Column K (kw+geo)
    const lat = row[1];     // Column L
    const lng = row[2];     // Column M
    
    if (keyword && lat && lng) {
      keywordsWithCoords.push({
        keyword: keyword.toString().trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        row: index + 2 // Actual row number in sheet
      });
    }
  });
  
  if (keywordsWithCoords.length === 0) {
    SpreadsheetApp.getUi().alert('❌ No Valid Data', 'No valid keywords with coordinates found. Please ensure you have keywords in Column K and valid lat/long in Columns L & M.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  console.log(`📊 Found ${keywordsWithCoords.length} keywords with coordinates`);
  
  // Filter out already processed keywords
  const uncheckedKeywords = keywordsWithCoords.filter(item => !hasRankingData(sheet, item.row));
  
  if (uncheckedKeywords.length === 0) {
    SpreadsheetApp.getUi().alert('✅ All Done!', 'All keywords have already been checked for rankings.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  console.log(`📊 Found ${uncheckedKeywords.length} unchecked keywords out of ${keywordsWithCoords.length} total`);
  
  // Add limit for testing
  const TEST_LIMIT = 0; // 🧪 TEST LIMIT: Change this number (0 = process all)
  const keywordsToProcess = TEST_LIMIT > 0 ? uncheckedKeywords.slice(0, TEST_LIMIT) : uncheckedKeywords;
  
  // Set up headers first
  setupRankingHeaders(sheet);
  
  const totalKeywords = keywordsToProcess.length;
  const batchSize = 500; // Optimized for large datasets - batch API submission
  const totalBatches = Math.ceil(totalKeywords / batchSize);
  
  SpreadsheetApp.getUi().alert(
    '🚀 Starting Ranking Check', 
    `Processing ${totalKeywords} keywords in ${totalBatches} batches of up to ${batchSize}.\n\nThis will take approximately ${totalBatches * 3} minutes (${Math.round(totalBatches * 3 / 60)} hours).`, 
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  console.log(`📦 Processing ${totalKeywords} keywords in ${totalBatches} batches`);
  
    // Process in batches
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalKeywords);
      const batchKeywords = keywordsToProcess.slice(startIndex, endIndex);
      
      console.log(`📦 Processing Batch ${batchIndex + 1}/${totalBatches} (${batchKeywords.length} keywords)`);
      
      // Submit all keywords in this batch using batch API
      console.log(`📤 Submitting batch of ${batchKeywords.length} keywords to DataForSEO`);
      
      let taskIds = []; // Initialize outside try block
      try {
        taskIds = submitBatchRankingJobs(batchKeywords);
        
        if (taskIds.length > 0) {
          console.log(`✅ Batch submitted successfully: ${taskIds.length} task IDs generated`);
          
          // Create task data array with row mapping
          const taskDataArray = [];
          for (let i = 0; i < taskIds.length && i < batchKeywords.length; i++) {
            const actualRowNumber = startIndex + i + 2;
            processed++;
            taskDataArray.push({
              taskId: taskIds[i],
              row: actualRowNumber,
              keyword: batchKeywords[i].keyword
            });
          }
          
          // Store task data for result fetching
          taskIds.splice(0, taskIds.length, ...taskDataArray);
        } else {
          console.log(`❌ Failed to submit batch`);
          failed += batchKeywords.length;
          
          // Write failed results for all keywords in batch
          for (let i = 0; i < batchKeywords.length; i++) {
            const actualRowNumber = startIndex + i + 2;
            writeSingleRankingResult(sheet, actualRowNumber, {
              ranking: 'Error',
              url: 'Batch Submission Failed',
              rawResponse: 'Batch submission failed - no task IDs returned'
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error submitting batch:`, error);
        failed += batchKeywords.length;
        
        // Write error results for all keywords in batch
        for (let i = 0; i < batchKeywords.length; i++) {
          const actualRowNumber = startIndex + i + 2;
          writeSingleRankingResult(sheet, actualRowNumber, { 
            ranking: 'Error', 
            url: 'Batch Error',
            rawResponse: `Batch submission error: ${error.message}`
          });
        }
      }
    
    if (taskIds.length > 0) {
      console.log(`⏳ Waiting 3 minutes for DataForSEO to process batch ${batchIndex + 1} (${taskIds.length} keywords)...`);
      
      // Show progress in sheet
      sheet.getRange(1, 12).setValue(`⏳ Processing Batch ${batchIndex + 1}/${totalBatches} (${taskIds.length} keywords)...`); // Column L
      
      Utilities.sleep(180000); // Wait 3 minutes (180 seconds) for large batches
      
      // Fetch results for this batch
      console.log(`📥 Fetching results for batch ${batchIndex + 1}...`);
      
      // Collect tasks that are still queued/no results to retry later
      let pendingTasks = [];
      
      for (const taskData of taskIds) {
        try {
          const rankingResults = fetchKeywordRankingResults(taskData.taskId);
          
          if (rankingResults && rankingResults.rankings.length > 0) {
            // Get the best ranking (lowest rank number)
            const bestRanking = rankingResults.rankings.reduce((best, current) =>
              current.rank < best.rank ? current : best
            );
            
            console.log(`✅ Found ranking: Position ${bestRanking.rank} - ${bestRanking.url}`);
            
            // Write result immediately
            writeSingleRankingResult(sheet, taskData.row, {
              ranking: bestRanking.rank,
              url: bestRanking.url,
              rawResponse: rankingResults.rawData
            });
            successful++;
          } else {
            // Defer writing for queued/not-ready tasks; we'll retry below
            console.log(`⏳ Result not ready yet for: ${taskData.keyword}. Will retry...`);
            pendingTasks.push({ taskData, lastRaw: rankingResults.rawData });
          }
        } catch (error) {
          console.error(`❌ Error fetching results for "${taskData.keyword}":`, error);
          
          // Write result immediately
          writeSingleRankingResult(sheet, taskData.row, {
            ranking: 'Error',
            url: 'Error',
            rawResponse: `Error: ${error.message}`
          });
          failed++;
        }
      }

      // Retry loop for tasks still pending (e.g., status "Task In Queue")
      if (pendingTasks.length > 0) {
        const maxRounds = 6; // total additional wait ~ 6 * 30s = 3 minutes
        const intervalMs = 30000;
        for (let round = 1; round <= maxRounds && pendingTasks.length > 0; round++) {
          console.log(`🔄 Retry round ${round}/${maxRounds} for ${pendingTasks.length} pending tasks...`);
          Utilities.sleep(intervalMs);
          const stillPending = [];
          for (const p of pendingTasks) {
            try {
              const retryResult = fetchKeywordRankingResults(p.taskData.taskId);
              if (retryResult && retryResult.rankings.length > 0) {
                const bestRanking = retryResult.rankings.reduce((best, current) =>
                  current.rank < best.rank ? current : best
                );
                writeSingleRankingResult(sheet, p.taskData.row, {
                  ranking: bestRanking.rank,
                  url: bestRanking.url,
                  rawResponse: retryResult.rawData
                });
                successful++;
              } else {
                // keep for next retry
                stillPending.push({ taskData: p.taskData, lastRaw: retryResult.rawData || p.lastRaw });
              }
            } catch (e) {
              console.error(`❌ Error on retry for "${p.taskData.keyword}":`, e);
              writeSingleRankingResult(sheet, p.taskData.row, {
                ranking: 'Error',
                url: 'Error',
                rawResponse: `Retry error: ${e.message}`
              });
              failed++;
            }
          }
          pendingTasks = stillPending;
        }
        // Any tasks still pending after retries → mark Not Found with last raw data
        if (pendingTasks.length > 0) {
          console.log(`⚠️ ${pendingTasks.length} tasks still pending after retries; marking as Not Found`);
          for (const p of pendingTasks) {
            writeSingleRankingResult(sheet, p.taskData.row, {
              ranking: 'Not Found',
              url: 'Not Found',
              rawResponse: p.lastRaw || 'Timed out waiting for results'
            });
            failed++;
          }
        }
      }
      
      // Force sheet to save/flush after each batch
      SpreadsheetApp.flush();
      
      // Update progress with batch completion
      sheet.getRange(1, 12).setValue(`✅ Completed batch ${batchIndex + 1}/${totalBatches} (${taskIds.length} keywords) - ${successful} successful, ${failed} failed`);
      sheet.getRange(1, 12).setBackground('#d4edda'); // Light green
      
      // Force another flush to ensure progress is visible
      SpreadsheetApp.flush();
      
      // Small delay to ensure writes are processed
      Utilities.sleep(1000);
      
      // Clear progress
      sheet.getRange(1, 12).setValue('');
      sheet.getRange(1, 12).setBackground(null);
    }
  }
  
  console.log('🎉 All ranking checks completed!');
  
  const summary = `Ranking check complete!\n\nProcessed: ${processed}\nSuccessful: ${successful}\nFailed: ${failed}`;
  console.log(`\n✅ ${summary}`);
  SpreadsheetApp.getUi().alert('✅ Complete!', summary, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Test DataForSEO connection
 */
function testDataForSEOConnection() {
  try {
    const config = getDataForSEOConfig();
    console.log('✅ DataForSEO configuration loaded successfully');
    console.log(`🔑 API Key: ${config.apiKey.substring(0, 10)}...`);
    console.log(`🌐 Base URL: ${config.baseUrl}`);
    
    SpreadsheetApp.getUi().alert('✅ Connection Test', 'DataForSEO connection test successful!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    console.error('❌ Connection Error:', error);
    SpreadsheetApp.getUi().alert('❌ Connection Error', `Failed to connect: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Create custom menu when sheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔍 Gordon KW + Rankings')
    .addItem('Check Rankings Only (Existing Keywords)', 'checkRankingsOnly')
    .addItem('Test DataForSEO Connection', 'testDataForSEOConnection')
    .addToUi();
}
  
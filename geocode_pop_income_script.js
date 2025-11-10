/**
 * Google Apps Script for Search Visibility Ranking Tracker - Active Tab
 *
 * Instructions:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create new project
 * 3. Replace Code.gs content with this file
 * 4. Set up DataForSEO credentials in getDataForSEOConfig()
 * 5. Save and refresh your Google Sheet
 */

// =============================================================================
// CONFIGURATION - SAN ANTONIO DESKTOP
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
      baseUrl: 'https://api.dataforseo.com/v3/serp/google/organic'
    };
  }
  
  /**
   * Sheet configuration - Analysis specific
   */
  const SHEET_NAMES = {
    RANK_MONITOR: 'analysis',  // Analysis tab
    SUBMIT_REQUESTS: 'analysis_submit_requests',    // Analysis audit tabs
    RESULTS_DUMP: 'analysis_results_dump'
  };
  
  /**
   * Base column configuration - Updated to match image structure
   */
  const BASE_COLUMNS = {
    OFFICE: 0,       // Column A - Office
    STATE: 1,        // Column B - State
    TARGETS: 2,      // Column C - Targets (City)
    SERVICE: 3,      // Column D - Service
    LAT: 4,          // Column E - Latitude
    LONG: 5,         // Column F - Longitude
    PRIME_URL: 6,    // Column G - Prime URL
    POPULATION: 7,   // Column H - Population
    INCOME: 8,       // Column I - Income
    FIRST_DATA_COL: 9 // Column J - where new ranking data columns start
  };
  
  /**
   * Returns the fixed columns for ranking data (always overwrites same columns)
   * Returns the column indices for Rank and URL - ALWAYS J and K
   */
  function findNextEmptyColumns() {
    // Always write to columns J and K (overwrite existing data)
    return {
      RANK: BASE_COLUMNS.FIRST_DATA_COL,     // Column J (always)
      URL: BASE_COLUMNS.FIRST_DATA_COL + 1   // Column K (always)
    };
  }
  
  // =============================================================================
  // CUSTOM MENU - SAN ANTONIO DESKTOP
  // =============================================================================
  
  /**
   * Creates custom menu when sheet opens
   */
  function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('📊 Enhanced Ranking Tracker')
      .addSubMenu(ui.createMenu('📍 Geocoding & Census')
        .addItem('🌍 Geocode Cities & Get Census Data', 'runGeocodeAndPopulation')
        .addItem('🔄 Update Coordinates Only', 'updateCoordinatesOnly'))
      .addSubMenu(ui.createMenu('📤 Ranking Jobs')
        .addItem('📤 Submit Ranking Jobs', 'submitRankingJobs')
        .addItem('📥 Get Results', 'getRankingResults'))
      .addSubMenu(ui.createMenu('📊 Analysis')
        .addItem('📊 View Job Status', 'checkJobStatus')
        .addItem('📋 View Submit Requests', 'viewSubmitRequests')
        .addItem('📋 View Results Dump', 'viewResultsDump'))
      .addSubMenu(ui.createMenu('🧹 Maintenance')
        .addItem('🧹 Clear Task Data', 'clearTaskData')
        .addItem('⚙️ Test Connection', 'testDataForSEOConnection'))
      .addSubMenu(ui.createMenu('🤖 Automation')
        .addItem('🤖 Setup Daily Automation', 'setupDailyAutomation')
        .addItem('🔕 Disable Automation', 'disableAutomation')
        .addItem('🧪 Test Daily Check', 'testDailyRankingCheck'))
      .addToUi();
  }
  
  // =============================================================================
  // GEOCODING & CENSUS FUNCTIONS
  // =============================================================================
  
  /**
   * Main geocoding function - Geocodes cities and fetches census data
   */
  function runGeocodeAndPopulation() {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('No data rows found. Please add Office (A), State (B), Targets (C), and Service (D).');
      return;
    }
  
    Logger.log('[RUN] Starting runGeocodeAndPopulation on sheet "%s" rows 2..%s', sheet.getName(), lastRow);
  
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 4); // A2:D
    const dataValues = dataRange.getValues();
    Logger.log('[RUN] Loaded %s rows of data', dataValues.length);
  
    const output = [];
    let processed = 0;
    let successes = 0;
    let failures = 0;
  
    for (let i = 0; i < dataValues.length; i++) {
      const row = dataValues[i];
      const office = String(row[0] || '').trim();
      const state = String(row[1] || '').trim();
      const city = String(row[2] || '').trim();
      const service = String(row[3] || '').trim();
      processed++;
  
      if (!city && !state) {
        Logger.log('[ROW %s] Empty city/state; skipping.', i + 2);
        output.push(['', '', '', '', '']); // lat, long, prime_url, population, income
        continue;
      }
  
      Logger.log('[ROW %s] Input office="%s" state="%s" city="%s" service="%s"', i + 2, office, state, city, service);
  
      try {
        const geocode = geocodeCityState(city, state);
        if (!geocode) {
          Logger.log('[ROW %s] Geocode returned no result', i + 2);
          failures++;
          output.push(['', '', '', '', '']);
          continue;
        }
  
        const { latitude, longitude, stateFips, placeCode } = geocode;
        Logger.log('[ROW %s] Geocode raw lat=%s lng=%s stateFips=%s place=%s', i + 2, latitude, longitude, stateFips, placeCode);
  
        // Generate prime URL
        const primeUrl = `https://${office.toLowerCase()}.aaacwildliferemoval.com/service-area/${city.toLowerCase().replace(/\s+/g, '-')}/`;
  
        let population = '';
        let income = '';
        
        if (stateFips && placeCode) {
          const acsData = fetchPopulationAcs(stateFips, placeCode);
          if (acsData && typeof acsData === 'object') {
            population = acsData.population || '';
            income = acsData.income || '';
          } else {
            population = acsData || '';
          }
          Logger.log('[ROW %s] Population=%s Income=%s', i + 2, population, income);
        } else {
          Logger.log('[ROW %s] Missing stateFips/placeCode; skipping ACS lookup', i + 2);
          population = '❌ NO PLACE CODE';
          income = '❌ NO PLACE CODE';
        }
  
        Logger.log('[ROW %s] Writing lat=%s lng=%s', i + 2, latitude, longitude);
  
        output.push([latitude, longitude, primeUrl, population, income]);
        successes++;
  
        Utilities.sleep(120);
      } catch (err) {
        Logger.log('[ROW %s] ERROR: %s', i + 2, err && err.message ? err.message : String(err));
        output.push(['', '', '', '', '']);
        failures++;
      }
    }
  
    if (output.length > 0) {
      sheet.getRange(2, 5, output.length, 5).setValues(output); // Write to columns E, F, G, H, I
    }
  
    const summary = `Done. Processed ${processed}. Success ${successes}. Fail ${failures}.`;
    Logger.log('[RUN] %s', summary);
    SpreadsheetApp.getActive().toast(summary, 'Geocoding & Census', 5);
  }
  
  /**
   * Update coordinates only (without census data)
   */
  function updateCoordinatesOnly() {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('No data rows found. Please add Office (A), State (B), Targets (C), and Service (D).');
      return;
    }
  
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 4); // A2:D
    const dataValues = dataRange.getValues();
    const output = [];
    let processed = 0;
    let successes = 0;
    let failures = 0;
  
    for (let i = 0; i < dataValues.length; i++) {
      const row = dataValues[i];
      const office = String(row[0] || '').trim();
      const state = String(row[1] || '').trim();
      const city = String(row[2] || '').trim();
      const service = String(row[3] || '').trim();
      processed++;
  
      if (!city && !state) {
        output.push(['', '']); // lat, long only
        continue;
      }
  
      try {
        const geocode = geocodeCityState(city, state);
        if (!geocode) {
          output.push(['', '']);
          failures++;
          continue;
        }
  
        const { latitude, longitude } = geocode;
        output.push([latitude, longitude]);
        successes++;
  
        Utilities.sleep(120);
      } catch (err) {
        output.push(['', '']);
        failures++;
      }
    }
  
    if (output.length > 0) {
      sheet.getRange(2, 5, output.length, 2).setValues(output); // Write to columns E, F only
    }
  
    const summary = `Coordinates updated. Processed ${processed}. Success ${successes}. Fail ${failures}.`;
    SpreadsheetApp.getActive().toast(summary, 'Coordinates Update', 5);
  }
  
  // =============================================================================
  // MAIN FUNCTIONS (BUTTON ACTIONS)
  // =============================================================================
  
  /**
   * Button 1: Submit Ranking Jobs
   * Runs Preflight + Takeoff phases
   */
  function submitRankingJobs() {
    try {
      const ui = SpreadsheetApp.getUi();
  
      // Show confirmation dialog
      const response = ui.alert(
        'Submit Ranking Jobs - Analysis',
        'This will submit ranking check jobs to DataForSEO for Analysis. Continue?',
        ui.ButtonSet.YES_NO
      );
  
      if (response !== ui.Button.YES) return;
  
      ui.alert('⏳ Processing...', 'Reading active sheet data and submitting jobs. Please wait.', ui.ButtonSet.OK);
  
      // Phase 1: Get sheet data and run preflight
      const sheetData = getSheetData();
      const preflightData = buildPreflightFromSheet(sheetData);
  
      // Phase 2: Submit jobs to DataForSEO (Takeoff)
      const taskResults = submitJobsToDataForSEO(preflightData);
  
      // Phase 3: Store task IDs back in sheet
      writeTaskIdsToSheet(taskResults);
  
      // Show success message
      const jobCount = Object.values(taskResults).flat().length;
      ui.alert(
        '✅ Jobs Submitted Successfully!',
        `${jobCount} Analysis ranking jobs submitted to DataForSEO.\\n\\nWait 2-5 minutes, then click "Get Results".`,
        ui.ButtonSet.OK
      );
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to submit Analysis jobs: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      console.error('Submit jobs error:', error);
    }
  }
  
  /**
   * Button 2: Get Results
   * Runs Landing phase and writes results to sheet
   */
  function getRankingResults() {
    try {
      const ui = SpreadsheetApp.getUi();
  
      // Show confirmation dialog
      const response = ui.alert(
        'Get Ranking Results - Analysis',
        'This will fetch results from DataForSEO and update the active sheet. Continue?',
        ui.ButtonSet.YES_NO
      );
  
      if (response !== ui.Button.YES) return;
  
      ui.alert('⏳ Processing...', 'Fetching results from DataForSEO. This may take a moment.', ui.ButtonSet.OK);
  
      // Phase 1: Read task IDs from temporary storage
      const taskIds = getStoredTaskIds();
  
      if (taskIds.length === 0) {
        ui.alert('⚠️ No Jobs Found', 'No task IDs found. Please run "Submit Ranking Jobs" first.', ui.ButtonSet.OK);
        return;
      }
  
      // Phase 2: Fetch results from DataForSEO
      const results = fetchResultsFromDataForSEO(taskIds);
  
      // Phase 3: Write results back to sheet
      writeResultsToSheet(results);
  
      // Clear stored task IDs after successful retrieval
      clearStoredTaskIds();
  
      // Show success message
      ui.alert(
        '✅ Results Updated Successfully!',
        `Analysis ranking data has been updated in the active sheet.\\n\\nCheck the latest column for new rankings.`,
        ui.ButtonSet.OK
      );
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to get Analysis results: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      console.error('Get results error:', error);
    }
  }
  
  // =============================================================================
  // AUTOMATED RANKING CHECK FUNCTIONS
  // =============================================================================
  
  /**
   * Daily automated ranking check - runs both submit and get results with delay
   * This function is designed to be called by time-driven triggers
   */
  function dailyRankingCheck() {
    try {
      console.log('🤖 Starting automated Analysis daily ranking check...');
  
      // Phase 1: Submit ranking jobs
      submitRankingJobsAutomated();
  
      // Phase 2: Wait 5 minutes for DataForSEO to process
      console.log('⏳ Waiting 5 minutes for DataForSEO to process jobs...');
      Utilities.sleep(5 * 60 * 1000); // 5 minutes
  
      // Phase 3: Get results
      getRankingResultsAutomated();
  
      console.log('✅ Automated Analysis daily ranking check completed successfully!');
  
    } catch (error) {
      console.error('❌ Automated Analysis daily ranking check failed:', error);
  
      // Optional: Send email notification about the failure
      // You can uncomment and customize this if you want email alerts
      /*
      try {
        MailApp.sendEmail({
          to: 'your-email@example.com',
          subject: '❌ Analysis Daily Ranking Check Failed',
          body: `The automated Analysis daily ranking check failed with error: ${error.message}\n\nPlease check the Google Apps Script logs for more details.`
        });
      } catch (emailError) {
        console.error('Failed to send error notification email:', emailError);
      }
      */
    }
  }
  
  /**
   * Automated version of submitRankingJobs (no UI dialogs)
   * Used by daily automation - same logic as manual version but without user prompts
   */
  function submitRankingJobsAutomated() {
    console.log('📤 Starting automated Analysis job submission...');
  
    // Phase 1: Get sheet data and run preflight
    const sheetData = getSheetData();
    const preflightData = buildPreflightFromSheet(sheetData);
  
    // Phase 2: Submit jobs to DataForSEO (Takeoff)
    const taskResults = submitJobsToDataForSEO(preflightData);
  
    // Phase 3: Store task IDs back in sheet
    writeTaskIdsToSheet(taskResults);
  
    // Log success
    const jobCount = Object.values(taskResults).flat().length;
    console.log(`✅ Automated Analysis job submission completed: ${jobCount} jobs submitted`);
  
    return jobCount;
  }
  
  /**
   * Automated version of getRankingResults (no UI dialogs)
   * Used by daily automation - same logic as manual version but without user prompts
   */
  function getRankingResultsAutomated() {
    console.log('📥 Starting automated Analysis results retrieval...');
  
    // Phase 1: Read task IDs from temporary storage
    const taskIds = getStoredTaskIds();
  
    if (taskIds.length === 0) {
      console.log('⚠️ No task IDs found for automated Analysis results retrieval');
      return;
    }
  
    // Phase 2: Fetch results from DataForSEO
    const results = fetchResultsFromDataForSEO(taskIds);
  
    // Phase 3: Write results back to sheet
    writeResultsToSheet(results);
  
    // Clear stored task IDs after successful retrieval
    clearStoredTaskIds();
  
    console.log('✅ Automated Analysis results retrieval completed successfully!');
  
    return results.length;
  }
  
  // =============================================================================
  // GOOGLE GEOCODING & CENSUS API FUNCTIONS
  // =============================================================================
  
  /**
   * Google Geocoding function
   */
  function geocodeCityState(city, state) {
    const address = `${city}, ${state}`;
    const encodedAddress = encodeURIComponent(address);
    
    // Get Google API key from script properties
    const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
    if (!apiKey) {
      Logger.log('[GOOGLE-GEOCODER] ERROR: GOOGLE_API_KEY not found in script properties');
      return null;
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    Logger.log('[GOOGLE-GEOCODER] URL: %s', url);
    
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      const status = resp.getResponseCode();
      Logger.log('[GOOGLE-GEOCODER] Status: %s', status);
      
      if (status !== 200) {
        Logger.log('[GOOGLE-GEOCODER] Non-200 response. Body: %s', safeSnippet(resp.getContentText()));
        return null;
      }
      
      const text = resp.getContentText();
      Logger.log('[GOOGLE-GEOCODER] Body snippet: %s', safeSnippet(text));
      
      const data = JSON.parse(text);
      if (data.status !== 'OK') {
        Logger.log('[GOOGLE-GEOCODER] API error: %s', data.status);
        return null;
      }
      
      const results = data.results || [];
      if (!results.length) {
        Logger.log('[GOOGLE-GEOCODER] No results for "%s"', address);
        return null;
      }
      
      const top = results[0];
      const location = top.geometry?.location;
      if (!location) {
        Logger.log('[GOOGLE-GEOCODER] No location in result');
        return null;
      }
      
      const latitude = location.lat;
      const longitude = location.lng;
      
      // Try to get state FIPS and place code from Google's result
      let stateFips = '';
      let placeCode = '';
      
      // Look for state FIPS in address components
      const addressComponents = top.address_components || [];
      for (let i = 0; i < addressComponents.length; i++) {
        const component = addressComponents[i];
        if (component.types.includes('administrative_area_level_1')) {
          // Try to get state FIPS from the short_name or long_name
          const stateName = component.short_name || component.long_name;
          stateFips = getStateFipsFromAbbr(stateName);
          break;
        }
      }
      
      // For place code, we'll need to use coordinates to get Census geography
      if (stateFips && latitude && longitude) {
        const geoByCoord = getGeographiesByCoordinates(longitude, latitude);
        if (geoByCoord && geoByCoord.placeCode) {
          placeCode = geoByCoord.placeCode;
        }
      }
      
      Logger.log('[GOOGLE-GEOCODER] Found lat=%s lng=%s stateFips=%s placeCode=%s', latitude, longitude, stateFips, placeCode);
      return { latitude, longitude, stateFips, placeCode, googleTypes: top.types || [] };
      
    } catch (e) {
      Logger.log('[GOOGLE-GEOCODER] ERROR: %s', e && e.message ? e.message : String(e));
      return null;
    }
  }
  
  /**
   * Get Census geographies by coordinates
   */
  function getGeographiesByCoordinates(lng, lat) {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${encodeURIComponent(lng)}&y=${encodeURIComponent(lat)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    Logger.log('[GEO-BY-COORD] URL: %s', url);
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      const status = resp.getResponseCode();
      Logger.log('[GEO-BY-COORD] Status: %s', status);
      if (status !== 200) {
        Logger.log('[GEO-BY-COORD] Non-200 response. Body: %s', safeSnippet(resp.getContentText()));
        return null;
      }
      const text = resp.getContentText();
      Logger.log('[GEO-BY-COORD] Body snippet: %s', safeSnippet(text));
      const json = JSON.parse(text);
      const result = (json || {}).result || {};
      const geogs = result.geographies || {};
      const placeCollections = Object.keys(geogs).filter(k => /Place/i.test(k));
  
      let place = null;
      for (let i = 0; i < placeCollections.length; i++) {
        const items = geogs[placeCollections[i]];
        if (Array.isArray(items) && items.length) {
          place = items[0];
          break;
        }
      }
  
      if (!place) {
        Logger.log('[GEO-BY-COORD] No Place geography found');
        return { stateFips: '', placeCode: '' };
      }
  
      const stateFips = String(place.STATE || place.STATEFP || '').trim();
      const placeCode = String(place.PLACE || place.PLACEFP || '').trim();
      return { stateFips, placeCode };
    } catch (e) {
      Logger.log('[GEO-BY-COORD] ERROR: %s', e && e.message ? e.message : String(e));
      return null;
    }
  }
  
  /**
   * Fetch population and income from Census ACS API
   */
  function fetchPopulationAcs(stateFips, placeCode) {
    // Use Census ACS API
    const year = '2023';
    const base = `https://api.census.gov/data/${year}/acs/acs5`;
    const params = `get=NAME,B01003_001E,B19013_001E&for=place:${encodeURIComponent(placeCode)}&in=state:${encodeURIComponent(stateFips)}`;
    const url = `${base}?${params}`;
  
    Logger.log('[ACS] URL: %s', url);
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      const status = resp.getResponseCode();
      Logger.log('[ACS] Status: %s', status);
      
      if (status === 200) {
        const text = resp.getContentText();
        Logger.log('[ACS] Body snippet: %s', safeSnippet(text));
        
        const json = JSON.parse(text);
        if (!Array.isArray(json) || json.length < 2) {
          Logger.log('[ACS] Unexpected JSON shape');
          return { population: '', income: '' };
        }
        
        const headers = json[0];
        const rows = json.slice(1);
        
        const popIndex = headers.indexOf('B01003_001E');
        const incomeIndex = headers.indexOf('B19013_001E');
        
        if (popIndex === -1 || incomeIndex === -1) {
          Logger.log('[ACS] Missing required columns. Headers: %s', JSON.stringify(headers));
          return { population: '', income: '' };
        }
        
        const firstRow = rows[0];
        const population = firstRow[popIndex] || '';
        const income = firstRow[incomeIndex] || '';
        
        Logger.log('[ACS] Found population=%s income=%s', population, income);
        return { population, income };
      } else {
        Logger.log('[ACS] Non-200 response. Body: %s', safeSnippet(resp.getContentText()));
        return { population: '', income: '' };
      }
    } catch (e) {
      Logger.log('[ACS] ERROR: %s', e && e.message ? e.message : String(e));
      return { population: '', income: '' };
    }
  }
  
  /**
   * Get state FIPS code from abbreviation
   */
  function getStateFipsFromAbbr(stateAbbr) {
    const map = {
      'AL': '01','AK': '02','AZ': '04','AR': '05','CA': '06','CO': '08','CT': '09','DE': '10','DC': '11',
      'FL': '12','GA': '13','HI': '15','ID': '16','IL': '17','IN': '18','IA': '19','KS': '20','KY': '21',
      'LA': '22','ME': '23','MD': '24','MA': '25','MI': '26','MN': '27','MS': '28','MO': '29','MT': '30',
      'NE': '31','NV': '32','NH': '33','NJ': '34','NM': '35','NY': '36','NC': '37','ND': '38','OH': '39',
      'OK': '40','OR': '41','PA': '42','RI': '44','SC': '45','SD': '46','TN': '47','TX': '48','UT': '49',
      'VT': '50','VA': '51','WA': '53','WV': '54','WI': '55','WY': '56','PR': '72'
    };
    const key = String(stateAbbr || '').toUpperCase();
    return map[key] || '';
  }
  
  /**
   * Safe snippet function for logging
   */
  function safeSnippet(text) {
    try {
      if (typeof text !== 'string') return '';
      const trimmed = text.replace(/\s+/g, ' ').trim();
      return trimmed.length > 400 ? trimmed.substring(0, 400) + '…' : trimmed;
    } catch (e) {
      return '';
    }
  }
  
  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
  
  /**
   * Gets all data from the active sheet
   */
  function getSheetData() {
    const sheet = SpreadsheetApp.getActiveSheet();
    return sheet.getDataRange().getValues();
  }
  
  /**
   * Gets the active sheet
   */
  function getRankMonitorSheet() {
    return SpreadsheetApp.getActiveSheet();
  }
  
  /**
   * Gets or creates the submit requests sheet for Analysis
   */
  function getSubmitRequestsSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAMES.SUBMIT_REQUESTS);
  
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAMES.SUBMIT_REQUESTS);
  
      // Set up headers
      const headers = ['Prime URL', 'Request Data'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e8f5e8'); // Light green for analysis theme
  
      // Set column widths
      sheet.setColumnWidth(1, 300); // Prime URL
      sheet.setColumnWidth(2, 500); // Request Data
  
      console.log(`✅ Created ${SHEET_NAMES.SUBMIT_REQUESTS} sheet`);
    }
  
    return sheet;
  }
  
  /**
   * Gets or creates the results dump sheet for Analysis
   */
  function getResultsDumpSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAMES.RESULTS_DUMP);
  
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAMES.RESULTS_DUMP);
  
      // Set up headers
      const headers = ['Prime URL', 'Raw DataForSEO Response'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#fff8dc'); // Beige theme complement
  
      // Set column widths
      sheet.setColumnWidth(1, 300); // Prime URL
      sheet.setColumnWidth(2, 600); // Raw DataForSEO Response
  
      console.log(`✅ Created ${SHEET_NAMES.RESULTS_DUMP} sheet`);
    }
  
    return sheet;
  }
  
  /**
   * Logs submit request to submit_requests sheet
   * @param {string} primeUrl - The prime URL being tracked
   * @param {Object} requestData - The request data sent to DataForSEO
   */
  function logSubmitRequest(primeUrl, requestData) {
    try {
      const sheet = getSubmitRequestsSheet();
  
      const rowData = [
        primeUrl || '',
        JSON.stringify(requestData, null, 2)
      ];
  
      sheet.appendRow(rowData);
      console.log(`📤 Active Tab submit request logged for: ${primeUrl}`);
  
    } catch (error) {
      console.error('Failed to log Active Tab submit request:', error);
    }
  }
  
  /**
   * Logs raw DataForSEO response to results_dump sheet
   * @param {string} primeUrl - The prime URL being tracked
   * @param {Object} rawResponse - Raw response from DataForSEO
   */
  function logResultsDump(primeUrl, rawResponse) {
    try {
      const sheet = getResultsDumpSheet();
  
      const rowData = [
        primeUrl || '',
        JSON.stringify(rawResponse, null, 2)
      ];
  
      sheet.appendRow(rowData);
      console.log(`📥 Active Tab results dump logged for: ${primeUrl}`);
  
    } catch (error) {
      console.error('Failed to log Active Tab results dump:', error);
    }
  }
  
  /**
   * Converts Google Sheets data to preflight structure
   * Updated for new column structure: Office, State, Targets, Service, Lat, Long, Prime_URL, Population, Income
   */
  function buildPreflightFromSheet(sheetData) {
    const output = {};
  
    // Skip header row, process data rows
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
  
      // Extract data from columns
      const office = row[BASE_COLUMNS.OFFICE]?.toString().trim();
      const state = row[BASE_COLUMNS.STATE]?.toString().trim();
      const target = row[BASE_COLUMNS.TARGETS]?.toString().trim();
      const service = row[BASE_COLUMNS.SERVICE]?.toString().trim();
      const lat = parseFloat(row[BASE_COLUMNS.LAT]);
      const long = parseFloat(row[BASE_COLUMNS.LONG]);
      const primeUrl = row[BASE_COLUMNS.PRIME_URL]?.toString().trim();
      
      // Skip incomplete rows (require office, target, service, and coordinates)
      if (!office || !target || !service || isNaN(lat) || isNaN(long)) {
        continue;
      }
  
      // Create geo coordinate string
      const geo_coordinate = `${lat},${long}`;
  
      // Use provided prime URL or generate one
      const intended_url = primeUrl || `https://${office.toLowerCase()}.aaacwildliferemoval.com/service-area/${target.toLowerCase().replace(/\s+/g, '-')}/`;
  
      // Initialize office group if not exists
      if (!output[office]) {
        output[office] = [];
      }
  
      // Create entry for this keyword/location combination
      output[office].push({
        location: target,
        service: service,
        intended_url: intended_url,
        geo_coordinate: geo_coordinate,
        keywords: [service],
        rowIndex: i // Store row index for writing task IDs back
      });
    }
  
    return output;
  }
  
  /**
   * Submits jobs to DataForSEO API
   * (Adapted from buildTakeOff.js) - DESKTOP VERSION
   */
  function submitJobsToDataForSEO(preflightData) {
    const config = getDataForSEOConfig();
    const results = {};
  
    for (const [office, items] of Object.entries(preflightData)) {
      results[office] = [];
  
      for (const item of items) {
        const { geo_coordinate, keywords, rowIndex, location, service, intended_url } = item;
  
        for (const keyword of keywords) {
          try {
            // Prepare POST data - DESKTOP VERSION
            const postData = [{
              "keyword": keyword,
              "location_coordinate": geo_coordinate,
              "language_code": "en",
              "device": "desktop",
              "os": "windows"
            }];
  
            // Log request to submit_requests tab
            logSubmitRequest(intended_url, postData[0]);
  
            // Make API call
            const response = UrlFetchApp.fetch(`${config.baseUrl}/task_post`, {
              method: 'POST',
              headers: {
                'Authorization': config.Authorization,
                'Content-Type': 'application/json'
              },
              payload: JSON.stringify(postData)
            });
  
            const responseData = JSON.parse(response.getContentText());
            const taskId = responseData.tasks[0].id;
  
            // Log successful response to audit
            console.log(`✅ Analysis job submitted successfully for ${intended_url}: ${taskId}`);
  
            results[office].push({
              ...item,
              keyword: keyword,
              task_id: taskId,
              status: 'submitted'
            });
  
          } catch (error) {
            console.error(`Error submitting Active Tab job for keyword "${keyword}":`, error);
  
            // Log error to audit
            console.error(`❌ Failed to submit Analysis job for ${intended_url}: ${error.message}`);
  
            results[office].push({
              ...item,
              keyword: keyword,
              task_id: null,
              status: 'error',
              error: error.message
            });
          }
        }
      }
    }
  
    return results;
  }
  
  /**
   * Writes headers and stores task IDs temporarily
   */
  function writeTaskIdsToSheet(taskResults) {
    const sheet = getRankMonitorSheet();
    const columns = findNextEmptyColumns();
  
    // Add headers for this check (always overwrite J and K)
    const headerRow = 1;
    const timestamp = new Date().toLocaleDateString();
  
    sheet.getRange(headerRow, columns.RANK + 1).setValue(`Desktop Ranking ${timestamp}`);
    sheet.getRange(headerRow, columns.URL + 1).setValue(`Desktop Ranking URL ${timestamp}`);
  
    // Store column info and store task IDs temporarily
    for (const [office, items] of Object.entries(taskResults)) {
      for (const item of items) {
        if (item.task_id && item.rowIndex) {
          item.rankColumn = columns.RANK;
          item.urlColumn = columns.URL;
        }
      }
    }
  
    // Store task IDs temporarily for later retrieval
    storeTaskIds(taskResults);
  }
  
  /**
   * Gets task IDs from temporary storage (since we no longer store them in the sheet)
   * This will need to be called immediately after job submission
   */
  function getTaskIdsFromSheet() {
    // Since we no longer store task IDs in the sheet, we need to get them from
    // the temporary storage created during job submission
    // For now, return empty array - this function needs to be refactored
    // to work with the new approach where task IDs are managed differently
    console.log('Task IDs are no longer stored in sheet - using temporary storage');
    return [];
  }
  
  /**
   * Fetches results from DataForSEO
   * (Adapted from landThePlane.js)
   */
  function fetchResultsFromDataForSEO(taskIds) {
    const config = getDataForSEOConfig();
    const results = [];
  
    for (const task of taskIds) {
      try {
        // Log request to audit
        console.log(`📥 Fetching Analysis results for ${task.intended_url}: ${task.taskId}`);
  
        // Fetch results for this task
        const response = UrlFetchApp.fetch(
          `${config.baseUrl}/task_get/regular/${task.taskId}`,
          {
            headers: { 'Authorization': config.Authorization }
          }
        );
  
        const responseData = JSON.parse(response.getContentText());
        const taskResult = responseData.tasks[0];
  
        // Debug: Log the complete response from DataForSEO
        console.log(`🔍 DataForSEO API Response for ${task.taskId}:`, JSON.stringify(responseData, null, 2));
        console.log(`📊 Task Result:`, JSON.stringify(taskResult, null, 2));
        console.log(`🎯 Task Status: ${taskResult.status_message}`);
        console.log(`📈 Results Length: ${taskResult.result ? taskResult.result.length : 'null'}`);
  
        if (taskResult.result && taskResult.result.length > 0) {
          // Extract ranking data for any aaacwildliferemoval.com domain
          const rankings = extractRankingData(taskResult.result, task.intended_url);
  
          // Get raw SERP results (all organic items)
          const rawSerpItems = taskResult.result[0]?.items || [];
  
          // Debug: log the structure to understand what we're getting
          console.log('TaskResult structure:', JSON.stringify(taskResult, null, 2));
  
          // Log successful response to audit
          // Log raw DataForSEO response to results_dump tab
          logResultsDump(task.intended_url, taskResult);
  
          console.log(`✅ Analysis results fetched for ${task.intended_url}: Found ${rawSerpItems.length} items, Domain rank: ${rankings.length > 0 ? rankings[0].rank : 'Not found'}`);
  
          results.push({
            ...task,
            rankings: rankings,
            status: 'completed'
          });
        } else {
          // Log no results to audit
          console.log(`⚠️ No Analysis results found for ${task.intended_url}: ${task.taskId}`);
  
          results.push({
            ...task,
            rankings: [],
            status: 'no_results'
          });
        }
  
      } catch (error) {
        console.error(`Error fetching Active Tab results for task ${task.taskId}:`, error);
  
        // Log error to audit
        console.error(`❌ Failed to fetch Analysis results for ${task.intended_url}: ${error.message}`);
  
        results.push({
          ...task,
          rankings: [],
          status: 'error',
          error: error.message
        });
      }
    }
  
    return results;
  }
  
  /**
   * Extracts ranking data from SERP results, looking for any aaacwildliferemoval.com domain
   * @param {Array} serpResults - Raw SERP results from DataForSEO
   * @param {string} intendedUrl - The intended URL context (used for logging)
   * @returns {Array} Array of ranking objects with rank and URL (for any aaacwildliferemoval.com domain)
   */
  function extractRankingData(serpResults, intendedUrl) {
    const rankings = [];
    const targetDomain = 'aaacwildliferemoval.com';
  
    console.log(`🔍 Searching for ${targetDomain} in SERP results for ${intendedUrl}`);
    console.log(`📊 SERP results structure:`, JSON.stringify(serpResults, null, 2));
  
    for (const result of serpResults) {
      if (result.items && Array.isArray(result.items)) {
        console.log(`📋 Found ${result.items.length} items in SERP results`);
  
        for (let i = 0; i < result.items.length; i++) {
          const item = result.items[i];
          console.log(`🔗 Item ${i+1}: type=${item.type}, rank=${item.rank_group}, url=${item.url}`);
  
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
  
    console.log(`📈 Total matches found: ${rankings.length}`);
    return rankings;
  }
  
  /**
   * Writes results back to the Active Tab sheet
   */
  function writeResultsToSheet(results) {
    const sheet = getRankMonitorSheet();
  
    if (results.length === 0) return;
  
    // Use the columns from the first result to determine where to write
    const rankColumn = results[0].rankColumn || findNextEmptyColumns().RANK;
    const urlColumn = results[0].urlColumn || findNextEmptyColumns().URL;
  
    for (const result of results) {
      const row = result.rowIndex + 1;
  
      // Get best ranking (lowest rank number) and corresponding URL
      let newRank = null;
      let rankingUrl = null;
  
      if (result.rankings.length > 0) {
        // Find the ranking with the lowest rank number (best position)
        const bestRanking = result.rankings.reduce((best, current) =>
          current.rank < best.rank ? current : best
        );
  
        newRank = bestRanking.rank;
        rankingUrl = bestRanking.url;
      }
  
      // Write to both ranking and URL columns
      sheet.getRange(row, rankColumn + 1).setValue(newRank || 'Not Found');
      sheet.getRange(row, urlColumn + 1).setValue(rankingUrl || 'Not Found');
    }
  }
  
  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  /**
   * Checks status of submitted jobs
   */
  function checkJobStatus() {
    const taskIds = getStoredTaskIds();
  
    if (taskIds.length === 0) {
      SpreadsheetApp.getUi().alert('No Jobs Found', 'No active Active Tab jobs to check.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  
    SpreadsheetApp.getUi().alert(
      'Job Status',
      `Found ${taskIds.length} active Active Tab jobs.\\n\\nIf you submitted jobs 2-5 minutes ago, they should be ready.\\n\\nClick "Get Results" to fetch them.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
  
  /**
   * Opens the submit requests sheet for viewing
   */
  function viewSubmitRequests() {
    try {
      const sheet = getSubmitRequestsSheet();
      sheet.activate();
  
      SpreadsheetApp.getUi().alert(
        '📤 Submit Requests Log',
        `Analysis submit requests log opened! This sheet shows all requests sent to DataForSEO.\\n\\nColumns:\\n- Prime URL: The specific URL being tracked\\n- Request Data: The complete request payload`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to open Analysis submit requests: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
  
  /**
   * Opens the results dump sheet for viewing
   */
  function viewResultsDump() {
    try {
      const sheet = getResultsDumpSheet();
      sheet.activate();
  
      SpreadsheetApp.getUi().alert(
        '📥 Results Dump',
        `Analysis results dump opened! This sheet shows all raw responses from DataForSEO.\\n\\nColumns:\\n- Prime URL: The specific URL being tracked\\n- Raw DataForSEO Response: Complete response including all SERP data`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to open Analysis results dump: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
  
  /**
   * Clears task data from active sheet and temporary storage
   */
  function clearTaskData() {
    const response = SpreadsheetApp.getUi().alert(
      'Clear Task Data',
      'This will clear all ranking data from the active sheet and stored task IDs. Continue?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
  
    if (response !== SpreadsheetApp.getUi().ButtonSet.YES) return;
  
    const sheet = getRankMonitorSheet();
    const lastRow = sheet.getLastRow();
  
    // Clear only ranking data columns J and K
    const rankCol = BASE_COLUMNS.FIRST_DATA_COL + 1; // Column J (1-based)
    const urlCol = BASE_COLUMNS.FIRST_DATA_COL + 2;  // Column K (1-based)
    
    // Clear headers
    sheet.getRange(1, rankCol).clearContent();
    sheet.getRange(1, urlCol).clearContent();
    
    // Clear data rows
    if (lastRow > 1) {
      sheet.getRange(2, rankCol, lastRow - 1, 1).clearContent(); // Clear rank column
      sheet.getRange(2, urlCol, lastRow - 1, 1).clearContent();  // Clear URL column
    }
  
    // Clear stored task IDs
    clearStoredTaskIds();
  
    SpreadsheetApp.getUi().alert('✅ Cleared', 'Analysis task data and stored task IDs have been cleared.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  /**
   * Tests DataForSEO API connection
   */
  function testDataForSEOConnection() {
    try {
      const config = getDataForSEOConfig();
  
      // Make a simple test call
      const response = UrlFetchApp.fetch(`${config.baseUrl}/task_get`, {
        headers: { 'Authorization': config.Authorization }
      });
  
      if (response.getResponseCode() === 200) {
        SpreadsheetApp.getUi().alert('✅ Connection Successful', 'DataForSEO API connection is working for Active Tab!', SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        SpreadsheetApp.getUi().alert('❌ Connection Failed', `API returned status: ${response.getResponseCode()}`, SpreadsheetApp.getUi().ButtonSet.OK);
      }
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Connection Error', `Failed to connect: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
  
  // =============================================================================
  // TASK ID STORAGE FUNCTIONS (for temporary storage since we don't store in sheet)
  // =============================================================================
  
  /**
   * Stores task IDs temporarily in Script Properties
   */
  function storeTaskIds(taskResults) {
    const taskData = [];
  
    for (const [office, items] of Object.entries(taskResults)) {
      for (const item of items) {
        if (item.task_id && item.rowIndex) {
          taskData.push({
            taskId: item.task_id,
            rowIndex: item.rowIndex,
            keyword: item.service,
            office: office,
            target: item.location,
            intended_url: item.intended_url,
            rankColumn: item.rankColumn,
            urlColumn: item.urlColumn
          });
        }
      }
    }
  
    // Store in Script Properties with timestamp (use unique key for Active Tab)
    const timestamp = new Date().getTime();
    PropertiesService.getScriptProperties().setProperty('sanAntonioDesktopTaskIds', JSON.stringify(taskData));
    PropertiesService.getScriptProperties().setProperty('sanAntonioDesktopTaskIds_timestamp', timestamp.toString());
  
    console.log(`Stored ${taskData.length} Active Tab task IDs temporarily`);
  }
  
  /**
   * Retrieves stored task IDs from Script Properties
   */
  function getStoredTaskIds() {
    try {
      const taskData = PropertiesService.getScriptProperties().getProperty('sanAntonioDesktopTaskIds');
      const timestamp = PropertiesService.getScriptProperties().getProperty('sanAntonioDesktopTaskIds_timestamp');
  
      if (!taskData) {
        console.log('No stored Active Tab task IDs found');
        return [];
      }
  
      // Check if data is too old (more than 30 minutes)
      const currentTime = new Date().getTime();
      const storedTime = parseInt(timestamp || '0');
      const maxAge = 30 * 60 * 1000; // 30 minutes
  
      if (currentTime - storedTime > maxAge) {
        console.log('Stored Active Tab task IDs are too old, clearing them');
        clearStoredTaskIds();
        return [];
      }
  
      const parsed = JSON.parse(taskData);
      console.log(`Retrieved ${parsed.length} stored Active Tab task IDs`);
      return parsed;
  
    } catch (error) {
      console.error('Error retrieving stored Active Tab task IDs:', error);
      return [];
    }
  }
  
  /**
   * Clears stored task IDs from Script Properties
   */
  function clearStoredTaskIds() {
    PropertiesService.getScriptProperties().deleteProperty('sanAntonioDesktopTaskIds');
    PropertiesService.getScriptProperties().deleteProperty('sanAntonioDesktopTaskIds_timestamp');
    console.log('Cleared stored Active Tab task IDs');
  }
  
  // =============================================================================
  // AUTOMATION SETUP AND MANAGEMENT FUNCTIONS
  // =============================================================================
  
  /**
   * Sets up daily automation trigger - user chooses the time
   */
  function setupDailyAutomation() {
    try {
      const ui = SpreadsheetApp.getUi();
  
      // Show information about automation
      const setupResponse = ui.alert(
        '🤖 Setup Active Tab Daily Automation',
        'This will create a daily trigger to automatically check Active Tab rankings.\\n\\nAfter clicking OK, you will be shown instructions to set up the time trigger manually in the Apps Script interface.',
        ui.ButtonSet.OK_CANCEL
      );
  
      if (setupResponse !== ui.Button.OK) return;
  
      // Check if automation is already set up
      const existingTriggers = ScriptApp.getProjectTriggers();
      const dailyTrigger = existingTriggers.find(trigger =>
        trigger.getHandlerFunction() === 'dailyRankingCheck'
      );
  
      if (dailyTrigger) {
        ui.alert(
          '⚠️ Automation Already Active',
          'Active Tab daily automation is already set up!\\n\\nIf you want to change the time, first click "Disable Automation", then set it up again.',
          ui.ButtonSet.OK
        );
        return;
      }
  
      // Show setup instructions
      ui.alert(
        '📋 Setup Instructions',
        'To complete the Active Tab setup:\\n\\n1. Go to Apps Script (script.google.com)\\n2. Open your project\\n3. Click "Triggers" (clock icon on left)\\n4. Click "+ Add Trigger"\\n5. Choose:\\n   - Function: dailyRankingCheck\\n   - Event source: Time-driven\\n   - Type: Day timer\\n   - Time: Pick your preferred time\\n6. Click "Save"\\n\\nRecommended time: 9:00 AM (after business hours start)',
        ui.ButtonSet.OK
      );
  
      // Store automation preference
      PropertiesService.getScriptProperties().setProperty('sanAntonioDesktopAutomation_enabled', 'true');
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to setup Active Tab automation: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      console.error('Setup Active Tab automation error:', error);
    }
  }
  
  /**
   * Disables daily automation by removing triggers
   */
  function disableAutomation() {
    try {
      const ui = SpreadsheetApp.getUi();
  
      const response = ui.alert(
        '🔕 Disable Active Tab Automation',
        'This will remove the Active Tab daily automation trigger. You can still run rankings manually.\\n\\nContinue?',
        ui.ButtonSet.YES_NO
      );
  
      if (response !== ui.Button.YES) return;
  
      // Remove all triggers for dailyRankingCheck function
      const triggers = ScriptApp.getProjectTriggers();
      let removedCount = 0;
  
      for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'dailyRankingCheck') {
          ScriptApp.deleteTrigger(trigger);
          removedCount++;
        }
      }
  
      // Remove automation preference
      PropertiesService.getScriptProperties().deleteProperty('sanAntonioDesktopAutomation_enabled');
  
      if (removedCount > 0) {
        ui.alert(
          '✅ Automation Disabled',
          `Removed ${removedCount} Active Tab automation trigger(s).\\n\\nDaily automation is now disabled. You can still run rankings manually using the menu.`,
          ui.ButtonSet.OK
        );
      } else {
        ui.alert(
          'ℹ️ No Automation Found',
          'No active Active Tab automation triggers were found to remove.',
          ui.ButtonSet.OK
        );
      }
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Error', `Failed to disable Active Tab automation: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      console.error('Disable Active Tab automation error:', error);
    }
  }
  
  /**
   * Tests the daily ranking check function manually
   */
  function testDailyRankingCheck() {
    try {
      const ui = SpreadsheetApp.getUi();
  
      const response = ui.alert(
        '🧪 Test Active Tab Daily Check',
        'This will run the complete automated Active Tab daily ranking check process.\\n\\nThis includes:\\n- Submit jobs\\n- Wait 5 minutes\\n- Get results\\n\\nThis may take 6-7 minutes total. Continue?',
        ui.ButtonSet.YES_NO
      );
  
      if (response !== ui.Button.YES) return;
  
      ui.alert('⏳ Starting Test...', 'Running automated Active Tab daily check. This will take about 6-7 minutes.\\n\\nYou can monitor progress in the Apps Script logs.', ui.ButtonSet.OK);
  
      // Run the daily check
      dailyRankingCheck();
  
      ui.alert(
        '✅ Test Completed!',
        'Active Tab daily ranking check test completed successfully!\\n\\nCheck your sheet for updated rankings.',
        ui.ButtonSet.OK
      );
  
    } catch (error) {
      SpreadsheetApp.getUi().alert('❌ Test Failed', `Active Tab daily check test failed: ${error.message}\\n\\nCheck the Apps Script logs for more details.`, SpreadsheetApp.getUi().ButtonSet.OK);
      console.error('Test Active Tab daily check error:', error);
    }
  }
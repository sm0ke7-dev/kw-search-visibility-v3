/**
 * Google Apps Script for Keyword Generation
 * Generates keyword combinations using templates from spreadsheet data
 * 
 * Usage: Run generateKeywords() function from Apps Script editor
 */

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
    .addSeparator()
    .addItem('Generate for Wildlife Removal', 'generateKeywordsForService("wildlife removal")')
    .addItem('Generate for Raccoon Removal', 'generateKeywordsForService("raccoon removal")')
    .addItem('Generate for Squirrel Removal', 'generateKeywordsForService("squirrel removal")')
    .addItem('Generate for Bat Removal', 'generateKeywordsForService("bat removal")')
    .addToUi();
}

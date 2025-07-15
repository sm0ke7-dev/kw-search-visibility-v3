const fs = require('fs');
const path = require('path');
const buildPreflight = require('./buildPreflight');
const buildTakeOff = require('./buildTakeOff');
const landThePlane = require('./landThePlane');

const topDomain = "aaacwildliferemoval.com";
const rankingPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'ranking_pages.json'), 'utf-8'));
const serviceLocationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'service_location_data.json'), 'utf-8'));
const placeholders = JSON.parse(fs.readFileSync(path.join(__dirname, 'placeholder.json'), 'utf-8'));

// Read DataForSEO configuration
const dataForSeoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_for_seo.json'), 'utf-8'));

// Phase 1: Preflight
async function preflight() {
  try {
    console.log('📋 Starting PREFLIGHT phase...');
    const preFlight = buildPreflight({ rankingPages, serviceLocationData, placeholders });
    
    // Write PreFlight output
    fs.writeFileSync(path.join(__dirname, 'pre-flight-output.json'), JSON.stringify(preFlight, null, 2));
    console.log('✅ PREFLIGHT COMPLETE! PreFlight output written to pre-flight-output.json');
    console.log('🚀 Ready for takeoff phase.');
    
  } catch (error) {
    console.error('Error in preflight phase:', error);
  }
}

// Phase 2: Takeoff
async function takeoff() {
  try {
    console.log('🚀 Starting TAKEOFF phase...');
    
    // Check if preflight file exists
    if (!fs.existsSync(path.join(__dirname, 'pre-flight-output.json'))) {
      console.error('❌ No pre-flight-output.json found. Please run preflight phase first.');
      return;
    }
    
    // Read preflight output
    const preFlight = JSON.parse(fs.readFileSync(path.join(__dirname, 'pre-flight-output.json'), 'utf-8'));
    
    // Build and write Take Off JSON
    const takeOffObject = await buildTakeOff(preFlight, dataForSeoConfig);
    fs.writeFileSync(path.join(__dirname, 'takeoff-output.json'), JSON.stringify(takeOffObject, null, 2));
    console.log('✅ TAKEOFF COMPLETE! Take Off JSON written to takeoff-output.json');
    console.log('⏳ Tasks submitted to DataForSEO. Wait for completion before running landing phase.');
    
  } catch (error) {
    console.error('Error in takeoff phase:', error);
  }
}

// Phase 3: Landing
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

// Run preflight by default (Phase 1)
preflight(); 
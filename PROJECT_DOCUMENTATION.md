# Search Visibility Pipeline - Project Documentation

## Overview
This is a modular 3-phase search visibility pipeline with an aviation theme, designed to track keyword rankings for the domain `aaacwildliferemoval.com` using DataForSEO's SERP API.

## Project Architecture

### Aviation Theme
- **Preflight** (`buildPreflight.js`): Prepares and validates data
- **Takeoff** (`buildTakeOff.js`): Submits tasks to DataForSEO API
- **Landing** (`landThePlane.js`): Retrieves and processes SERP results
- **Governor** (`governor.js`): Orchestrates the entire pipeline

### Pipeline Flow
```
Input Data → Preflight → Takeoff → Landing → Results
```

## File Structure

### Core Pipeline Files
- `governor.js` - Main orchestrator (production)
- `buildPreflight.js` - Data preparation phase
- `buildTakeOff.js` - API task submission phase  
- `landThePlane.js` - Results retrieval and processing phase

### Configuration Files
- `data_for_seo.json` - DataForSEO API credentials
- `dataforseo-serp.js` - DataForSEO API configuration
- `service_location_data.json` - Input data with locations, services, and keywords

### Output Files
- `pre-flight-output.json` - Validated and prepared data
- `takeoff-output.json` - Submitted tasks with task IDs
- `landing-results.json` - Final SERP results with rankings

### Supporting Files
- `ranking_pages.json` - Keyword ranking data
- `placeholder.json` - Template data structure
- `plan.md` - Original project planning document

## Data Structure

### Input Structure (`service_location_data.json`)
```json
{
  "location_name": [
    {
      "service": "service_name",
      "keywords": {
        "keyword1": {},
        "keyword2": {}
      }
    }
  ]
}
```

### Takeoff Output Structure (`takeoff-output.json`)
```json
{
  "location_name": [
    {
      "service": "service_name", 
      "keywords": {
        "keyword1": {
          "task_id": "1234567890",
          "status": "submitted"
        }
      }
    }
  ]
}
```

### Landing Results Structure (`landing-results.json`)
```json
{
  "location_name": [
    {
      "service": "service_name",
      "keywords": {
        "keyword1": {
          "status": "completed",
          "rankings": [
            {"rank": 1, "url": "https://aaacwildliferemoval.com/page1"},
            {"rank": 3, "url": "https://aaacwildliferemoval.com/page2"}
          ]
        }
      }
    }
  ]
}
```

## Key Features

### Domain Filtering
- Only returns rankings for `aaacwildliferemoval.com` domain
- Filters out all other domains from SERP results
- Supports any subdomain of the main domain

### Modular Design
- Each phase can be run independently
- Files are read/written between phases
- Easy to debug and test individual components

### Error Handling
- Graceful handling of API failures
- Status tracking for each keyword
- Empty arrays for failed/skipped keywords

### Checkpointing & Resume Capability
- **Automatic checkpointing**: Saves progress every 20 keywords processed
- **Resume functionality**: Can restart from where it left off if interrupted
- **Progress tracking**: Shows percentage completion and keyword counts
- **Fault tolerance**: Internet breaks, API errors, or crashes won't lose progress
- **Status-based resuming**: Skips already "completed" keywords on restart

## Usage Instructions

### Running the Full Pipeline
```bash
node governor.js
```

### Running Individual Phases
```bash
# Preflight only
node buildPreflight.js

# Takeoff only  
node buildTakeOff.js

# Landing only
node landThePlane.js
```

### Prerequisites
1. Valid DataForSEO API credentials in `data_for_seo.json`
2. Input data in `service_location_data.json`
3. Node.js with required dependencies installed

## API Integration

### DataForSEO Configuration
- Uses DataForSEO's Google Organic SERP API
- Polls for task completion with 10-second intervals
- Maximum 30 attempts (5 minutes) per task
- Requires Authorization header with API token

### Rate Limiting
- Built-in delays between API calls
- Respects DataForSEO's rate limits
- Graceful handling of API errors

## Development Notes

### Testing
- Test files have been cleaned up
- Use small datasets for testing (3-5 keywords)
- Production governor.js remains unchanged without confirmation

### File Dependencies
- Landing phase requires `takeoff-output.json`
- Takeoff phase requires `pre-flight-output.json`
- Preflight phase requires `service_location_data.json`

### Status Values
- `"completed"`: Successfully processed
- `"error"`: Failed due to API error
- `"skipped"`: Skipped due to invalid status
- `"submitted"`: Task submitted to DataForSEO

## Troubleshooting

### Common Issues
1. **Missing input files**: Ensure all required JSON files exist
2. **API errors**: Check DataForSEO credentials and rate limits
3. **No results**: Verify domain filtering logic
4. **Timeout errors**: Increase maxAttempts in landThePlane.js
5. **Interrupted processing**: Simply restart - will resume from checkpoint

### Debug Mode
- Each phase logs detailed progress
- Console output shows processing status
- Error messages include specific failure reasons
- Checkpoint progress: "💾 Checkpoint saved: 40/150 keywords (26.7%)"

## Future Enhancements
- Support for multiple domains
- Additional search engines (Bing, Yahoo)
- Export to CSV/Excel formats
- Historical ranking tracking
- Automated scheduling

---

**Last Updated**: Current session
**Domain**: aaacwildliferemoval.com
**API Provider**: DataForSEO
**Pipeline Status**: Production Ready 
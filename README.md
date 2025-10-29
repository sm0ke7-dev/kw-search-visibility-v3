# Search Visibility Project

A comprehensive keyword generation and ranking tracking system using Google Apps Script and DataForSEO API with automated scheduling capabilities.

## 🚀 Current Features

### Keyword Generation
- **Template-based keyword generation** with SEO prioritization
- **Geographic targeting** with location modifiers
- **Batch processing** for large datasets
- **Google Sheets integration** with custom menu

### Ranking Tracking (v2)
- **500-keyword batch processing** with DataForSEO API
- **3-page SERP results** (30 results per keyword)
- **Intelligent retry system** (up to 8 retries for queued tasks)
- **Real-time progress tracking** in Google Sheets
- **Raw response data** for comprehensive auditing
- **Skip logic** for already processed keywords

### Automated Scheduling (v3)
- **Config-driven batch processing** with configurable batch sizes
- **Separate config sheet** for task tracking and status management
- **Automated triggers** for submission and fetching phases
- **Resume capability** across multiple runs
- **Scalable processing** for up to 4,000 keywords

## 📁 File Structure

### Core Scripts
- `Gordon-kw-script-v3.js` - **NEW** Automated scheduling script with config sheet
- `Gordon-kw-script-v2.js` - Main ranking tracking script (500-keyword batches)
- `Gordon-kw-script-v1.js` - Backup version
- `KW_GEN_PLUS_KW_RANKING.js` - Original keyword generation + ranking script

### Data Files
- `pre-flight-output.json` - Pre-generated keyword data
- `data_for_seo.json` - API configuration
- `service_location_data.json` - Location and service data

## 🔧 Setup

### Google Apps Script Setup
1. Create a new Google Apps Script project
2. Copy `Gordon-kw-script-v3.js` content (recommended) or `Gordon-kw-script-v2.js` for manual processing
3. Add DataForSEO API key to Script Properties:
   - Key: `basic`
   - Value: Your DataForSEO API key

### DataForSEO Configuration
- **API Endpoint**: `/v3/serp/google/organic`
- **Batch Size**: Configurable in config sheet (default: 100)
- **Depth**: 30 results (3 pages) per keyword
- **Wait Time**: 5 minutes per batch (v2) / 10 minutes fetch interval (v3)
- **Retries**: 8 attempts for queued tasks

## 📊 Column Mapping

### Input Data (Sheet1)
- **Column K**: Keywords with geo modifiers
- **Column L**: Latitude coordinates
- **Column M**: Longitude coordinates

### Output Data (Sheet1)
- **Column N**: Ranking Position
- **Column O**: Ranking URL
- **Column P**: Raw Response Data (JSON)

### Config Sheet (v3)
- **Column A**: Batch Size (configurable, default: 100)
- **Column B**: Job IDs (DataForSEO task IDs)
- **Column C**: Status (submitted/pending/fetched/error)
- **Column D**: Submitted Timestamp
- **Column E**: Completed Timestamp

## ⚡ Performance

### Batch Processing
- **100 keywords per batch** (optimized for reliability)
- **5-minute wait time** per batch
- **Up to 8 retries** for queued tasks
- **Real-time progress updates** in Column L

### Cost Optimization
- **30 results per keyword** (vs 100 default)
- **Lower cost** per API call
- **Comprehensive data** for auditing

## 🎯 Usage

### v3 - Automated Scheduling (Recommended)
1. Open Google Sheets with your keyword data
2. Go to **🔍 Gordon KW + Rankings** menu
3. Select **"Run Ranking Check on Sheet"**
4. Script automatically:
   - Submits batches every 5 minutes
   - Fetches results every 10 minutes
   - Writes status to config sheet
   - Auto-stops when complete
5. Monitor progress in config sheet

### v2 - Manual Processing
1. Open Google Sheets with your keyword data
2. Go to **🔍 Gordon KW + Rankings** menu
3. Select **"On-demand Check"**
4. Confirm the batch processing dialog
5. Monitor progress in Column L

### Resume Capability
- Script automatically skips already processed keywords
- Safe to stop and restart at any time
- No data loss on interruption
- Config sheet tracks all task statuses

## 📈 Recent Updates

### v3.0 Features (NEW)
- ✅ **Automated scheduling** with config-driven batch processing
- ✅ **Separate config sheet** for task tracking and status management
- ✅ **Scalable processing** for up to 4,000 keywords
- ✅ **Auto-trigger management** (creates and removes triggers automatically)
- ✅ **Resume capability** across multiple runs
- ✅ **Configurable batch sizes** via config sheet

### v2.0 Features
- ✅ 500-keyword batch processing
- ✅ 3-page SERP results (depth: 30)
- ✅ Intelligent retry system (8 attempts)
- ✅ Raw response data in Column P
- ✅ Fixed row mapping for accurate results
- ✅ 5-minute wait time per batch
- ✅ Real-time progress tracking

### Performance Improvements
- **8.4x faster** than original individual processing
- **60x faster** submission with batch API
- **Comprehensive auditing** with raw response data
- **Reliable processing** with intelligent retries
- **Hands-off automation** for large-scale keyword tracking

## 🔍 Troubleshooting

### Common Issues
- **"Task In Queue"**: Normal - script will retry automatically
- **No results written**: Check column mapping and API key
- **Script timeout**: Reduce batch size or wait time
- **Triggers not running**: Check Apps Script Triggers page
- **Config sheet missing**: Script auto-creates on first run

### Debug Information
- Check execution logs for detailed progress
- Raw response data in Column P for API debugging
- Progress updates in Column L during processing (v2)
- Status tracking in config sheet (v3)
- Apps Script Triggers page shows active automation

## 📝 Notes
- Repository is private with credentials for team use
- `node_modules` and output files are gitignored
- All scripts include comprehensive error handling
- DataForSEO API limits: 1000 keywords per batch (we use 100 for reliability)
- v3 recommended for large-scale automation (4,000+ keywords)
- v2 suitable for smaller, manual processing runs 
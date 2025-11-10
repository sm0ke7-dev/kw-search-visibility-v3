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

### Automated Scheduling (v3.2)
- **Config-driven batch processing** via `config!A2` (default 50)
- **Independent triggers**: submit every 5 min, fetch every 10 min
- **Headless operation** (installable triggers; sheet need not be open)
- **Status UX**: toasts + live status in `kw_variants!N1`
- **Resume capability** across multiple runs (submit cursor + dedupe)
- **Scalable processing** for up to 4,000 keywords
- **Sequence preservation**: Results maintain original keyword order from `kw_variants`
- **Keyword tracking in config**: Job IDs include keyword column for easy auditing
- **Pending placeholders**: Shows which keywords are waiting for results
- **Overwrite protection**: Automatically overwrites old data and "Pending" placeholders

## 📁 File Structure

### Core Scripts
- `Gordon-kw-script-v3.2.js` - **Latest**: Sequence-preserving scheduling with keyword tracking (recommended)
- `Gordon-kw-script-v3.1.js` - Automated scheduling with live status and scan optimizations
- `Gordon-kw-script-v3.js` - Earlier scheduler version (modal alerts)
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
2. Copy `Gordon-kw-script-v3.2.js` content (recommended) or `Gordon-kw-script-v2.js` for manual processing
3. Add DataForSEO API key to Script Properties:
   - Key: `basic`
   - Value: Your DataForSEO API key

### DataForSEO Configuration
- **API Endpoint**: `/v3/serp/google/organic`
- **Batch Size**: Configurable in config sheet (default: 50)
- **Depth**: 30 results (3 pages) per keyword
- **Wait/Intervals**: v2 waits 5 minutes per batch; v3.2 runs submit every 5 min and fetch every 10 min
- **Retries**: 8 attempts for queued tasks

## 📊 Column Mapping

### Input Data (Sheet1)
- **Column K**: Keywords with geo modifiers
- **Column L**: Latitude coordinates
- **Column M**: Longitude coordinates

### Output Data
- v2: **Column N** Ranking Position, **Column O** Ranking URL, **Column P** Raw Response (JSON)
- v3.1: appended to `ranking_results` → **A** Position, **B** URL, **C** Raw, **D** Keyword
- v3.2: appended to `ranking_results` → **A** Position, **B** URL, **C** Keyword (raw response removed for performance)

### Config Sheet (v3.2)
- **Column A**: Batch Size (configurable, default: 50)
- **Column B**: Job IDs (DataForSEO task IDs)
- **Column C**: Keyword (for easy auditing)
- **Column D**: Source Row (original row number from kw_variants)
- **Column E**: Status (submitted/pending/fetched/error)
- **Column F**: Submitted Timestamp
- **Column G**: Completed Timestamp

## ⚡ Performance

### Batch Processing
- **50 keywords per batch** (default, configurable in `config!A2`)
- **5-minute wait time** per batch
- **Up to 8 retries** for queued tasks
- **Real-time progress updates** in `kw_variants!N1`

### Cost Optimization
- **30 results per keyword** (vs 100 default)
- **Lower cost** per API call
- **Comprehensive data** for auditing

## 🎯 Usage

### v3.2 - Automated Scheduling (Recommended)
1. Open Google Sheets with your keyword data
2. Go to **🔍 Gordon KW + Rankings** menu
3. Select **"Run Ranking Check on Sheet"**
4. Script automatically:
   - Submits batches every 5 minutes
   - Fetches results every 10 minutes
   - Writes live status to `kw_variants!N1` and task states to `config`
   - Maintains keyword sequence in `ranking_results` (matches `kw_variants` row order)
   - Auto-stops each trigger when complete
5. Monitor progress in `config` and results in `ranking_results`
6. **Menu Options**:
   - **🛑 Stop All Schedulers**: Stops all running triggers
   - **🔄 Reset Submit Cursor**: Resets to start from row 2
7. Optional: create a time-driven trigger for `runRankingCheckOnSheet` every 2 weeks for hands-off runs

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
- Config sheet tracks all task statuses; submit cursor stored in Script Properties

## 📈 Recent Updates

### v3.2 Highlights (NEW)
- ✅ **Sequence preservation**: Results maintain original keyword order from `kw_variants` column K
- ✅ **Keyword column in config**: Job IDs now include keyword for easy auditing
- ✅ **Source row tracking**: Config sheet stores original row number for sequence alignment
- ✅ **Pending placeholders**: Shows which keywords are waiting for results
- ✅ **Overwrite protection**: Automatically overwrites old data and "Pending" placeholders
- ✅ **Raw response removed**: Improved performance by removing large JSON data from results
- ✅ **Menu controls**: Stop schedulers and reset cursor from menu
- ✅ **Default batch size**: Reduced to 50 (was 100)
- ✅ Automated submit/fetch triggers (5/10 min) running independently
- ✅ Headless execution; results appear without opening the sheet
- ✅ Live status in `kw_variants!N1` + toasts
- ✅ Config-driven batch size (`config!A2`)
- ✅ Optimized scanning for large sheets (reads `ranking_results!C` once)
- ✅ Idempotent writes to `ranking_results`

### v3.1 Highlights
- ✅ Automated submit/fetch triggers (5/10 min) running independently
- ✅ Headless execution; results appear without opening the sheet
- ✅ Live status in `kw_variants!N1` + toasts; optional start modal for editor runs
- ✅ Config-driven batch size (`config!A2`)
- ✅ Optimized scanning for large sheets (reads `ranking_results!D` once)
- ✅ Idempotent writes to `ranking_results`

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
- **Triggers not running**: Check Apps Script Triggers page; ensure installable time-driven triggers exist
- **Config sheet missing**: Script auto-creates on first run

### Debug Information
- Check execution logs for detailed progress
- Raw response data in Column P for API debugging
- Progress updates in Column L during processing (v2)
- Live status in `kw_variants!N1` and task tracking in `config` (v3.1)
- Apps Script Triggers page shows active automation

## 📝 Notes
- Repository is private with credentials for team use
- `node_modules` and output files are gitignored
- All scripts include comprehensive error handling
- DataForSEO API limits: 1000 keywords per batch (we use 100 for reliability)
- v3 recommended for large-scale automation (4,000+ keywords)
- v2 suitable for smaller, manual processing runs 
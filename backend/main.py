from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import re
from typing import List, Dict, Any
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AutoECR API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# EPFO Configuration
EPFO_CONFIG = {
    "pf_salary_cap": 6500,  # Can be updated based on current EPFO rules
    "employee_contribution_rate": 0.12,
    "employer_eps_rate": 8.33 / 12,  # 8.33% of PF salary
    "uan_pattern": re.compile(r'^\d{12}$'),  # 12-digit UAN
    "min_basic_wage": 0,  # Minimum basic wage (can be set)
    "max_basic_wage": 1000000  # Maximum basic wage for validation
}

class ProcessingResult(BaseModel):
    success: bool
    message: str
    files_generated: List[str]
    errors: List[str]

class FileInfo(BaseModel):
    filename: str
    type: str

class DownloadResponse(BaseModel):
    files: List[FileInfo]

def clean_uan(uan) -> str:
    if pd.isna(uan): return ""
    u = str(uan).strip()
    if 'e' in u.lower() or 'E' in u:
        try:
            u = str(int(float(u)))
        except:
            pass
    if u.endswith('.0'):
        u = u[:-2]
    u = u.replace(" ", "").replace("-", "")
    return u

def clean_name(name) -> str:
    if pd.isna(name): return ""
    n = str(name).upper().strip()
    # Remove all special characters (retain A-Z, 0-9, space)
    n = re.sub(r'[^A-Z0-9\s]', ' ', n)
    # Collapse multiple spaces
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def validate_row_data(uan, name, basic_pay):
    if not uan or not name or pd.isna(basic_pay):
        return False
    if basic_pay <= 0:
        return False
    if len(name) < 3 or name in ["NAM", "NAME", "EMP"]:
        return False
    return True

def calculate_pf_contributions(basic_pay: float) -> Dict[str, float]:
    """Calculate PF and EPS contributions"""
    pf_salary = min(basic_pay, EPFO_CONFIG["pf_salary_cap"])
    epf = round(pf_salary * EPFO_CONFIG["employee_contribution_rate"])
    eps_contribution = round(epf * EPFO_CONFIG["employer_eps_rate"])
    er_share = epf - eps_contribution
    
    return {
        "pf_salary": pf_salary,
        "epf": epf,
        "eps_contribution": eps_contribution,
        "er_share": er_share
    }

def find_header_row(df_raw: pd.DataFrame) -> int:
    keywords = ["uan", "pf", "name", "employee", "basic", "wages", "salary"]
    best_row_idx = 0
    max_matches = 0
    # Search the first 50 rows
    for idx, row in df_raw.head(50).iterrows():
        matches = sum(1 for cell in row if pd.notna(cell) and any(kw in str(cell).lower() for kw in keywords))
        if matches > max_matches:
            max_matches = matches
            best_row_idx = idx
        if max_matches >= 3:
            return best_row_idx
    return best_row_idx

def get_name_col_by_length(df: pd.DataFrame) -> str:
    best_col = None
    best_len = 0
    for col in df.columns:
        if df[col].dtype == object or str(df[col].dtype) in ['string', 'string[python]']:
            sample = df[col].dropna().astype(str).head(20)
            if not sample.empty:
                avg = sample.apply(len).mean()
                if avg > best_len:
                    best_len = avg
                    best_col = col
    return best_col

def process_excel_file(file_path: str) -> ProcessingResult:
    """Process Excel file and generate ECR files according to EPFO rules"""
    errors = []
    files_generated = []
    
    try:
        xls = pd.ExcelFile(file_path)
        all_data = []
        
        logger.info(f"Processing Excel file with sheets: {xls.sheet_names}")
        
        for sheet_name in xls.sheet_names:
            try:
                # Read without header to find the header row dynamically
                df_raw = xls.parse(sheet_name, header=None)
                if df_raw.empty:
                    continue
                
                header_idx = find_header_row(df_raw)
                
                # Parse with correct header
                df = xls.parse(sheet_name, header=header_idx)
                
                cols = [str(c).lower().strip() for c in df.columns]
                
                # UAN Column Mapping
                uan_col = None
                for kw in ["uan", "pf", "pf no"]:
                    for idx, c in enumerate(cols):
                        if kw == c or (kw in c and "amount" not in c and "share" not in c):
                            if uan_col is None: uan_col = df.columns[idx]
                
                # Name Column Mapping
                name_col = None
                for kw in ["name of the employee", "employee name", "member name", "name"]:
                    for idx, c in enumerate(cols):
                        if kw == c or kw in c.split():
                            if name_col is None: name_col = df.columns[idx]
                            
                # Basic Column Mapping
                basic_col = None
                for kw in ["basic", "wages", "salary"]:
                    for idx, c in enumerate(cols):
                        if kw == c or kw in c:
                            if basic_col is None: basic_col = df.columns[idx]
                
                if not (uan_col and name_col and basic_col):
                    errors.append(f"Sheet '{sheet_name}': Missing required columns (UAN, Name, Basic)")
                    continue
                
                # Validate name column
                sample_names = df[name_col].dropna().astype(str).head(10)
                avg_len = sample_names.apply(len).mean() if not sample_names.empty else 0
                if avg_len < 4 or sample_names.isin(["NAM", "EMP", "NAME"]).any():
                    alt_name_col = get_name_col_by_length(df)
                    if alt_name_col:
                        name_col = alt_name_col
                
                sheet_data = []
                for idx, row in df.iterrows():
                    raw_basic = row[basic_col]
                    raw_name = row[name_col]
                    
                    if str(raw_basic).lower() in ["total", "grand total", "sum"]:
                        continue
                    if pd.notna(raw_name) and str(raw_name).lower() in ["total", "grand total"]:
                        continue
                        
                    basic_pay = pd.to_numeric(raw_basic, errors="coerce")
                    uan = clean_uan(row[uan_col])
                    name = clean_name(raw_name)
                    
                    if not validate_row_data(uan, name, basic_pay):
                        continue
                    
                    contributions = calculate_pf_contributions(basic_pay)
                    
                    row_data = {
                        "UAN": uan,
                        "Member Name": name,
                        "Gross Wages": int(round(basic_pay)),
                        "EPF Wages": int(round(contributions["pf_salary"])),
                        "EPS Wages": int(round(contributions["pf_salary"])),
                        "EDLI Wages": int(round(contributions["pf_salary"])),
                        "EE Share": int(round(contributions["epf"])),
                        "EPS Contribution": int(round(contributions["eps_contribution"])),
                        "ER Share": int(round(contributions["er_share"])),
                        "NCP Days": 0,
                        "Refund": 0,
                        "Month": sheet_name
                    }
                    
                    sheet_data.append(row_data)
                
                if sheet_data:
                    all_data.extend(sheet_data)
                    logger.info(f"Processed {len(sheet_data)} records from sheet '{sheet_name}'")
                else:
                    errors.append(f"Sheet '{sheet_name}': No valid records found")
                    
            except Exception as e:
                errors.append(f"Error processing sheet '{sheet_name}': {str(e)}")
                continue
        
        if not all_data:
            return ProcessingResult(
                success=False,
                message="No valid data found in any sheet",
                files_generated=[],
                errors=errors
            )
        
        df_all = pd.DataFrame(all_data)
        
        # Output Generation
        ecr_columns = [
            "UAN", "Member Name", "Gross Wages", "EPF Wages", "EPS Wages",
            "EDLI Wages", "EE Share", "EPS Contribution", "ER Share", "NCP Days", "Refund"
        ]
        
        # 1. Consolidated ECR dataset
        consolidated_filename = "Consolidated_ECR.xlsx"
        consolidated_path = os.path.join(OUTPUT_DIR, consolidated_filename)
        df_all[ecr_columns + ["Month"]].to_excel(consolidated_path, index=False)
        files_generated.append(consolidated_filename)
        
        # 2. Month-wise ECR Excel
        monthwise_filename = "Month_wise_ECR.xlsx"
        monthwise_path = os.path.join(OUTPUT_DIR, monthwise_filename)
        with pd.ExcelWriter(monthwise_path) as writer:
            for month, group in df_all.groupby("Month"):
                group[ecr_columns].to_excel(writer, sheet_name=str(month), index=False)
        files_generated.append(monthwise_filename)
        
        summary_data = []
        for month, group in df_all.groupby("Month"):
            # CSV file
            csv_filename = f"ECR_{month}.csv"
            csv_path = os.path.join(OUTPUT_DIR, csv_filename)
            group[ecr_columns].to_csv(csv_path, index=False)
            files_generated.append(csv_filename)
            
            # TXT file (No header, #~# separated)
            txt_filename = f"ECR_{month}.txt"
            txt_path = os.path.join(OUTPUT_DIR, txt_filename)
            with open(txt_path, "w") as f:
                for _, row in group[ecr_columns].iterrows():
                    line = "#~#".join([str(x) for x in row])
                    f.write(line + "\n")
            files_generated.append(txt_filename)
            
            # Summary data
            month_summary = {
                "Month": month,
                "Total Basic Pay": group["Gross Wages"].sum(),
                "Total EPF (EE Share)": group["EE Share"].sum()
            }
            summary_data.append(month_summary)
        
        # Summary Excel
        summary_df = pd.DataFrame(summary_data)
        summary_filename = "Summary.xlsx"
        summary_path = os.path.join(OUTPUT_DIR, summary_filename)
        summary_df.to_excel(summary_path, index=False)
        files_generated.append(summary_filename)
        
        logger.info(f"Generated {len(files_generated)} files")
        
        return ProcessingResult(
            success=True,
            message=f"Successfully processed {len(all_data)} records from {len(df_all['Month'].unique())} months",
            files_generated=files_generated,
            errors=errors
        )
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return ProcessingResult(
            success=False,
            message=f"Error processing file: {str(e)}",
            files_generated=[],
            errors=[str(e)]
        )

@app.post("/upload", response_model=ProcessingResult)
async def upload_file(file: UploadFile = File(...)):
    """Upload and process Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"File uploaded: {file.filename}")
        
        # Process the file
        result = process_excel_file(file_path)
        
        return result
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/downloads", response_model=DownloadResponse)
async def get_downloads():
    """Get list of available download files"""
    try:
        files = []
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            if os.path.isfile(file_path):
                file_type = "CSV" if filename.endswith('.csv') else "Text" if filename.endswith('.txt') else "Excel"
                files.append(FileInfo(filename=filename, type=file_type))
        
        return DownloadResponse(files=files)
        
    except Exception as e:
        logger.error(f"Error getting downloads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get file list")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download a specific file"""
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=filename
    )

@app.get("/config")
async def get_config():
    """Get current EPFO configuration"""
    return EPFO_CONFIG

@app.post("/config")
async def update_config(config: Dict[str, Any]):
    """Update EPFO configuration"""
    global EPFO_CONFIG
    EPFO_CONFIG.update(config)
    return {"message": "Configuration updated successfully"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "AutoECR API is running", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

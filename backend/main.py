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

def validate_uan(uan: str) -> bool:
    """Validate UAN format"""
    if pd.isna(uan):
        return False
    uan_str = str(uan).split('.')[0].strip()
    return bool(EPFO_CONFIG["uan_pattern"].match(uan_str))

def validate_basic_pay(basic_pay: float) -> bool:
    """Validate basic pay amount"""
    if pd.isna(basic_pay):
        return False
    return (EPFO_CONFIG["min_basic_wage"] <= basic_pay <= EPFO_CONFIG["max_basic_wage"])

def clean_member_name(name: str) -> str:
    """Clean and format member name"""
    if pd.isna(name):
        return ""
    return str(name).strip().upper()

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

def process_excel_file(file_path: str) -> ProcessingResult:
    """Process Excel file and generate ECR files"""
    errors = []
    files_generated = []
    
    try:
        xls = pd.ExcelFile(file_path)
        all_data = []
        
        logger.info(f"Processing Excel file with sheets: {xls.sheet_names}")
        
        for sheet_name in xls.sheet_names:
            try:
                df = xls.parse(sheet_name)
                df.columns = [str(c).lower() for c in df.columns]
                
                # Find required columns
                def find_column(keys: List[str]) -> str:
                    for col in df.columns:
                        for k in keys:
                            if k in col:
                                return col
                    return None
                
                uan_col = find_column(["uan", "pf", "uan no", "pf no"])
                name_col = find_column(["name", "employee", "member"])
                basic_col = find_column(["basic", "basic pay", "basic salary"])
                
                if not (uan_col and name_col and basic_col):
                    errors.append(f"Sheet '{sheet_name}': Missing required columns (UAN, Name, Basic Pay)")
                    continue
                
                # Process data
                sheet_data = []
                for idx, row in df.iterrows():
                    uan = row[uan_col]
                    name = row[name_col]
                    basic_pay = pd.to_numeric(row[basic_col], errors="coerce")
                    
                    # Validation
                    if not validate_uan(uan):
                        errors.append(f"Sheet '{sheet_name}', Row {idx+2}: Invalid UAN format - {uan}")
                        continue
                    
                    if not validate_basic_pay(basic_pay):
                        errors.append(f"Sheet '{sheet_name}', Row {idx+2}: Invalid basic pay - {basic_pay}")
                        continue
                    
                    if basic_pay <= 0:
                        continue  # Skip zero or negative basic pay
                    
                    # Calculate contributions
                    contributions = calculate_pf_contributions(basic_pay)
                    
                    # Create row data
                    row_data = {
                        "UAN": str(uan).split('.')[0],
                        "Member Name": clean_member_name(name),
                        "Gross Wages": int(basic_pay),
                        "EPF Wages": int(contributions["pf_salary"]),
                        "EPS Wages": int(contributions["pf_salary"]),
                        "EDLI Wages": int(contributions["pf_salary"]),
                        "EE Share": contributions["epf"],
                        "EPS Contribution": contributions["eps_contribution"],
                        "ER Share": contributions["er_share"],
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
        
        # Create DataFrame
        df_all = pd.DataFrame(all_data)
        
        # Generate output files
        ecr_columns = [
            "UAN", "Member Name", "Gross Wages", "EPF Wages", "EPS Wages",
            "EDLI Wages", "EE Share", "EPS Contribution", "ER Share", "NCP Days", "Refund"
        ]
        
        # Group by month and generate files
        summary_data = []
        for month, group in df_all.groupby("Month"):
            # CSV file
            csv_filename = f"ECR_{month}.csv"
            csv_path = os.path.join(OUTPUT_DIR, csv_filename)
            group[ecr_columns].to_csv(csv_path, index=False)
            files_generated.append(csv_filename)
            
            # Text file for EPFO portal
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
                "Employee Count": len(group),
                "Gross Wages Total": group["Gross Wages"].sum(),
                "EE Share Total": group["EE Share"].sum(),
                "ER Share Total": group["ER Share"].sum()
            }
            summary_data.append(month_summary)
        
        # Generate summary Excel
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

# Simple server without external dependencies
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

class SimpleAPIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"message": "AutoECR Simple API is running", "version": "1.0.0"}
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/downloads':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "files": [
                    {"filename": "demo_ECR_January.csv", "type": "CSV"},
                    {"filename": "demo_ECR_January.txt", "type": "Text"},
                    {"filename": "demo_Summary.xlsx", "type": "Excel"}
                ]
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path.startswith('/download/'):
            filename = self.path[10:]  # Remove '/download/' prefix
            # Create demo file content
            if filename.endswith('.csv'):
                content = "UAN,Member Name,Gross Wages,EPF Wages,EPS Wages,EDLI Wages,EE Share,EPS Contribution,ER Share,NCP Days,Refund\n123456789012,DEMO EMPLOYEE,15000,6500,6500,6500,780,450,330,0,0"
                content_type = 'text/csv'
            elif filename.endswith('.txt'):
                content = "123456789012#~#DEMO EMPLOYEE#~#15000#~#6500#~#6500#~#6500#~#780#~#450#~#330#~#0#~#0"
                content_type = 'text/plain'
            elif filename.endswith('.xlsx'):
                content = "Demo Excel File Content"
                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            else:
                content = "Demo file content"
                content_type = 'application/octet-stream'
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.end_headers()
            self.wfile.write(content.encode())
        elif self.path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-type', 'image/x-icon')
            self.end_headers()
            # Send empty favicon
            self.wfile.write(b'')
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/upload':
            # Simple file upload simulation
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "success": True,
                "message": "File uploaded successfully (demo mode)",
                "files_generated": ["demo_ECR_January.csv", "demo_ECR_January.txt", "demo_Summary.xlsx"],
                "errors": []
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

PORT = 8002
Handler = SimpleAPIHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Simple AutoECR API running at http://localhost:{PORT}")
    httpd.serve_forever()

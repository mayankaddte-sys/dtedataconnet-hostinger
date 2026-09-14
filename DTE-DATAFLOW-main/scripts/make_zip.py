import os
import zipfile

def make_clean_zip():
    output_filenames = ["public/dte-portal-source.zip", "public/dte-portal-source-code.zip"]
    for out in output_filenames:
        if os.path.exists(out):
            os.remove(out)
        
    os.makedirs("public", exist_ok=True)
    
    included_roots = ['src', 'public', 'scripts']
    included_files = [
        'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html',
        'metadata.json', '.env.example', '.gitignore', 'README.md'
    ]
    
    for out in output_filenames:
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in included_files:
                if os.path.exists(file):
                    zipf.write(file, file)
                    
            for folder in included_roots:
                if not os.path.exists(folder):
                    continue
                for root, dirs, files in os.walk(folder):
                    for file in files:
                        if file.endswith('.zip') or file.startswith('.'):
                            continue
                        file_path = os.path.join(root, file)
                        zipf.write(file_path, file_path)
                        
        print(f"Clean zip created successfully at {out}! Size:", round(os.path.getsize(out) / 1024, 2), "KB")

if __name__ == "__main__":
    make_clean_zip()

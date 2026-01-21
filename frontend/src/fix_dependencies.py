import os
import re
import glob

# Get all JS files in pages directory
pages_dir = 'd:/AI/retirenow/retirenow/frontend/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.js'))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace password with masterKey in dependency arrays
    # Match patterns like: }, [user, password, navigate]);
    content = re.sub(r'(\[.*?)\bpassword\b(.*?\])', r'\1masterKey\2', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated: {os.path.basename(filepath)}")

print("\nAll dependency arrays updated!")

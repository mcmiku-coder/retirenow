import os
import re
import glob

# Directory
pages_dir = 'd:/AI/retirenow/retirenow/frontend/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.js'))

# Exclude specific files
exclude_files = ['Landing.js', 'Admin.js']

for filepath in files:
    filename = os.path.basename(filepath)
    if filename in exclude_files:
        print(f"Skipping {filename}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find 'password' as a whole word, NOT surrounded by quotes
    # Negative lookbehind (?<!['"]) and negative lookahead (?!['"]) roughly check for quotes
    # But checking for Balanced quotes is harder with regex. 
    # However, in JS code, 'password' usually appears as variable name.
    # Occurrences like "type='password'" will be matched if I am not careful.
    
    # Let's match specific common patterns first to be safe, or just use a robust regex.
    # Given the grep output, the usages are:
    # !password
    # , password,
    # && password
    
    # We can replace \bpassword\b with masterKey, but we must ignore strings.
    # Simple state machine to ignore strings might be better but let's try regex with standard code structure.
    
    # Pattern: \bpassword\b
    # We will manually exclude known string occurrences if any. 
    # In these pages (except Admin/Landing), "password" string is unlikely to be used unless in logs.
    
    original_content = content
    
    # Replace variable usage
    # 1. argument list: , password, -> , masterKey,
    content = re.sub(r',\s*password\s*,', ', masterKey,', content)
    
    # 2. argument list end: , password) -> , masterKey)
    content = re.sub(r',\s*password\s*\)', ', masterKey)', content)
    
    # 3. boolean checks: !password -> !masterKey
    content = re.sub(r'!\s*password\b', '!masterKey', content)
    
    # 4. boolean checks: && password -> && masterKey
    content = re.sub(r'&& \s*password\b', '&& masterKey', content)
    
    # 5. boolean checks: || password -> || masterKey
    content = re.sub(r'\|\| \s*password\b', '|| masterKey', content)
    
    # 6. if (password) -> if (masterKey)
    content = re.sub(r'if \(\s*password\s*\)', 'if (masterKey)', content)
    
    # 7. (user, password) -> (user, masterKey) inside dependency arrays or refs already fixed?
    # The previous script fixed dependency arrays [..., password, ...] -> [..., masterKey, ...]
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed variable references in: {filename}")
    else:
        print(f"No changes needed in: {filename}")

print("\nVariable reference fix complete!")

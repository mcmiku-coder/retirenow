import os
import glob

# Get all JS files in pages directory
pages_dir = 'd:/AI/retirenow/retirenow/frontend/src/pages'
files = glob.glob(os.path.join(pages_dir, '*.js'))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace password with masterKey in useAuth destructuring
    content = content.replace('const { user, password } = useAuth();', 'const { user, masterKey } = useAuth();')
    content = content.replace('const {user, password} = useAuth();', 'const {user, masterKey} = useAuth();')
    
    # Replace password parameter with masterKey in function calls
    content = content.replace(', password)', ', masterKey)')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated: {os.path.basename(filepath)}")

print("\nAll page files updated successfully!")

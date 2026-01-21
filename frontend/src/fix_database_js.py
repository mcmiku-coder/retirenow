import re

filepath = 'd:/AI/retirenow/retirenow/frontend/src/utils/database.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace checks
# !password -> !masterKey
content = re.sub(r'if \(!password\)', 'if (!masterKey)', content)

# !email || !password -> !email || !masterKey
content = re.sub(r'if \(!email \|\| !password\)', 'if (!email || !masterKey)', content)

# saveUserData(email, password, ...) -> saveUserData(email, masterKey, ...)
content = re.sub(r'saveUserData\(email, password,', 'saveUserData(email, masterKey,', content)

# Fix error messages that mention password
content = re.sub(r'No master key provided', 'No master key provided', content) # this was already correct in some places but let's check
content = re.sub(r'Email and password are required', 'Email and master key are required', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {filepath}")

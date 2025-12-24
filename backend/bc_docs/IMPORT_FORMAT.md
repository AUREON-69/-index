We are making it opionated becuase it is simpler and most of the time it works if people are scraming at us we could change -> dont over engineer.

# Student Import Format

Upload a CSV with these EXACT column names (case-insensitive):

## Required Columns
- `name` - Full name
- `email` - Email address (must be unique)

## Optional Columns
- `phone` - Phone number
- `cgpa` - CGPA (0-10)
- `department` - Department name
- `batch` - Graduation year
- `skills` - Comma-separated (e.g., "Python,React,Docker")
- `github` - GitHub URL
- `linkedin` - LinkedIn URL
## Example CSV
```csv
name,email,cgpa,department,skills,github
Rahul Sharma,rahul@college.edu,8.7,Computer Science,"Python,React,Docker",https://github.com/rahul
Priya Patel,priya@college.edu,9.1,Computer Science,"ML,Python,TensorFlow",https://github.com/priya
```

## Notes
- First row must be headers
- Skills should be comma-separated in quotes
- Missing optional fields will be left blank
- Duplicate emails will be skipped

**Need help?** @x.com/e3he0

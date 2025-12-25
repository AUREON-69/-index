## DONE
[x] fix the query bug (WHERE vs AND)
[x] add some seed data and test the endpoints
[x] add timing and logs

## NOW
[x] csv bulk imports
  - make sure that we take in the csv split the header and add data to our db
  - make it smart and map headers automatically
  - add some kind of validation
  - rate limitng
  
  - /preview and /upload
  
  or fuck this and lets make it opinionated 
[x] basic frontend(just list + detailed view)
[] deploy or just test it locally

## LATER

[] postgres migration
  - need to figure out schema
  - placement table
  - students table
  - admin table
[] auth sys
  - sweet simple jwt auth 
[] stats dashboard
[] pagination
d
# PARKING LOT(coll asf ideas dor later)
- matching algo
- resume parser
- public profiles
- telegram bot?



CLOSED ITERATION LOOP
- if you are writting a fucntion  
  -> it should be small enough to test in < seconds
  -> wtever it is doing it should be the best possible implementation

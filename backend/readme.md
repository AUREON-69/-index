## DONE
[x] fix the query bug (WHERE vs AND)
[x] add some seed data and test the endpoints
[x] add timing and logs
[x] csv bulk imports
  - make sure that we take in the csv split the header and add data to our db
  - make it smart and map headers automatically
  - add some kind of validation
  - rate limitng
  
  - /preview and /upload
  
  or fuck this and lets make it opinionated 
[x] basic frontend(just list + detailed view)
[x] deploy or just test it locally
[x] pagination

## NOW
[] fix the search function in the frontend 
[c] postgres migration
  - need to figure out schema
  - placement table
  - students table
  - admin table

[] stats dashboard
 - frontend stats dashboard works
 - connect bc wht frontend
 
[] placements api
 - build a placements api where users can see current placemtns
 - admins can add new placements that is going on campus 
 
[] auth sys
  - sweet simple jwt auth 
## LATER



# PARKING LOT(coll asf ideas dor later)
- matching algo
- resume parser
- public profiles
- telegram bot?



CLOSED ITERATION LOOP
- if you are writting a fucntion  
  -> it should be small enough to test in < seconds
  -> wtever it is doing it should be the best possible implementation

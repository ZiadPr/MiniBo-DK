This folder contains the deployable project files for Vercel + PostgreSQL.
Excluded on purpose:
- .next/
- node_modules/
- data/
- *.log / *.err.log / *.out.log
- *.cookies.txt
- local smoke outputs
- local .env files
- internal prompt markdown files

Set production secrets in Vercel Dashboard instead of copying env files.

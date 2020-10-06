# tqdd

# About
TQDD is a web scraping application that returns information about a website upon entering it into the search bar, intended to be used as a tool when conducting due dilligence on companies. Amongst information that is possible to be returned are:

1. Basic company info (Name, Logo, Employee count, Address(es), Phone number(s), Alexa rank etc
2. News mentions
3. Job openings
4. Word cloud of the company website
5. Customer testimonials

Note that this tool is not perfect. It may not work on some websites and some info may not be returned if it cannot be found.

# Installation
1. Download Meteor with `curl https://install.meteor.com/ | sh` for macOS, `choco install meteor` for Windows
2. `git clone https://github.com/Luke-Tan/tqdd.git`
3. Run `meteor npm install` inside the project directory
4. Run `meteor --settings settings.json` to start the project 

const fs = require('fs');
const { format } = require('date-fns');

const currentDate = format(new Date(), 'E, dd-MM-yyyy');
fs.writeFileSync('date.txt', currentDate);

// Convert text to PNG image
const { execSync } = require('child_process');
execSync('convert -size 200x50 xc:white -font "Arial" -pointsize 24 -fill black -gravity center -annotate +0+0 "@date.txt" date.png');
